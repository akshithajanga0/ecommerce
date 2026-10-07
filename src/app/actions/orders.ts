"use server";

import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { requiresOnlinePaymentVerification } from "@/lib/paymentMethods";
import type {
  CancelOrderResult,
  PlaceOrderInput,
  PlaceOrderResult,
} from "@/lib/orderTypes";

/**
 * Customer order server actions.
 *
 * These are NOT admin operations. They authenticate the caller from the SSR
 * cookie session and delegate to the `create_order` / `cancel_order` Postgres
 * functions, which independently load authoritative prices/stock, derive
 * ownership from `auth.uid()`, compute totals and set status themselves.
 *
 * The browser only supplies product ids, quantities, an address and a payment
 * method label — never a price, total, user id, stock, status or actor.
 */

/** Map internal function messages to safe, non-revealing customer messages. */
function safeOrderError(message: string): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("insufficient_stock")) return "Some items in your cart are out of stock.";
  if (m.includes("product_not_found") || m.includes("product_unavailable"))
    return "One of the items is no longer available.";
  if (m.includes("invalid_variant")) return "The selected size or colour is no longer available.";
  if (m.includes("invalid_address")) return "Please provide a complete delivery address.";
  if (m.includes("empty_cart") || m.includes("invalid_item"))
    return "Your cart is invalid. Please review it and try again.";
  if (m.includes("unauthenticated")) return "You must be logged in.";
  return "Unable to place order. Please try again.";
}

export async function placeOrderSecure(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in." };
    }

    if (!input?.items?.length) {
      return { success: false, error: "Your cart is empty." };
    }

    const items = input.items
      .filter((i) => i && i.productId && Number(i.qty) > 0)
      .map((i) => ({
        product_id: i.productId,
        quantity: Math.floor(Number(i.qty)),
        color: i.color ?? null,
        size: i.size ?? null,
      }));

    if (items.length === 0) {
      return { success: false, error: "Your cart is invalid. Please review it and try again." };
    }

    const { data, error } = await supabase.rpc("create_order", {
      p_items: items,
      p_shipping: input.shipping,
      p_payment_method: input.paymentMethod,
      p_coupon: input.coupon && input.coupon.trim() ? input.coupon.trim() : null,
    });

    if (error) {
      // Technical detail stays on the server.
      console.error("create_order failed:", error.message);
      return { success: false, error: safeOrderError(error.message) };
    }

    if (!data) {
      return { success: false, error: "Unable to place order. Please try again." };
    }

    return { success: true, orderId: data as string };
  } catch (err) {
    console.error("placeOrderSecure error:", err);
    return { success: false, error: "Unable to place order. Please try again." };
  }
}

/**
 * Submit a UPI/UTR reference for the caller's own order (manual verification).
 *
 * Delegates to the `submit_order_payment` Postgres function, which derives
 * ownership from the session and creates/refreshes the corresponding `payments`
 * row in `pending_verification`. It never marks a payment as paid — only the
 * admin verification path does that.
 */
export async function submitOrderPaymentUtr(
  orderId: string,
  utr: string,
  screenshotUrl?: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    if (!orderId) return { success: false, error: "Order not found." };
    const cleanUtr = (utr ?? "").trim();
    if (!cleanUtr) return { success: false, error: "Enter the UPI/UTR reference number." };

    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in." };
    }

    // Resolve the order through the caller's OWN RLS-scoped session before
    // touching the RPC. This enforces ownership at the app layer as well, and
    // turns a missing/foreign order into a precise, honest error instead of a
    // confusing downstream failure.
    const { data: order } = await supabase
      .from("orders")
      .select("id, payment_status, payment_method")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) {
      return { success: false, error: "Order not found." };
    }
    if (!requiresOnlinePaymentVerification(order.payment_method)) {
      return { success: false, error: "This order does not require an online payment reference." };
    }
    if (order.payment_status === "Verified" || order.payment_status === "Paid") {
      return { success: false, error: "This payment has already been verified." };
    }

    const { data, error } = await supabase.rpc("submit_order_payment", {
      p_order_id: orderId,
      p_utr: cleanUtr,
      p_screenshot_url: screenshotUrl && screenshotUrl.trim() ? screenshotUrl.trim() : null,
    });

    if (error) {
      console.error("submit_order_payment failed:", error.message);
      const m = (error.message ?? "").toLowerCase();
      if (m.includes("invalid_utr")) return { success: false, error: "Enter the UPI/UTR reference number." };
      if (m.includes("duplicate_utr"))
        return { success: false, error: "This reference is already linked to another order." };
      if (m.includes("not_required"))
        return { success: false, error: "This order does not require an online payment reference." };
      if (m.includes("not_owner") || m.includes("order_not_found"))
        return { success: false, error: "Order not found." };
      // The submit_order_payment function has not been deployed to this project
      // yet (migration pending) — say so instead of masking it.
      if (
        m.includes("could not find the function") ||
        m.includes("schema cache") ||
        m.includes("pgrst202")
      ) {
        console.error("submit_order_payment RPC is missing — apply the order-fulfillment migration.");
        return {
          success: false,
          error: "Payment verification is not available yet. Please try again later.",
        };
      }
      return { success: false, error: "Unable to submit payment reference. Please try again." };
    }

    const result = (data ?? {}) as { success?: boolean; error?: string; duplicate?: boolean };
    if (result.success === false) {
      if (result.error === "already_verified")
        return { success: false, error: "This payment has already been verified." };
      return { success: false, error: "Unable to submit payment reference. Please try again." };
    }

    return { success: true };
  } catch (err) {
    console.error("submitOrderPaymentUtr error:", err);
    return { success: false, error: "Unable to submit payment reference. Please try again." };
  }
}

export async function cancelOrderSecure(orderId: string): Promise<CancelOrderResult> {
  try {
    if (!orderId) {
      return { success: false, error: "Order not found." };
    }

    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in." };
    }

    const { error } = await supabase.rpc("cancel_order", { p_order_id: orderId });

    if (error) {
      const m = (error.message ?? "").toLowerCase();
      if (m.includes("not_cancellable"))
        return { success: false, error: "This order can no longer be cancelled." };
      if (m.includes("not_owner") || m.includes("order_not_found"))
        return { success: false, error: "Order not found." };
      if (m.includes("unauthenticated"))
        return { success: false, error: "You must be logged in." };
      console.error("cancel_order failed:", error.message);
      return { success: false, error: "Unable to cancel order. Please try again." };
    }

    return { success: true };
  } catch (err) {
    console.error("cancelOrderSecure error:", err);
    return { success: false, error: "Unable to cancel order. Please try again." };
  }
}
