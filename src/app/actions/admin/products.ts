"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_MESSAGES, type AdminActionResult } from "@/lib/adminActionResult";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { adminSupabase } from "@/lib/supabase/admin";
import { isAllowedSubcategory, slugifySubcategory } from "@/lib/catalogTaxonomy";
import { toStock } from "@/lib/utils";
import { transformProduct } from "@/lib/supabase/productMapper";
import type { Product } from "@/lib/types";

/**
 * Server actions for product CRUD (admin only).
 *
 * Each action verifies the caller on the server before touching the database
 * with the service-role client. The caller's role is never taken from the
 * request body.
 */

/**
 * Invalidate only the storefront surfaces that render product data, so a
 * change made in /admin is reflected on the customer website on the next
 * request. Deliberately scoped — we do NOT disable caching globally.
 */
function revalidateProductViews(slug?: string | null) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/products");
  if (slug) revalidatePath(`/product/${slug}`);
}

/**
 * Re-read a product WITH its variants and mapped to the app shape, so a
 * mutation can return the authoritative final state. The client applies this
 * directly to its catalog state instead of issuing another full-catalog query.
 */
async function readProductWithVariants(id: string): Promise<Product | null> {
  const { data } = await adminSupabase
    .from("products")
    .select("*, product_variants(*)")
    .eq("id", id)
    .single();
  return data ? transformProduct(data) : null;
}

/**
 * Validate that a product's category + subcategory actually exist / belong to
 * the selected audience, so a product can never be stored against a category
 * it will never be found under. Returns an error message, or null when valid.
 */
async function validateCatalogRef(product: Partial<Product>): Promise<string | null> {
  const categoryId = (product.categoryId ?? "").trim();
  if (!categoryId) return null;

  const { data: category, error } = await adminSupabase
    .from("categories")
    .select("id, subcategories")
    .eq("id", categoryId)
    .single();

  if (error || !category) {
    return `Unknown category '${categoryId}'.`;
  }

  const subCategory = (product.subCategory ?? "").trim();
  if (!subCategory) return null;

  const extras: string[] = Array.isArray(category.subcategories) ? category.subcategories : [];
  const allowed =
    isAllowedSubcategory(categoryId, product.gender ?? "", subCategory) ||
    extras.some((n) => slugifySubcategory(n) === slugifySubcategory(subCategory));

  if (!allowed) {
    return `Subcategory '${subCategory}' is not valid for '${categoryId}'${
      product.gender ? ` (${product.gender})` : ""
    }.`;
  }
  return null;
}

export async function adminCreateProduct(
  product: Partial<Product>
): Promise<AdminActionResult<unknown>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.failure;

  const invalidRef = await validateCatalogRef(product);
  if (invalidRef) return { success: false, status: 400, error: invalidRef };

  try {
    const now = new Date().toISOString();

    // `products.id` is a NOT NULL primary key with no database default, and the
    // admin form intentionally does not supply one for a new product — so mint
    // it here. Without this every create failed with 23502 (the original bug).
    const productId = (product.id ?? '').trim() || `prod_${crypto.randomUUID()}`;
    const baseSlug =
      (product.slug ?? '').trim() ||
      (product.name ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') ||
      productId;

    // `products.slug` is UNIQUE — guarantee a free one so two similarly named
    // products don't fail with a 23505.
    let slug = baseSlug;
    const { data: slugClash } = await adminSupabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (slugClash) slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

    // The products table enforces price >= 0 and mrp >= price.
    const price = Math.max(0, Number(product.price ?? 0));
    const mrp = Math.max(price, Number(product.mrp ?? 0));

    // Stock lives on the variants when a product is sold in size/colour
    // combinations, so the denormalised products.stock must be their total —
    // exactly what the admin inventory view aggregates
    // (totalStock = variants.reduce(stock)). Writing `product.stock` here
    // (which the admin form never sends) stored 0 and made every new product
    // read as "Out of Stock" on the storefront. Products without variants
    // still fall back to their entered product-level stock.
    const variantsInput = Array.isArray(product.variants) ? product.variants : [];
    const stock = variantsInput.length
      ? variantsInput.reduce((sum, v) => sum + toStock(v.stock), 0)
      : toStock(product.stock);

    const { data, error } = await adminSupabase
      .from('products')
      .insert({
        id: productId,
        slug,
        name: product.name,
        brand: product.brand,
        category_id: product.categoryId,
        sub_category: product.subCategory,
        gender: product.gender,
        description: product.description,
        price,
        mrp,
        cost_price: product.costPrice,
        rating: product.rating || 5,
        reviews: product.reviews || 0,
        images: product.images,
        colors: product.colors,
        sizes: product.sizes,
        badges: product.badges || [],
        specifications: Array.isArray(product.specifications) ? product.specifications : [],
        stock,
        status: product.status || 'live',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    // Insert variants if provided. Variant ids are generated server-side: the
    // admin form reuses placeholder ids ("v1", "v2"), which would collide on
    // the `product_variants` primary key for the second product created.
    if (product.variants && product.variants.length > 0) {
      const variants = product.variants.map((v, index) => ({
        id: crypto.randomUUID(),
        product_id: data.id,
        sku: (v.sku ?? '').trim() || `${slug}-${index + 1}`,
        size: v.size,
        color: v.color,
        stock: toStock(v.stock),
        reserved_stock: v.reservedStock ?? 0,
        price_override: v.priceOverride,
      }));

      const { error: variantError } = await adminSupabase
        .from('product_variants')
        .insert(variants);

      // Stock now derives from variants, so a product whose variants failed to
      // insert would read as "Out of Stock" forever. Roll the product back so a
      // half-created item is never left in the catalog.
      if (variantError) {
        await adminSupabase.from('products').delete().eq('id', data.id);
        throw variantError;
      }
    }

    revalidateProductViews(data?.slug);
    // Return the authoritative product WITH its variants so the admin UI can
    // apply it directly (no full-catalog refetch).
    const full = await readProductWithVariants(productId);
    // Return the MAPPED product (or null on a read failure) — never the raw
    // snake_case row, which would corrupt the client catalog if applied.
    return { success: true, data: full };
  } catch (error) {
    console.error('Error creating product:', error);
    return { success: false, status: 500, error: ADMIN_MESSAGES.failed };
  }
}

export async function adminUpdateProduct(
  id: string,
  product: Partial<Product>
): Promise<AdminActionResult<unknown>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.failure;

  const invalidRef = await validateCatalogRef(product);
  if (invalidRef) return { success: false, status: 400, error: invalidRef };

  try {
    const now = new Date().toISOString();

    // Mirror the create-path normalization so an edit can never violate the
    // `mrp >= price >= 0` / `rating 0..5` CHECK constraints.
    const rawPrice = Number(product.price);
    const rawMrp = Number(product.mrp);
    const price = Number.isFinite(rawPrice) ? Math.max(0, rawPrice) : undefined;
    const mrp = Number.isFinite(rawMrp) ? Math.max(rawMrp, price ?? 0) : undefined;
    const rating = Number.isFinite(Number(product.rating))
      ? Math.min(5, Math.max(0, Number(product.rating)))
      : undefined;

    // Mirror the create path so an edit can never desync availability from the
    // variant stock the admin actually edited. When variants are supplied the
    // product-level total is their sum; when omitted, the normalized
    // product-level value is written (or left untouched).
    // Treat an EMPTY variant array as "no variants" so the product-level stock
    // is used (not summed to 0) when the admin removes every variant.
    const variantsInput = Array.isArray(product.variants) ? product.variants : undefined;
    const stock =
      variantsInput && variantsInput.length > 0
        ? variantsInput.reduce((sum, v) => sum + toStock(v.stock), 0)
        : product.stock === undefined
          ? undefined
          : toStock(product.stock);

    const { data, error } = await adminSupabase
      .from('products')
      .update({
        name: product.name,
        brand: product.brand,
        category_id: product.categoryId,
        sub_category: product.subCategory,
        gender: product.gender,
        description: product.description,
        price,
        mrp,
        cost_price: product.costPrice,
        rating,
        reviews: product.reviews,
        images: product.images,
        colors: product.colors,
        sizes: product.sizes,
        badges: product.badges,
        specifications: product.specifications,
        stock,
        status: product.status,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update variants if provided
    if (product.variants) {
      // Snapshot the current variants first so a failed replacement can be
      // rolled back — otherwise a partial write would leave the product with no
      // variant rows (and, since stock derives from variants, out of stock).
      const { data: previousVariants } = await adminSupabase
        .from('product_variants')
        .select('*')
        .eq('product_id', id);

      // Delete existing variants
      await adminSupabase.from('product_variants').delete().eq('product_id', id);

      // Insert new variants (fresh ids: the previous rows were just deleted and
      // placeholder ids from the form must never be reused across products).
      const variants = product.variants.map((v, index) => ({
        id: crypto.randomUUID(),
        product_id: id,
        sku: (v.sku ?? '').trim() || `${id}-${index + 1}`,
        size: v.size,
        color: v.color,
        stock: toStock(v.stock),
        reserved_stock: v.reservedStock ?? 0,
        price_override: v.priceOverride,
      }));

      const { error: variantError } = await adminSupabase
        .from('product_variants')
        .insert(variants);

      // Surface a failed variant write and restore the previous rows instead of
      // leaving the product with no variants (which would read as out of stock).
      // NOTE: there is no multi-statement transaction here, so if the restore
      // insert also fails the variants are lost — but the product row is left
      // consistent either way (its aggregated stock is recomputed below).
      if (variantError) {
        if (previousVariants && previousVariants.length > 0) {
          await adminSupabase.from('product_variants').insert(previousVariants);
          // The product UPDATE above wrote `stock` as the sum of the NEW
          // variants. Restore the denormalised total to match the rows we just
          // put back, so the column can never disagree with its variants.
          const restoredStock = previousVariants.reduce(
            (sum: number, v: { stock: number }) => sum + toStock(v.stock),
            0
          );
          await adminSupabase
            .from('products')
            .update({ stock: restoredStock })
            .eq('id', id);
        } else if (product.stock !== undefined) {
          // Product had no variants before the edit; restore the product-level
          // stock the admin sent. When `product.stock` is undefined the main
          // UPDATE deliberately left the column untouched, so leave it alone
          // here too (never zero a valid value).
          await adminSupabase
            .from('products')
            .update({ stock: toStock(product.stock) })
            .eq('id', id);
        }
        throw variantError;
      }
    }

    revalidateProductViews(data?.slug ?? product.slug);
    // Return the authoritative final state (with variants) for a targeted
    // client update instead of a full-catalog refetch.
    const full = await readProductWithVariants(id);
    return { success: true, data: full };
  } catch (error) {
    console.error('Error updating product:', error);
    return { success: false, status: 500, error: ADMIN_MESSAGES.failed };
  }
}

export async function adminDeleteProduct(id: string): Promise<AdminActionResult<undefined>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.failure;

  try {
    // Capture the slug first so the deleted product's detail page is also
    // invalidated, not just the listing surfaces.
    const { data: existing } = await adminSupabase
      .from('products')
      .select('slug')
      .eq('id', id)
      .single();

    const { error } = await adminSupabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidateProductViews(existing?.slug);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, status: 500, error: ADMIN_MESSAGES.failed };
  }
}

export async function adminToggleProductStatus(id: string): Promise<AdminActionResult<unknown>> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.failure;

  try {
    // First get current status
    const { data: current } = await adminSupabase
      .from('products')
      .select('status')
      .eq('id', id)
      .single();

    if (!current) {
      return { success: false, status: 500, error: ADMIN_MESSAGES.failed };
    }

    const newStatus = current.status === 'live' ? 'draft' : 'live';
    const now = new Date().toISOString();

    const { data, error } = await adminSupabase
      .from('products')
      .update({ status: newStatus, updated_at: now })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidateProductViews(data?.slug);
    // Return the full product so the list can update the single row in place.
    const full = await readProductWithVariants(id);
    return { success: true, data: full };
  } catch (error) {
    console.error('Error toggling product status:', error);
    return { success: false, status: 500, error: ADMIN_MESSAGES.failed };
  }
}
