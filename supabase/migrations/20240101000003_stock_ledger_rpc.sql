-- ============================================================================
-- ATOMIC STOCK ADJUSTMENT WITH LEDGER ENTRY
-- ============================================================================
--
-- This function atomically adjusts stock (product or variant level) and
-- records the change in the stock_ledger table. This prevents inconsistencies
-- where stock is updated but the ledger entry fails.
--
-- SECURITY DEFINER allows the function to bypass RLS for stock_ledger writes.
-- The function performs its own authorization check to ensure only admins
-- can call it, even if someone bypasses the server action wrapper.

CREATE OR REPLACE FUNCTION public.adjust_stock_with_ledger(
  p_product_id text,
  p_variant_sku text,
  p_change integer,
  p_change_type text,
  p_reason text,
  p_staff_name text,
  p_reference_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_user_id uuid := auth.uid();
  v_user_role text;
  v_product_name text;
  v_variant_sku text;
  v_variant_label text;
  v_current_stock integer;
  v_new_stock integer;
  v_previous_stock integer;
  v_ledger_id text;
BEGIN
  -- CRITICAL: Authorization check - only admins can call this function
  -- This prevents authenticated customers from bypassing the server action
  -- and directly calling the RPC to modify inventory.
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = v_user_id;

  IF v_user_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Validate change type
  IF p_change_type NOT IN (
    'restock', 'manual_adjust', 'order_sale', 'order_cancelled',
    'return_restored', 'damage_writeoff', 'initial_stock'
  ) THEN
    RAISE EXCEPTION 'invalid_change_type';
  END IF;

  -- Get product name
  SELECT name INTO v_product_name
  FROM products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;

  -- If no variant SKU, adjust product-level stock
  IF p_variant_sku IS NULL OR p_variant_sku = '' THEN
    SELECT stock INTO v_current_stock
    FROM products
    WHERE id = p_product_id;

    IF v_current_stock IS NULL THEN
      v_current_stock := 0;
    END IF;

    v_previous_stock := v_current_stock;
    v_new_stock := GREATEST(0, v_current_stock + p_change);
    v_variant_sku := NULL;
    v_variant_label := 'Product Level';

    -- Update product stock
    UPDATE products
    SET stock = v_new_stock, updated_at = v_now
    WHERE id = p_product_id;
  ELSE
    -- Adjust variant-level stock
    SELECT stock INTO v_current_stock
    FROM product_variants
    WHERE sku = p_variant_sku AND product_id = p_product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'variant_not_found';
    END IF;

    IF v_current_stock IS NULL THEN
      v_current_stock := 0;
    END IF;

    v_previous_stock := v_current_stock;
    v_new_stock := GREATEST(0, v_current_stock + p_change);
    v_variant_sku := p_variant_sku;

    -- Get variant label
    SELECT size || ' / ' || color INTO v_variant_label
    FROM product_variants
    WHERE sku = p_variant_sku;

    -- Update variant stock
    UPDATE product_variants
    SET stock = v_new_stock, updated_at = v_now
    WHERE sku = p_variant_sku;

    -- Recompute product-level aggregated stock
    UPDATE products
    SET stock = (
      SELECT COALESCE(SUM(stock), 0)
      FROM product_variants
      WHERE product_id = p_product_id
    ),
    updated_at = v_now
    WHERE id = p_product_id;
  END IF;

  -- Create ledger entry
  v_ledger_id := 'LEDGER-' || to_char(v_now, 'YYYYMMDD-HH24MISS') || '-' ||
                  upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO stock_ledger (
    id,
    timestamp,
    product_id,
    product_name,
    variant_sku,
    variant_label,
    type,
    change,
    previous_stock,
    new_stock,
    reason,
    staff_name,
    reference_id
  ) VALUES (
    v_ledger_id,
    v_now,
    p_product_id,
    v_product_name,
    v_variant_sku,
    v_variant_label,
    p_change_type,
    p_change,
    v_previous_stock,
    v_new_stock,
    p_reason,
    p_staff_name,
    p_reference_id
  );

  -- Return updated stock info
  RETURN jsonb_build_object(
    'success', true,
    'previous_stock', v_previous_stock,
    'new_stock', v_new_stock,
    'ledger_id', v_ledger_id
  );
END;
$$;

-- Grant execute to authenticated role (server actions use authenticated role)
GRANT EXECUTE ON FUNCTION public.adjust_stock_with_ledger TO authenticated;
