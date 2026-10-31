import { createClient } from '@/lib/supabase/server';
import ListingsGrid from '@/components/listings/ListingsGrid';
import Link from 'next/link';

export const metadata = {
  title: 'Listings | GoodsMandi',
  description: 'Items for sale by UPES students',
};

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const supabase = await createClient();
  
  const { data: listings, error } = await supabase
    .from('listings')
    .select(`
      *,
      seller:profiles!seller_id(id, name, profile_photo_url, rating_avg)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching listings:', error.message, error.code, error.details, error.hint);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Listings</h1>
          <p className="text-sm text-slate-400">Items for sale by other UPES students.</p>
        </div>
        <Link href="/listings/create" className="btn-primary flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Sell an item
        </Link>
      </div>
      
      <ListingsGrid initialListings={listings || []} fetchError={error ? error.message : null} initialCategory={category} />
    </div>
  );
}
