import { supabase } from './client';
import { transformProduct } from './productMapper';
import type { Product } from '@/lib/types';

/**
 * Lightweight product queries for product cards/grids.
 * 
 * These queries fetch ONLY the fields needed for product cards, significantly
 * reducing payload size compared to full product+variant queries.
 * 
 * Fields fetched for cards:
 * - id, slug, name, brand, price, mrp, rating, reviews
 * - images, colors, sizes, badges, stock, status
 * - category_id, gender
 * 
 * Fields NOT fetched (only needed for detail pages):
 * - description, specifications, cost_price
 * - product_variants (variant data is not shown on cards)
 */

/**
 * Get lightweight products for cards/grids - NO variants, minimal fields.
 * Use for: homepage, product listings, recommendations, search results.
 * 
 * NOTE: This fetches ALL live products. For very large catalogs (>500 products),
 * consider implementing server-side pagination or cursor-based loading.
 */
export async function getProductsForCards(): Promise<Product[] | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        slug,
        name,
        brand,
        price,
        mrp,
        rating,
        reviews,
        images,
        colors,
        sizes,
        badges,
        stock,
        status,
        category_id,
        gender,
        created_at,
        updated_at
      `)
      .eq('status', 'live')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform without variants (they're not fetched)
    return data.map((item: any) => transformProduct({ ...item, product_variants: [] }));
  } catch (error) {
    return null;
  }
}

/**
 * Get product by ID with full data including variants.
 * Used for: product detail pages, admin operations.
 * Re-exported from products.ts for convenience.
 */
export { getProductById } from './products';

/**
 * Get lightweight products by category for cards - NO variants.
 */
export async function getProductsByCategoryForCards(categoryId: string): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        slug,
        name,
        brand,
        price,
        mrp,
        rating,
        reviews,
        images,
        colors,
        sizes,
        badges,
        stock,
        status,
        category_id,
        gender,
        created_at,
        updated_at
      `)
      .eq('category_id', categoryId)
      .eq('status', 'live')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((item: any) => transformProduct({ ...item, product_variants: [] }));
  } catch (error) {
    return [];
  }
}

/**
 * Search products for cards - NO variants, minimal fields.
 */
export async function searchProductsForCards(query: string): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        slug,
        name,
        brand,
        price,
        mrp,
        rating,
        reviews,
        images,
        colors,
        sizes,
        badges,
        stock,
        status,
        category_id,
        gender,
        created_at,
        updated_at
      `)
      .eq('status', 'live')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((item: any) => transformProduct({ ...item, product_variants: [] }));
  } catch (error) {
    return [];
  }
}

/**
 * Get products by gender for cards - NO variants.
 */
export async function getProductsByGenderForCards(gender: string): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        slug,
        name,
        brand,
        price,
        mrp,
        rating,
        reviews,
        images,
        colors,
        sizes,
        badges,
        stock,
        status,
        category_id,
        gender,
        created_at,
        updated_at
      `)
      .eq('gender', gender)
      .eq('status', 'live')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((item: any) => transformProduct({ ...item, product_variants: [] }));
  } catch (error) {
    return [];
  }
}

/**
 * Get related products by category for cards - NO variants, limited results.
 * Used for product detail page related products section.
 */
export async function getRelatedProductsForCards(categoryId: string, excludeId: string, limit = 6): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        slug,
        name,
        brand,
        price,
        mrp,
        rating,
        reviews,
        images,
        colors,
        sizes,
        badges,
        stock,
        status,
        category_id,
        gender,
        created_at,
        updated_at
      `)
      .eq('category_id', categoryId)
      .eq('status', 'live')
      .neq('id', excludeId)
      .order('reviews', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map((item: any) => transformProduct({ ...item, product_variants: [] }));
  } catch (error) {
    return [];
  }
}
