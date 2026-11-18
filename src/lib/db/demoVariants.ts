import { MOCK_COMPONENTS } from '@/lib/data/mockHardware';
import type { ProductVariantRow } from './types';

/** Every demo repository sees the same initial variants, regardless of load order. */
export function demoVariantRows(): ProductVariantRow[] {
  return MOCK_COMPONENTS.flatMap(product => (product.variations || []).map(variant => ({
    id: variant.id, product_id: product.id, sku: variant.sku || variant.id,
    name: variant.name, attribute_type: 'configuration', attribute_value: variant.name,
    price: variant.price, sale_price: variant.salePrice ?? null,
    stock_quantity: variant.stockCount, reserved_quantity: 0, weight_grams: 1500,
    is_active: variant.isActive !== false,
  })));
}
