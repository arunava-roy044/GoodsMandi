// Shared by the Browse page (server) and ListingsGrid (client)
import { CATEGORY_OTHER, LISTING_CATEGORIES } from '@/lib/constants';

// Listings per page loaded by search_listings
export const BROWSE_PAGE_SIZE = 24;

export const FILTER_CATEGORIES = [...LISTING_CATEGORIES, CATEGORY_OTHER] as string[];

export function isFilterCategory(value: string | undefined): value is string {
  return !!value && FILTER_CATEGORIES.includes(value);
}

export type BrowseListing = {
  id: string;
  title: string;
  description: string | null;
  asking_price: number;
  category: string;
  product_age: string;
  photos: string[];
  status: string;
  created_at: string;
  seller_id: string;
  seller: { id: string; name: string; profile_photo_url: string; rating_avg: number };
  // Same on every row: how many listings match in total
  total_count?: number;
};
