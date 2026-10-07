import type { AdminOrderStatus } from "@/lib/adminTypes";

/**
 * Canonical fulfillment lifecycle — INDEPENDENT of payment status.
 *
 * Stock is deducted at "Confirmed", never at "Placed" and never by a payment
 * decision.
 */
export const ORDER_LIFECYCLE: AdminOrderStatus[] = [
  "Placed",
  "Confirmed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
];

/**
 * The pre-split model stored payment progress in `order_status`. These legacy
 * values are mapped onto the canonical lifecycle so old rows render correctly
 * instead of showing an empty progress bar.
 */
const LEGACY_TO_CANONICAL: Record<string, AdminOrderStatus> = {
  "Payment Pending": "Placed",
  "Payment Verified": "Confirmed",
  Packed: "Confirmed",
  "Payment Rejected": "Placed",
};

export function normalizeOrderStatus(status: AdminOrderStatus | string): AdminOrderStatus {
  return (LEGACY_TO_CANONICAL[status] ?? status) as AdminOrderStatus;
}

/** 0-based position in the canonical lifecycle, or -1 for cancelled/other. */
export function orderLifecycleIndex(status: AdminOrderStatus | string): number {
  return ORDER_LIFECYCLE.indexOf(normalizeOrderStatus(status));
}

/** True when the order is awaiting admin acceptance (the "new order" signal). */
export function isAwaitingConfirmation(status: AdminOrderStatus | string): boolean {
  return normalizeOrderStatus(status) === "Placed";
}
