import { supabase } from './client';
import type { CartItem } from '@/lib/types';

/**
 * Get user's cart
 */
export async function getCart(userId: string): Promise<CartItem[]> {
  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select('id, user_id, product_id, quantity, color, size')
      .eq('user_id', userId);

    if (error) throw error;

    return data.map(transformCartItem);
  } catch (error) {
    return [];
  }
}

/**
 * Add item to cart
 */
export async function addToCart(
  userId: string,
  item: Omit<CartItem, 'key'>
): Promise<CartItem | null> {
  try {
    const { data, error } = await supabase
      .from('cart_items')
      .upsert({
        user_id: userId,
        product_id: item.productId,
        quantity: item.qty,
        color: item.color,
        size: item.size,
      })
      .select('id, user_id, product_id, quantity, color, size')
      .single();

    if (error) throw error;

    return transformCartItem(data);
  } catch (error) {
    return null;
  }
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
  userId: string,
  productId: string,
  quantity: number,
  color?: string,
  size?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('color', color ?? null)
      .eq('size', size ?? null);

    if (error) throw error;

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(
  userId: string,
  productId: string,
  color?: string,
  size?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('color', color ?? null)
      .eq('size', size ?? null);

    if (error) throw error;

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Clear cart
 */
export async function clearCart(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Transform database cart item to app cart item format
 */
function transformCartItem(data: any): CartItem {
  return {
    key: data.id,
    productId: data.product_id,
    qty: data.quantity,
    color: data.color ?? undefined,
    size: data.size ?? undefined,
  };
}
