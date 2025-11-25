import type { Product } from './index';

export type CartItem = {
  product: Product;
  quantity: number;
  addedAt: Date;
};

