export interface Product {
  id: string;
  name: string;
  priceEUR: number;
  imageUrl: string;
  description?: string;
}

export const products: Product[] = [
  {
    id: '1',
    name: 'Midnight Onyx',
    priceEUR: 45,
    imageUrl: 'https://images.unsplash.com/photo-1519014816548-bf5fe059e98b?auto=format&fit=crop&q=80&w=800',
    description: 'Deep glossy black with silver accents.'
  },
  {
    id: '2',
    name: 'Crimson Velvet',
    priceEUR: 55,
    imageUrl: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=800',
    description: 'Matte blood red for a dramatic look.'
  },
  {
    id: '3',
    name: 'Pearl Essence',
    priceEUR: 40,
    imageUrl: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&q=80&w=800',
    description: 'Shimmering iridescent white.'
  },
  {
    id: '4',
    name: 'Golden Hour',
    priceEUR: 60,
    imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=800',
    description: 'Neutral base with gold foil details.'
  }
];
