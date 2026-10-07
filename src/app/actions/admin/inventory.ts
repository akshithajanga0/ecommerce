"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_MESSAGES, type AdminActionResult } from "@/lib/adminActionResult";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { adminSupabase } from "@/lib/supabase/admin";
import { transformProduct } from "@/lib/supabase/productMapper";
import type { Product } from "@/lib/types";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

/**
 * Server actions for inventory / stock (admin only).
 *
 * Stock adjustments now use the atomic `adjust_stock_with_ledger` RPC function
 * which updates stock and creates a ledger entry in a single transaction.
 */

/** Invalidate the storefront + inventory surfaces that render stock levels. */
function revalidateStockViews() {
  revalidatePath("/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
}

export async function adminAdjustStock(
  productId: string,
  variantSku: string,
  change: number,
  staffName: string = "Admin"
): Promise<AdminActionResult<Product | null>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.failure;

  try {
    // Use the atomic RPC function for stock + ledger update
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.rpc("adjust_stock_with_ledger", {
      p_product_id: productId,
      p_variant_sku: variantSku || null,
      p_change: change,
      p_change_type: change >= 0 ? "manual_adjust" : "manual_adjust",
      p_reason: change >= 0 ? "Manual stock increase" : "Manual stock decrease",
      p_staff_name: staffName,
      p_reference_id: null,
    });

    if (error) throw error;

    revalidateStockViews();
    // Return the authoritative mapped product so the client applies it
    // directly instead of issuing a follow-up fetch.
    const { data: full } = await adminSupabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('id', productId)
      .single();
    return { success: true, data: full ? transformProduct(full) : null };
  } catch (error) {
    console.error('Error adjusting stock:', error);
    return { success: false, status: 500, error: ADMIN_MESSAGES.failed };
  }
}

export async function adminBulkUpdateStock(
  rows: { sku: string; stock: number }[],
  staffName: string = "Admin"
): Promise<AdminActionResult<{ updated: number; errors: string[]; products: Product[] }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.failure;

  let updated = 0;
  const errors: string[] = [];
  const affectedProductIds = new Set<string>();
  const supabase = await createServerSupabase();

  for (const row of rows) {
    try {
      // Resolve the owning product so its aggregated stock can be recomputed.
      const { data: variant } = await adminSupabase
        .from('product_variants')
        .select('id, product_id, stock')
        .eq('sku', row.sku)
        .single();

      if (!variant) {
        errors.push(`SKU not found: ${row.sku}`);
        continue;
      }

      const change = row.stock - variant.stock;
      const productId = variant.product_id;

      // Use the atomic RPC function for stock + ledger update
      const { error } = await supabase.rpc("adjust_stock_with_ledger", {
        p_product_id: productId,
        p_variant_sku: row.sku,
        p_change: change,
        p_change_type: change >= 0 ? "manual_adjust" : "manual_adjust",
        p_reason: "Bulk stock update via CSV",
        p_staff_name: staffName,
        p_reference_id: null,
      });

      if (error) {
        errors.push(`Failed to update ${row.sku}: ${error.message}`);
      } else {
        updated++;
        affectedProductIds.add(productId);
      }
    } catch {
      errors.push(`Failed to update ${row.sku}`);
    }
  }

  // Collect the authoritative mapped product for each affected row so the
  // client updates only those products — one query per affected product, not a
  // full-catalog refetch.
  const updatedProducts: Product[] = [];
  for (const productId of affectedProductIds) {
    const { data: full } = await adminSupabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('id', productId)
      .single();
    if (full) updatedProducts.push(transformProduct(full));
  }

  revalidateStockViews();
  return { success: true, data: { updated, errors, products: updatedProducts } };
}
