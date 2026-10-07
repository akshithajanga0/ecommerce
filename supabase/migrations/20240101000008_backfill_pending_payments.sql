-- ============================================================================
-- BACKFILL PENDING PAYMENTS FOR EXISTING ORDERS
-- ============================================================================
--
-- Orders created BEFORE 20240101000007_order_fulfillment.sql have no
-- `payments` row (the trigger only fires on new inserts). This one-time,
-- IDEMPOTENT backfill gives every eligible historical order the payment row it
-- would have received at creation, WITHOUT inventing data:
--
--   * only orders that require online verification (COD/blank excluded),
--   * only orders that are not Cancelled,
--   * only orders that do not already have a payment row,
--   * amount copied from the real order total (never invented),
--   * UTR copied from the order if one was recorded (never invented; left NULL
--     otherwise),
--   * already Verified/Paid orders become 'verified' and stay verified/paid,
--   * Rejected/Failed orders become 'rejected',
--   * an order with an existing UTR becomes 'pending_verification',
--   * every other eligible order becomes 'awaiting_reference'.
--
-- Safe to run more than once: the NOT EXISTS guard plus ON CONFLICT (id)
-- DO NOTHING means a second run is a no-op.
INSERT INTO payments (
  id, order_id, customer_name, customer_phone, amount, utr_number,
  payment_method, submitted_at, status
)
SELECT
  -- Full order id (unique) keeps the backfilled id collision-free; the prefix
  -- distinguishes it from trigger-created 'PAY-…' rows.
  'PAY-BF-' || o.id,
  o.id,
  o.customer_name,
  o.customer_phone,
  o.total,
  NULLIF(btrim(coalesce(o.utr_number, '')), ''),
  public.payment_method_key(o.payment_method),
  coalesce(o.placed_at, now()),
  CASE
    WHEN o.payment_status IN ('Verified', 'Paid')                    THEN 'verified'
    WHEN o.payment_status IN ('Failed', 'Payment Rejected', 'Rejected') THEN 'rejected'
    WHEN NULLIF(btrim(coalesce(o.utr_number, '')), '') IS NOT NULL   THEN 'pending_verification'
    ELSE 'awaiting_reference'
  END
FROM orders o
WHERE public.order_requires_online_payment(o.payment_method)
  AND coalesce(o.order_status, '') <> 'Cancelled'
  AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id)
ON CONFLICT (id) DO NOTHING;

-- Fill in a MISSING orders.payment_status from the backfilled row so the
-- customer/admin surfaces agree. Only orders whose payment_status is NULL/blank
-- are touched — an existing value is never overwritten and an unpaid order is
-- never promoted to Verified.
UPDATE orders o
   SET payment_status = CASE p.status
         WHEN 'verified'            THEN 'Verified'
         WHEN 'rejected'            THEN 'Failed'
         WHEN 'pending_verification' THEN 'Pending Verification'
         ELSE 'Pending'
       END,
       updated_at = now()
  FROM payments p
 WHERE p.order_id = o.id
   AND (o.payment_status IS NULL OR btrim(o.payment_status) = '');
