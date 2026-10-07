-- ============================================================================
-- ORDER FULFILLMENT  (confirmation / payment submission / cancellation)
-- ============================================================================
--
-- The order lifecycle is intentionally split into two INDEPENDENT axes:
--
--   order_status   : Placed -> Confirmed -> Shipped -> Out for Delivery -> Delivered
--                    (+ Cancelled / Returned)
--   payment_status : Pending / Pending Verification -> Verified | Failed
--
-- Stock is NOT deducted when an order is placed (see create_order). It is
-- deducted exactly once, atomically, when an admin ACCEPTS/CONFIRMS the order
-- through `confirm_order`. Confirming does NOT mark an order paid, and a
-- payment decision never rewrites the fulfillment status.
--
-- Every SECURITY DEFINER function here verifies authorization itself, so it is
-- safe to expose to the `authenticated` role: a customer cannot confirm an
-- order, and a customer can only submit payment for an order they own.
-- (This file defines several functions: the two payment-method helpers, the
-- order-created trigger, confirm_order, submit_order_payment and cancel_order.)

-- ----------------------------------------------------------------------------
-- PAYMENT-METHOD RULE  (single definition; the TS mirror lives in
-- src/lib/paymentMethods.ts and must stay identical)
-- ----------------------------------------------------------------------------
-- NONE of this hardcodes a specific online method. COD is the only method that
-- needs no online verification; every other method is keyed and its row records
-- that actual key (upi / card / netbanking / <label>).
CREATE OR REPLACE FUNCTION public.payment_method_key(p_method text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  m text := lower(btrim(coalesce(p_method, '')));
BEGIN
  IF m = '' THEN RETURN 'unknown'; END IF;
  IF m IN ('cod', 'cash_on_delivery') OR m LIKE '%cash on delivery%' THEN RETURN 'cod'; END IF;
  IF m LIKE '%upi%' THEN RETURN 'upi'; END IF;
  IF m LIKE '%card%' THEN RETURN 'card'; END IF;
  IF m LIKE '%netbanking%' OR (m LIKE '%net%' AND m LIKE '%bank%') THEN RETURN 'netbanking'; END IF;
  RETURN m;
END;
$$;

CREATE OR REPLACE FUNCTION public.order_requires_online_payment(p_method text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.payment_method_key(p_method) NOT IN ('cod', 'unknown');
$$;

-- ----------------------------------------------------------------------------
-- confirm_order  (admin only; atomic; idempotent)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_order(
  p_order_id text,
  p_staff_name text DEFAULT 'Admin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_role       text;
  v_order      record;
  v_item       record;
  v_variant    record;
  v_now        timestamptz := now();
  v_product_name text;
  v_prev       integer;
  v_new        integer;
  v_ledger_id  text;
  v_ledger     jsonb := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_uid;
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  -- Idempotency: an already-progressed order is never confirmed/deducted twice.
  IF v_order.order_status IN ('Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered') THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_confirmed', true,
      'order_status', v_order.order_status
    );
  END IF;

  -- Legacy "Payment Pending"/"Payment Verified" order statuses are treated as
  -- pre-confirmation states so existing rows still flow through the new model.
  IF v_order.order_status NOT IN ('Placed', 'Payment Pending', 'Payment Verified') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_state',
      'order_status', v_order.order_status
    );
  END IF;

  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id ORDER BY created_at, id
  LOOP
    SELECT name INTO v_product_name FROM products WHERE id = v_item.product_id;
    v_product_name := COALESCE(v_product_name, v_item.name);

    -- Prefer the exact variant (order_items.sku == product_variants.sku).
    SELECT * INTO v_variant
    FROM product_variants
    WHERE product_id = v_item.product_id AND sku = v_item.sku
    LIMIT 1;

    IF FOUND THEN
      v_prev := COALESCE(v_variant.stock, 0);
      IF v_prev < v_item.quantity THEN
        RAISE EXCEPTION 'insufficient_stock:%', v_product_name;
      END IF;
      v_new := v_prev - v_item.quantity;

      UPDATE product_variants
         SET stock = v_new, updated_at = v_now
       WHERE id = v_variant.id;

      UPDATE products
         SET stock = (
               SELECT COALESCE(SUM(stock), 0)
               FROM product_variants
               WHERE product_id = v_item.product_id
             ),
             updated_at = v_now
       WHERE id = v_item.product_id;

      v_ledger_id := 'LEDGER-' || to_char(v_now, 'YYYYMMDD-HH24MISS') || '-'
        || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

      INSERT INTO stock_ledger (
        id, timestamp, product_id, product_name, variant_sku, variant_label,
        type, change, previous_stock, new_stock, reason, staff_name, reference_id
      ) VALUES (
        v_ledger_id, v_now, v_item.product_id, v_product_name, v_variant.sku,
        COALESCE(NULLIF(v_item.variant, ''), v_variant.size || ' / ' || v_variant.color),
        'order_sale', -v_item.quantity, v_prev, v_new,
        'Order ' || p_order_id || ' confirmed', p_staff_name, p_order_id
      );

      v_ledger := v_ledger || jsonb_build_object(
        'id', v_ledger_id, 'product_id', v_item.product_id, 'sku', v_variant.sku,
        'change', -v_item.quantity, 'previous_stock', v_prev, 'new_stock', v_new
      );
    ELSE
      -- A variant-less product carries its stock on the product row.
      IF EXISTS (SELECT 1 FROM product_variants WHERE product_id = v_item.product_id) THEN
        RAISE EXCEPTION 'variant_not_found:%', v_product_name;
      END IF;

      SELECT stock INTO v_prev FROM products WHERE id = v_item.product_id;
      v_prev := COALESCE(v_prev, 0);
      IF v_prev < v_item.quantity THEN
        RAISE EXCEPTION 'insufficient_stock:%', v_product_name;
      END IF;
      v_new := v_prev - v_item.quantity;

      UPDATE products
         SET stock = v_new, updated_at = v_now
       WHERE id = v_item.product_id;

      v_ledger_id := 'LEDGER-' || to_char(v_now, 'YYYYMMDD-HH24MISS') || '-'
        || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

      INSERT INTO stock_ledger (
        id, timestamp, product_id, product_name, variant_sku, variant_label,
        type, change, previous_stock, new_stock, reason, staff_name, reference_id
      ) VALUES (
        v_ledger_id, v_now, v_item.product_id, v_product_name, NULL,
        'Product Level', 'order_sale', -v_item.quantity, v_prev, v_new,
        'Order ' || p_order_id || ' confirmed', p_staff_name, p_order_id
      );

      v_ledger := v_ledger || jsonb_build_object(
        'id', v_ledger_id, 'product_id', v_item.product_id, 'sku', NULL,
        'change', -v_item.quantity, 'previous_stock', v_prev, 'new_stock', v_new
      );
    END IF;
  END LOOP;

  UPDATE orders
     SET order_status = 'Confirmed', updated_at = v_now
   WHERE id = p_order_id;

  INSERT INTO order_timeline (order_id, status, timestamp, note, staff_name)
  VALUES (p_order_id, 'Confirmed', v_now, 'Order accepted by admin; stock deducted', p_staff_name);

  RETURN jsonb_build_object(
    'success', true,
    'already_confirmed', false,
    'order_status', 'Confirmed',
    'ledger', v_ledger
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- submit_order_payment  (customer; manual online reference verification)
-- ----------------------------------------------------------------------------
-- Records the caller's own reference on their own order and moves the payment
-- row to `pending_verification`. It never marks the payment paid, and it
-- REJECTS a reference already used on a different order (duplicate UTR).
CREATE OR REPLACE FUNCTION public.submit_order_payment(
  p_order_id text,
  p_utr text,
  p_screenshot_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_order     record;
  v_pay_id    text;
  v_dup_order text;
  v_utr       text := trim(COALESCE(p_utr, ''));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF v_utr = '' THEN
    RAISE EXCEPTION 'invalid_utr';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  IF v_order.user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  IF v_order.payment_status IN ('Verified', 'Paid') THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_verified');
  END IF;

  -- Enforced in the DATABASE, not just the UI: a Cash-on-Delivery (or blank)
  -- order has nothing to verify and must never enter the online queue.
  IF NOT public.order_requires_online_payment(v_order.payment_method) THEN
    RAISE EXCEPTION 'not_required';
  END IF;

  -- A reference may not be reused on a different order. Reject outright rather
  -- than silently creating a second, colliding payment record.
  SELECT order_id INTO v_dup_order
  FROM payments
  WHERE upper(utr_number) = upper(v_utr) AND order_id <> p_order_id
  LIMIT 1;
  IF v_dup_order IS NOT NULL THEN
    RAISE EXCEPTION 'duplicate_utr';
  END IF;

  SELECT id INTO v_pay_id FROM payments WHERE order_id = p_order_id LIMIT 1;

  IF v_pay_id IS NULL THEN
    v_pay_id := 'PAY-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

    INSERT INTO payments (
      id, order_id, customer_name, customer_phone, amount, utr_number,
      payment_method, screenshot_url, submitted_at, status,
      is_duplicate_utr, duplicate_order_id
    ) VALUES (
      v_pay_id, p_order_id, v_order.customer_name, v_order.customer_phone,
      v_order.total, v_utr, public.payment_method_key(v_order.payment_method),
      p_screenshot_url, now(), 'pending_verification', false, NULL
    );
  ELSE
    UPDATE payments
       SET utr_number = v_utr,
           screenshot_url = COALESCE(p_screenshot_url, screenshot_url),
           amount = v_order.total,
           payment_method = public.payment_method_key(v_order.payment_method),
           status = 'pending_verification',
           submitted_at = now(),
           is_duplicate_utr = false,
           duplicate_order_id = NULL,
           verified_at = NULL,
           verified_by = NULL,
           rejection_reason = NULL
     WHERE id = v_pay_id;
  END IF;

  UPDATE orders
     SET utr_number = v_utr,
         payment_status = 'Pending Verification',
         updated_at = now()
   WHERE id = p_order_id;

  INSERT INTO order_timeline (order_id, status, timestamp, note)
  VALUES (p_order_id, 'Payment Submitted', now(), 'UTR ' || v_utr || ' submitted for verification');

  RETURN jsonb_build_object('success', true, 'payment_id', v_pay_id, 'duplicate', false);
END;
$$;

-- ----------------------------------------------------------------------------
-- cancel_order  (customer; restores stock if it had already been deducted)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_order     record;
  v_item      record;
  v_variant   record;
  v_now       timestamptz := now();
  v_prev      integer;
  v_new       integer;
  v_product_name text;
  v_restock   boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  -- Stock is ONLY ever deducted by `confirm_order`, which sets 'Confirmed'.
  -- Legacy statuses (Packed / Payment Verified) never deducted stock, so
  -- cancelling them must NOT restock — that would inflate inventory.
  IF v_order.order_status = 'Confirmed' THEN
    v_restock := true;
  ELSIF v_order.order_status NOT IN ('Placed', 'Payment Pending', 'Payment Verified', 'Packed') THEN
    RAISE EXCEPTION 'not_cancellable';
  END IF;

  IF v_restock THEN
    FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id ORDER BY created_at, id
    LOOP
      SELECT name INTO v_product_name FROM products WHERE id = v_item.product_id;
      v_product_name := COALESCE(v_product_name, v_item.name);

      SELECT * INTO v_variant
      FROM product_variants
      WHERE product_id = v_item.product_id AND sku = v_item.sku
      LIMIT 1;

      IF FOUND THEN
        v_prev := COALESCE(v_variant.stock, 0);
        v_new := v_prev + v_item.quantity;
        UPDATE product_variants SET stock = v_new, updated_at = v_now WHERE id = v_variant.id;
        UPDATE products
           SET stock = (SELECT COALESCE(SUM(stock), 0) FROM product_variants WHERE product_id = v_item.product_id),
               updated_at = v_now
         WHERE id = v_item.product_id;
      ELSE
        SELECT stock INTO v_prev FROM products WHERE id = v_item.product_id;
        v_prev := COALESCE(v_prev, 0);
        v_new := v_prev + v_item.quantity;
        UPDATE products SET stock = v_new, updated_at = v_now WHERE id = v_item.product_id;
      END IF;

      INSERT INTO stock_ledger (
        id, timestamp, product_id, product_name, variant_sku, variant_label,
        type, change, previous_stock, new_stock, reason, staff_name, reference_id
      ) VALUES (
        'LEDGER-' || to_char(v_now, 'YYYYMMDD-HH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
        v_now, v_item.product_id, v_product_name,
        CASE WHEN FOUND THEN v_variant.sku END,
        COALESCE(NULLIF(v_item.variant, ''), 'Product Level'),
        'order_cancelled', v_item.quantity, v_prev, v_new,
        'Order ' || p_order_id || ' cancelled — stock restored', 'System', p_order_id
      );
    END LOOP;
  END IF;

  -- A cancelled order must not linger in the payment reconciliation queue.
  DELETE FROM payments
   WHERE order_id = p_order_id
     AND status IN ('awaiting_reference', 'pending_verification');

  UPDATE orders SET order_status = 'Cancelled', updated_at = v_now WHERE id = p_order_id;

  INSERT INTO order_timeline (order_id, status, timestamp, note)
  VALUES (p_order_id, 'Cancelled', v_now, 'Order cancelled by customer');

  RETURN true;
END;
$$;

-- ----------------------------------------------------------------------------
-- PENDING PAYMENT ROW ON ORDER CREATION
-- ----------------------------------------------------------------------------
-- A placed, not-yet-paid order for an ONLINE payment method must be visible in
-- the payment reconciliation queue straight away; COD orders are never queued.
-- The row records the ACTUAL method key (never a hardcoded 'upi_qr') and starts
-- in `awaiting_reference`; the customer's later submission moves it to
-- `pending_verification`.
CREATE OR REPLACE FUNCTION public.handle_new_order_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.order_requires_online_payment(new.payment_method)
     AND NOT EXISTS (SELECT 1 FROM payments WHERE order_id = new.id) THEN
    INSERT INTO payments (
      id, order_id, customer_name, customer_phone, amount, utr_number,
      payment_method, submitted_at, status
    ) VALUES (
      'PAY-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-'
        || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
      new.id, new.customer_name, new.customer_phone, new.total, NULL,
      public.payment_method_key(new.payment_method), now(), 'awaiting_reference'
    );
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_order_created_payment ON public.orders;
CREATE TRIGGER on_order_created_payment
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_order_payment();

-- ----------------------------------------------------------------------------
-- Exposure: authenticated callers only. Each function authorizes internally.
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.confirm_order(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_order_payment(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_order(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.confirm_order(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_order_payment(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.payment_method_key(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.order_requires_online_payment(text) TO authenticated;
