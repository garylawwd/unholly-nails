export interface Product {
  id: string;
  docPath: string; 
  name: string;
  basePrice: number;
  priceOnAsk: boolean;
  imagePath: string;
  additionalImages: string[];
  description?: string;
  defaultShape?: string;
  defaultLength?: string;
  isPromo: boolean;
  category: string;
  tags: string[];
  syncId: string;
  isForSale?: boolean;
  type?: string;
  updatedAt?: number;
}

export interface CollectionMeta {
  tag: string;
  title: string;
  description: string;
  backgroundImageUrl: string;
  inRibbon?: boolean;
  headerColor?: string;
  descriptionColor?: string;
  ombreStart?: string;
  ombreEnd?: string;
  bgScale?: number;
  includedProductIds?: string[];
}
