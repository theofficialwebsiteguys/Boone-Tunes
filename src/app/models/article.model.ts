export interface Article {
  id: string;
  title: string;
  excerpt: string;
  tag: string;
  date: string;
  readTime: string;
  body: string;
  /** Placeholder stock photo — swap for real article art later. */
  imageUrl: string;
}
