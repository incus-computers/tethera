import { expect, it } from 'vitest';
import { BaseRepository } from '@/lib/db/repositories/base.repository';
import type { ProductVariantRow } from '@/lib/db/types';

it('initialises canonical variants before checkout or a worker imports its repository', async () => {
  const workerRepository = new BaseRepository<ProductVariantRow>('product_variants');
  const variant = await workerRepository.findById('ram-1-white-32');
  expect(variant?.product_id).toBe('ram-1');
  expect(variant?.price).toBe(2349000);
  expect(variant?.stock_quantity).toBe(8);
  await workerRepository.update(variant!.id, { reserved_quantity: 1 });
  const checkoutRepository = new BaseRepository<ProductVariantRow>('product_variants');
  expect((await checkoutRepository.findById(variant!.id))!.reserved_quantity).toBe(1);
  await workerRepository.update(variant!.id, { reserved_quantity: 0 });
});
