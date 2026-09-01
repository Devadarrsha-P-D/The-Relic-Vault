export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export type Card = {
  id: number;
  tokenId: number;
  name: string;
  description: string;
  image: string;
  rarity: Rarity;
  price?: string;
  seller?: string;
  owner?: string;
  attack: number;
  defense: number;
  special: string;
  element: string;
};
