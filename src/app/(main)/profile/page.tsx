import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatPrice, timeAgo } from '@/lib/utils';
import ProfileHeader from '@/components/profile/ProfileHeader';

export const metadata = { title: 'Your profile | GoodsMandi' };

const PROFILE_COLUMNS =
  'id, name, year_of_study, branch_course, profile_photo_url, verified, rating_avg, total_items_sold, warning_count';

type OfferRow = {
  id: string;
  listing_id: string;
  bid_amount: number;
  status: 'pending' | 'selected' | 'backup' | 'rejected';
  created_at: string;
  listing: { title: string; status: string } | null;
};

const OFFER_BADGES: Record<OfferRow['status'], { label: string; className: string }> = {
  pending: { label: 'Waiting', className: 'badge-warning' },
  selected: { label: 'Accepted', className: 'badge-success' },
  backup: { label: 'Backup buyer', className: 'badge-info' },
  rejected: { label: 'Not accepted', className: 'badge-neutral' },
};

export default async function OwnProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/profile');
  }

  // Independent queries, so run them together
  const [profileRes, listingsRes, offersRes] = await Promise.all([
    supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', user.id).maybeSingle(),
    supabase
      .from('listings')
      .select('id, title, asking_price, created_at', { count: 'exact' })
      .eq('seller_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('bids')
      .select('id, listing_id, bid_amount, status, created_at, listing:listings(title, status)')
      .eq('bidder_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const profile = profileRes.data;
  if (!profile) {
    return (
      <div className="max-w-xl mx-auto glass-card px-6 py-12 text-center">
        <h1 className="text-lg font-medium text-white mb-2">We couldn&apos;t load your profile</h1>
        <p className="text-slate-400 mb-5">
          {profileRes.error ? 'Something went wrong on our side. Refresh to try again.' : 'Your profile hasn’t been set up yet. Add your details in Settings.'}
        </p>
        <Link href="/profile/settings" className="btn-primary">Open settings</Link>
      </div>
    );
  }

  const activeListings = listingsRes.data ?? [];
  const activeCount = listingsRes.count ?? activeListings.length;
  const offers = (offersRes.data as unknown as OfferRow[] | null) ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <ProfileHeader profile={profile} activeListingCount={activeCount} email={user.email} isOwn />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Listings */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-white">Your listings</h2>
            <Link href="/listings/my" className="text-sm text-brand-400 hover:text-brand-300">
              Manage all
            </Link>
          </div>

          {activeListings.length > 0 ? (
            <ul className="glass-card divide-y divide-slate-800 overflow-hidden">
              {activeListings.map((listing) => (
                <li key={listing.id}>
                  <Link href={`/listings/${listing.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-800/50">
                    <div className="min-w-0">
                      <div className="truncate text-slate-100">{listing.title}</div>
                      <div className="text-xs text-slate-500">Listed {timeAgo(listing.created_at)}</div>
                    </div>
                    <div className="shrink-0 font-medium text-brand-400">{formatPrice(listing.asking_price)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="glass-card px-4 py-8 text-center">
              <p className="text-slate-400 mb-4">Nothing for sale right now.</p>
              <Link href="/listings/create" className="btn-primary">Sell an item</Link>
            </div>
          )}
          {activeCount > activeListings.length && (
            <p className="text-xs text-slate-500">Showing your {activeListings.length} newest of {activeCount}.</p>
          )}
        </section>

        {/* Offers */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Your offers</h2>

          {offers.length > 0 ? (
            <ul className="glass-card divide-y divide-slate-800 overflow-hidden">
              {offers.map((offer) => {
                const badge = OFFER_BADGES[offer.status] ?? OFFER_BADGES.pending;
                const content = (
                  <>
                    <div className="min-w-0">
                      <div className="truncate text-slate-100">{offer.listing?.title ?? 'Listing no longer available'}</div>
                      <div className="text-xs text-slate-500">
                        You offered {formatPrice(offer.bid_amount)} · {timeAgo(offer.created_at)}
                      </div>
                    </div>
                    <span className={`${badge.className} shrink-0`}>{badge.label}</span>
                  </>
                );
                return (
                  <li key={offer.id}>
                    {offer.listing ? (
                      <Link href={`/listings/${offer.listing_id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-800/50">
                        {content}
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between gap-3 px-4 py-3">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="glass-card px-4 py-8 text-center">
              <p className="text-slate-400 mb-4">You haven&apos;t made any offers yet.</p>
              <Link href="/listings" className="btn-secondary">Browse listings</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
