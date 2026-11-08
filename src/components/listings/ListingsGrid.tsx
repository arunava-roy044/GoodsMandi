'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import ListingCard from './ListingCard';
import { CATEGORY_OTHER, LISTING_CATEGORIES, isStandardCategory } from '@/lib/constants';

type Profile = {
  id: string;
  name: string;
  profile_photo_url: string;
  rating_avg: number;
};

type Listing = {
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
  seller: Profile;
};

type SortKey = 'newest' | 'price_low' | 'price_high';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_low', label: 'Price: low to high' },
  { value: 'price_high', label: 'Price: high to low' },
];

interface ListingsGridProps {
  initialListings: Listing[];
  fetchError?: string | null;
  initialCategory?: string;
  initialQuery?: string;
}

const FILTER_CATEGORIES = [...LISTING_CATEGORIES, CATEGORY_OTHER] as string[];

function isCategory(value: string | undefined): value is string {
  return !!value && FILTER_CATEGORIES.includes(value);
}

// Listings with a seller-typed tag are grouped under "Others"
function filterGroup(category: string): string {
  return isStandardCategory(category) ? category : CATEGORY_OTHER;
}

// Keep the filters in the address bar so a filtered view can be shared or refreshed.
// replaceState updates the URL without a server round trip.
function syncUrl(category: string, query: string) {
  const params = new URLSearchParams();
  if (category !== 'All') params.set('category', category);
  if (query.trim()) params.set('q', query.trim());
  const search = params.toString();
  window.history.replaceState(null, '', search ? `/listings?${search}` : '/listings');
}

export default function ListingsGrid({ initialListings, fetchError, initialCategory, initialQuery }: ListingsGridProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery ?? '');
  const [selectedCategory, setSelectedCategory] = useState<string>(isCategory(initialCategory) ? initialCategory : 'All');
  const [sortBy, setSortBy] = useState<SortKey>('newest');

  const chooseCategory = (category: string) => {
    setSelectedCategory(category);
    syncUrl(category, searchQuery);
  };

  const changeQuery = (query: string) => {
    setSearchQuery(query);
    syncUrl(selectedCategory, query);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    syncUrl('All', '');
  };

  // How many listings each category has, for the chip counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const listing of initialListings) {
      const group = filterGroup(listing.category);
      counts[group] = (counts[group] ?? 0) + 1;
    }
    return counts;
  }, [initialListings]);

  const visibleListings = useMemo(() => {
    const words = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = initialListings.filter((listing) => {
      if (selectedCategory !== 'All' && filterGroup(listing.category) !== selectedCategory) return false;
      if (words.length === 0) return true;
      const haystack = `${listing.title} ${listing.description ?? ''} ${listing.category}`.toLowerCase();
      // Every word has to match somewhere, so "casio calculator" finds "Calculator, Casio fx-991"
      return words.every((word) => haystack.includes(word));
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'price_low') return a.asking_price - b.asking_price;
      if (sortBy === 'price_high') return b.asking_price - a.asking_price;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [initialListings, searchQuery, selectedCategory, sortBy]);

  const hasFilters = selectedCategory !== 'All' || searchQuery.trim() !== '';

  const chipClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border whitespace-nowrap text-sm transition-colors ${
      active
        ? 'bg-slate-100 text-slate-900 border-slate-100'
        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600 hover:text-white'
    }`;

  return (
    <div className="space-y-5">
      {/* Search and sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            enterKeyHint="search"
            aria-label="Search listings"
            placeholder="Search for books, cycles, calculators..."
            className="input-field w-full pl-9 pr-9"
            value={searchQuery}
            onChange={(e) => changeQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => changeQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-white"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="relative sm:w-56">
          <select
            aria-label="Sort listings"
            className="input-field w-full appearance-none pr-9 cursor-pointer"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-900 text-slate-200">
                {option.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Category chips: one scrolling row on phones, wrapping on wider screens */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible">
        <button type="button" onClick={() => chooseCategory('All')} className={chipClass(selectedCategory === 'All')}>
          All
          <span className="text-slate-500">{initialListings.length}</span>
        </button>
        {FILTER_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => chooseCategory(category)}
            className={chipClass(selectedCategory === category)}
          >
            {category}
            <span className="text-slate-500">{categoryCounts[category] ?? 0}</span>
          </button>
        ))}
      </div>

      {fetchError ? (
        <EmptyState
          title="Couldn't load listings"
          body="Something went wrong on our side. Refresh the page to try again."
          action={
            <button type="button" onClick={() => window.location.reload()} className="btn-secondary">
              Refresh
            </button>
          }
          detail={fetchError}
        />
      ) : initialListings.length === 0 ? (
        <EmptyState
          title="Nothing for sale yet"
          body="Be the first to list something. It takes about a minute."
          action={
            <Link href="/listings/create" className="btn-primary">
              Sell an item
            </Link>
          }
        />
      ) : visibleListings.length === 0 ? (
        <EmptyState
          title="No matches"
          body={
            searchQuery.trim()
              ? `Nothing matches "${searchQuery.trim()}"${selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}.`
              : `Nothing in ${selectedCategory} right now.`
          }
          action={
            <button type="button" onClick={clearFilters} className="btn-secondary">
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              {visibleListings.length} {visibleListings.length === 1 ? 'listing' : 'listings'}
              {selectedCategory !== 'All' && <> in <span className="text-slate-200">{selectedCategory}</span></>}
            </span>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="text-brand-400 hover:text-brand-300">
                Clear filters
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
  detail,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  detail?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 px-4 py-16 text-center">
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-slate-400 max-w-sm mb-5">{body}</p>
      {action}
      {detail && <p className="mt-4 text-xs text-slate-600">{detail}</p>}
    </div>
  );
}
