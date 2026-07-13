export type ProductIcon =
  | 'speaker'
  | 'projector'
  | 'lights'
  | 'headphones'
  | 'mic'
  | 'keyboard'
  | 'shelf';

export interface Product {
  id: string;
  name: string;
  badge: string;
  description: string;
  perfectFor: string;
  amazonUrl: string;
  icon: ProductIcon;
  /** Placeholder stock photo — swap for a real product photo later. */
  imageUrl: string;
}
