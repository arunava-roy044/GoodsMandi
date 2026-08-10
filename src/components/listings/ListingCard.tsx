'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, timeAgo } from '@/lib/utils';
import { CATEGORY_COLORS } from '@/lib/constants';

type Profile = {
  id: string;
  name: string;
  profile_photo_url: string;
  rating_avg: number;
};

type Listing = {
  id: string;
  title: string;
  asking_price: number;
  category: string;
  product_age: string;
  photos: string[];
  created_at: string;
  seller: Profile;
};

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const firstPhoto = listing.photos && listing.photos.length > 0 ? listing.photos[0] : null;
  const categoryColor = CATEGORY_COLORS[listing.category as keyof typeof CATEGORY_COLORS] || 'bg-slate-500/20 text-slate-300';

  return (
    <Link href={`/listings/${listing.id}`} className="block group">
      <div className="glass-card-hover rounded-2xl overflow-hidden bg-slate-900 border border-white/10 h-full flex flex-col transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)]">
        {/* Image Section */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-800">
          {firstPhoto ? (
            <Image
              src={firstPhoto}
              alt={listing.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
              <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          {/* Overlays */}
          <div className="absolute top-3 left-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md ${categoryColor} border border-white/10`}>
              {listing.category}
            </span>
          </div>
          
          <div className="absolute bottom-3 right-3">
            <span className="px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg">
              {formatPrice(listing.asking_price)}
            </span>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">
              {listing.title}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-white/5">
              {listing.product_age}
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">
              {timeAgo(listing.created_at)}
            </span>
          </div>

          <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-700 relative">
                {listing.seller?.profile_photo_url ? (
                  <Image src={listing.seller.profile_photo_url} alt={listing.seller.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-white font-bold bg-emerald-600">
                    {listing.seller?.name?.charAt(0) || '?'}
                  </div>
                )}
              </div>
              <span className="text-sm text-slate-300 truncate max-w-[100px]">{listing.seller?.name || 'Unknown'}</span>
            </div>
            
            {listing.seller?.rating_avg > 0 && (
              <div className="flex items-center gap-1 text-amber-400">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-xs font-medium text-slate-300">{listing.seller.rating_avg.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
