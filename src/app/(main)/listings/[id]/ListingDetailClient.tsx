'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, timeAgo } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import BidDashboard from '@/components/listings/BidDashboard';
import RatingModal from '@/components/ratings/RatingModal';
import ReportModal from '@/components/reports/ReportModal';
import BidModalController from './BidModalController';
import DeleteListingButton from './DeleteListingButton';

type ListingDetail = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  category: string;
  asking_price: number;
  product_age: string;
  photos: string[] | null;
  status: 'active' | 'sold' | 'removed';
  selected_bidder_id: string | null;
  created_at: string;
  seller: {
    id: string;
    name: string;
    profile_photo_url: string | null;
    rating_avg: number | string | null;
    total_items_sold: number | null;
  } | null;
  winner: { id: string; name: string } | null;
};

interface ListingDetailClientProps {
  listing: ListingDetail;
  categoryColor: string;
  serverUserId: string | null;
}

export default function ListingDetailClient({ listing, categoryColor, serverUserId }: ListingDetailClientProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(serverUserId);
  const [authChecked, setAuthChecked] = useState(!!serverUserId);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState<boolean | null>(null);

  // Client-side auth check as fallback when server-side auth returns null
  useEffect(() => {
    if (serverUserId) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserId(data.user.id);
      setAuthChecked(true);
    });
  }, [serverUserId]);

  const isSeller = authChecked && currentUserId === listing.seller_id;
  const isBuyer = !!currentUserId && currentUserId === listing.selected_bidder_id;
  const isSold = listing.status === 'sold';
  const isRemoved = listing.status === 'removed';
  const isActive = !isSold && !isRemoved;
  const photos = listing.photos ?? [];
  const mainPhoto = photos[photoIndex] ?? photos[0] ?? null;
  const sellerName = listing.seller?.name ?? 'Seller';
  const sellerRating = Number(listing.seller?.rating_avg ?? 0);

  // After a sale, the seller and the buyer can rate each other once
  const canRate = isSold && (isSeller || isBuyer);
  const ratedUserId = isSeller ? listing.selected_bidder_id : listing.seller_id;
  const ratedUserName = isSeller ? listing.winner?.name ?? 'the buyer' : sellerName;

  useEffect(() => {
    if (!canRate || !currentUserId) return;
    const supabase = createClient();
    supabase
      .from('ratings')
      .select('id', { head: true, count: 'exact' })
      .eq('listing_id', listing.id)
      .eq('rater_id', currentUserId)
      .then(({ count }) => setAlreadyRated((count ?? 0) > 0));
  }, [canRate, currentUserId, listing.id]);

  return (
    <div>
      <Link href={isSeller ? '/listings/my' : '/listings'} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-5">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {isSeller ? 'My listings' : 'All listings'}
      </Link>

      {isSeller && (
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-medium text-emerald-300">This is your listing</span>
          {isActive && <DeleteListingButton listingId={listing.id} />}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Photos */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
            {mainPhoto ? (
              <Image src={mainPhoto} alt={listing.title} fill className="object-contain bg-black/40" sizes="(max-width: 1024px) 100vw, 66vw" priority />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-20 h-20 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                  aria-label="Previous photo"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                  aria-label="Next photo"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                  {photoIndex + 1} / {photos.length}
                </span>
              </>
            )}

            {(isSold || isRemoved) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="rounded-md border border-slate-700 bg-slate-900 px-5 py-2 text-lg font-semibold text-white">
                  {isSold ? 'Sold' : 'Removed'}
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails: tap to view (they used to do nothing) */}
          {photos.length > 1 && (
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {photos.map((photo, idx) => (
                <button
                  key={photo}
                  type="button"
                  onClick={() => setPhotoIndex(idx)}
                  aria-label={`Show photo ${idx + 1}`}
                  aria-pressed={idx === photoIndex}
                  className={`relative aspect-square overflow-hidden rounded-md border-2 ${
                    idx === photoIndex ? 'border-emerald-500' : 'border-transparent hover:border-slate-500'
                  }`}
                >
                  <Image src={photo} alt="" fill className="object-cover" sizes="20vw" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div className="glass-card p-5 sm:p-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`px-2 py-0.5 rounded text-xs font-medium border border-slate-700 ${categoryColor}`}>{listing.category}</span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-900 text-slate-300 border border-slate-700">{listing.product_age}</span>
            </div>

            <h1 className="text-2xl font-semibold text-white mb-1 break-words">{listing.title}</h1>
            <div className="text-sm text-slate-400 mb-5">Listed {timeAgo(listing.created_at)}</div>
            <div className="text-3xl font-semibold text-white mb-5">{formatPrice(Number(listing.asking_price))}</div>

            {/* Buyer actions */}
            {isActive && !isSeller && currentUserId && (
              <div className="space-y-2">
                <BidModalController listing={{ id: listing.id, title: listing.title, asking_price: Number(listing.asking_price) }} />
                <Link href={`/chat/${listing.id}/${listing.seller_id}`} className="btn-secondary block w-full text-center">
                  Message seller
                </Link>
              </div>
            )}

            {isActive && !currentUserId && authChecked && (
              <Link href={`/login?next=/listings/${listing.id}`} className="btn-primary block w-full text-center">
                Log in to make an offer
              </Link>
            )}

            {isSold && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
                <p className="text-slate-300">
                  {isBuyer ? 'You bought this item.' : <>Sold to <span className="font-semibold text-white">{listing.winner?.name || 'a buyer'}</span></>}
                </p>
                {(isBuyer || isSeller) && listing.selected_bidder_id && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Link href={`/chat/${listing.id}/${isSeller ? listing.selected_bidder_id : listing.seller_id}`} className="btn-secondary text-sm">
                      Open chat
                    </Link>
                    {canRate && alreadyRated === false && (
                      <button type="button" onClick={() => setRatingOpen(true)} className="btn-primary text-sm">
                        Rate {ratedUserName}
                      </button>
                    )}
                    {canRate && alreadyRated && <span className="self-center text-sm text-slate-400">You rated this trade</span>}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isSeller && listing.seller && (
            <div className="glass-card p-5 sm:p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Seller</h3>
              <Link href={`/profile/${listing.seller.id}`} className="flex items-center gap-4 group">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-700">
                  {listing.seller.profile_photo_url ? (
                    <Image src={listing.seller.profile_photo_url} alt={sellerName} fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-white">{sellerName.charAt(0).toUpperCase()}</div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold text-white group-hover:underline">{sellerName}</div>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    {sellerRating > 0 ? <span className="text-amber-400">★ {sellerRating.toFixed(1)}</span> : <span className="text-slate-500">No ratings yet</span>}
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">{listing.seller.total_items_sold ?? 0} sold</span>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {listing.description && (
            <div className="glass-card p-5 sm:p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Description</h3>
              <p className="whitespace-pre-line break-words leading-relaxed text-slate-300">{listing.description}</p>
            </div>
          )}

          {!isSeller && currentUserId && (
            <button type="button" onClick={() => setReportOpen(true)} className="text-sm text-slate-500 hover:text-red-400">
              Report this listing
            </button>
          )}
        </div>
      </div>

      {isSeller && !isRemoved && (
        <div className="mt-10">
          <BidDashboard listingId={listing.id} askingPrice={Number(listing.asking_price)} />
        </div>
      )}

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        reportedUserId={listing.seller_id}
        reportedListingId={listing.id}
        subject="listing"
      />
      {canRate && ratedUserId && (
        <RatingModal
          isOpen={ratingOpen}
          onClose={() => setRatingOpen(false)}
          listingId={listing.id}
          ratedUserId={ratedUserId}
          ratedUserName={ratedUserName}
          onRated={() => setAlreadyRated(true)}
        />
      )}
    </div>
  );
}
