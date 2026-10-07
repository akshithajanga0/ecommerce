import type { Product, ProductVariant } from '@/lib/types';
import { getProductTotalStock, toStock } from '@/lib/utils';

/**
 * Transform a `products` row (optionally with an embedded `product_variants`
 * array) into the app's `Product` shape.
 *
 * Shared by the browser read module (`products.ts`) and the server read module
 * (`products-server.ts`) so it does not pull in either Supabase client.
 */
export function transformProduct(data: any): Product {
  const variants: ProductVariant[] =
    data.product_variants?.map((v: any) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      stock: toStock(v.stock),
      reservedStock: v.reserved_stock ?? 0,
      priceOverride: v.price_override,
    })) ?? [];

  // Availability uses the single shared rule (variant total when the product is
  // sold in variants, else the product-level stock) so the admin panel and the
  // storefront can never disagree. Without this, a product whose stock lives on
  // its variants but whose denormalised `products.stock` was never set reads as
  // 0 and shows "Out of Stock" while the admin reports stock.
  const stock = getProductTotalStock({ stock: data.stock, variants });

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    brand: data.brand,
    description: data.description,
    categoryId: data.category_id,
    subCategory: data.sub_category,
    gender: data.gender,
    price: Number(data.price),
    mrp: Number(data.mrp),
    costPrice: data.cost_price ? Number(data.cost_price) : undefined,
    rating: Number(data.rating),
    reviews: data.reviews,
    images: data.images,
    colors: data.colors,
    sizes: data.sizes,
    badges: data.badges,
    specifications: data.specifications,
    variants,
    stock,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
