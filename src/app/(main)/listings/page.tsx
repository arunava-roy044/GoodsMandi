import { createClient } from '@/lib/supabase/server';
import ListingsGrid from '@/components/listings/ListingsGrid';
import { BROWSE_PAGE_SIZE, isFilterCategory, type BrowseListing } from '@/lib/browse';
import Link from 'next/link';

export const metadata = {
  title: 'Listings | GoodsMandi',
  description: 'Items for sale by UPES students',
};

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const supabase = await createClient();
  const startCategory = isFilterCategory(category) ? category : null;

  // First page and the category counts; the grid loads the rest as people search and scroll
  const [listingsResult, countsResult] = await Promise.all([
    supabase.rpc('search_listings', {
      p_query: q?.trim() ?? '',
      p_category: startCategory,
      p_sort: 'newest',
      p_limit: BROWSE_PAGE_SIZE,
      p_offset: 0,
    }),
    supabase.rpc('listing_category_counts'),
  ]);

  const error = listingsResult.error ?? countsResult.error;
  if (error) {
    console.error('Error fetching listings:', error.message, error.code, error.details, error.hint);
  }

  const listings = (listingsResult.data as BrowseListing[] | null) ?? [];
  const total = listings.length > 0 ? Number(listings[0].total_count ?? listings.length) : 0;
  const categoryCounts: Record<string, number> = {};
  for (const row of (countsResult.data as { category: string; listings: number }[] | null) ?? []) {
    categoryCounts[row.category] = Number(row.listings);
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Browse listings</h1>
          <p className="text-sm text-slate-400">Things other UPES students are selling.</p>
        </div>
        <Link href="/listings/create" className="btn-primary inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Sell an item
        </Link>
      </div>

      {/* key: start fresh when the URL filters change through a link (e.g. the Browse nav link) */}
      <ListingsGrid
        key={`${category ?? ''}|${q ?? ''}`}
        initialListings={listings}
        initialTotal={total}
        categoryCounts={categoryCounts}
        fetchError={error ? error.message : null}
        initialCategory={category}
        initialQuery={q}
      />
    </div>
  );
}
