import { toStock } from "@/lib/utils";

/**
 * ONE inventory model for the whole app.
 *
 * Both the admin dashboard (low-stock KPI + alert list) and the Inventory page
 * derive every row from this module, so they can never disagree. The previous
 * bug was that the dashboard counted variant-less products (product-level
 * stock) while the Inventory matrix only listed variants — so a low-stock
 * variant-less product showed "1" on the dashboard and nothing/0 in Inventory.
 *
 * A product sold in variants is expanded to one row per variant; a variant-less
 * product becomes a single product-level row (sku = "").
 */

export const LOW_STOCK_THRESHOLD = 5;

export interface InventorySourceProduct {
  id: string;
  name: string;
  brand?: string;
  categoryId?: string;
  stock: number;
  variants?: {
    sku: string;
    size?: string;
    color?: string;
    stock: number;
    reservedStock?: number;
  }[];
}

export interface InventoryRow {
  productId: string;
  productName: string;
  brand: string;
  categoryId: string;
  /** Empty string for a variant-less product (product-level stock). */
  sku: string;
  size: string;
  color: string;
  /** Physical stock. */
  stock: number;
  /** Soft-reserved units (0 when the product has no reservation concept). */
  reservedStock: number;
  /** Physical − reserved, never negative. */
  availableStock: number;
}

export function getInventoryRows(products: InventorySourceProduct[]): InventoryRow[] {
  const rows: InventoryRow[] = [];

  for (const p of products) {
    const variants = p.variants ?? [];

    if (variants.length > 0) {
      for (const v of variants) {
        const stock = toStock(v.stock);
        const reserved = toStock(v.reservedStock);
        rows.push({
          productId: p.id,
          productName: p.name,
          brand: p.brand ?? "",
          categoryId: p.categoryId ?? "",
          sku: v.sku,
          size: v.size ?? "",
          color: v.color ?? "",
          stock,
          reservedStock: reserved,
          availableStock: Math.max(0, stock - reserved),
        });
      }
    } else {
      const stock = toStock(p.stock);
      rows.push({
        productId: p.id,
        productName: p.name,
        brand: p.brand ?? "",
        categoryId: p.categoryId ?? "",
        sku: "",
        size: "—",
        color: "—",
        stock,
        reservedStock: 0,
        availableStock: stock,
      });
    }
  }

  return rows;
}

/** Every inventory row at or below the low-stock threshold. */
export function getLowStockRows(products: InventorySourceProduct[]): InventoryRow[] {
  return getInventoryRows(products).filter((r) => r.stock <= LOW_STOCK_THRESHOLD);
}

/** Count of low-stock rows — the single source for every low-stock badge/KPI. */
export function countLowStock(products: InventorySourceProduct[]): number {
  return getLowStockRows(products).length;
}
