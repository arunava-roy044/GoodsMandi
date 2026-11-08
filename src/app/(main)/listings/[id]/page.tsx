import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { CATEGORY_COLORS, CATEGORY_TAG } from '@/lib/constants';
import ListingDetailClient from './ListingDetailClient';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return { title: 'Listing | GoodsMandi' };
  const supabase = await createClient();
  const { data } = await supabase.from('listings').select('title').eq('id', id).maybeSingle();
  return { title: data?.title ? `${data.title} | GoodsMandi` : 'Listing | GoodsMandi' };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // A malformed id would otherwise surface as a database error
  if (!UUID_PATTERN.test(id)) notFound();

  const supabase = await createClient();

  // May be null if the session isn't available server-side; the client checks again
  const { data: userData } = await supabase.auth.getUser();
  const serverUserId = userData?.user?.id || null;

  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      *,
      seller:profiles!seller_id(id, name, profile_photo_url, rating_avg, total_items_sold),
      winner:profiles!selected_bidder_id(id, name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !listing) {
    notFound();
  }

  const categoryColor = CATEGORY_COLORS[listing.category as keyof typeof CATEGORY_COLORS] || CATEGORY_TAG;

  return <ListingDetailClient listing={listing} categoryColor={categoryColor} serverUserId={serverUserId} />;
}
