import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice, timeAgo } from '@/lib/utils';

export default async function MyListingsPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data: rawListings } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  // Sort: active first, then sold, then removed
  const statusOrder: Record<string, number> = { active: 0, sold: 1, removed: 2 };
  const listings = rawListings?.sort((a, b) => {
    const orderDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
    if (orderDiff !== 0) return orderDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }) ?? null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">My Listings</h1>
          <p className="text-slate-400 mt-1">Manage your active, sold, and removed items</p>
        </div>
        <Link href="/listings/create" className="btn-primary">
          List New Item
        </Link>
      </div>

      {!listings || listings.length === 0 ? (
        <div className="glass-card p-16 text-center rounded-2xl flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 text-brand-500">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
          </div>
          <h2 className="text-2xl font-semibold text-slate-200 mb-3">You haven&apos;t listed any items yet</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">Declutter your room and make some extra cash by selling textbooks, electronics, or dorm essentials.</p>
          <Link href="/listings/create" className="btn-primary px-8">
            Create First Listing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Link key={listing.id} href={`/listings/${listing.id}`} className={`block glass-card glass-card-hover rounded-2xl overflow-hidden group flex flex-col h-full transition-all ${listing.status === 'removed' ? 'opacity-50 grayscale' : ''}`}>
              <div className="relative h-48 bg-slate-800">
                {listing.photos && listing.photos.length > 0 ? (
                  <Image 
                    src={listing.photos[0]} 
                    alt={listing.title} 
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  {listing.status === 'active' && <span className="badge-success shadow-lg">Active</span>}
                  {listing.status === 'sold' && <span className="badge-warning shadow-lg text-amber-900 bg-amber-400">Sold</span>}
                  {listing.status === 'removed' && <span className="badge-danger shadow-lg">Removed</span>}
                </div>
              </div>
              
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-semibold text-lg text-slate-100 mb-2 line-clamp-1 group-hover:text-brand-400 transition-colors">{listing.title}</h3>
                
                <div className="flex justify-between items-end mb-4">
                  <div className="text-2xl font-bold text-white">{formatPrice(listing.asking_price)}</div>
                  <div className="text-sm text-slate-500">{timeAgo(listing.created_at)}</div>
                </div>
                
                <div className="mt-auto flex gap-2">
                  <span className="badge-neutral py-1 px-3 text-xs">{listing.category}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
