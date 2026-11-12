'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ListingCard from './ListingCard';
import { createClient } from '@/lib/supabase/client';
import { errorMessage } from '@/lib/utils';
import { BROWSE_PAGE_SIZE, FILTER_CATEGORIES, isFilterCategory, type BrowseListing } from '@/lib/browse';

export type SortKey = 'newest' | 'price_low' | 'price_high';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_low', label: 'Price: low to high' },
  { value: 'price_high', label: 'Price: high to low' },
];

interface ListingsGridProps {
  initialListings: BrowseListing[];
  initialTotal: number;
  categoryCounts: Record<string, number>;
  fetchError?: string | null;
  initialCategory?: string;
  initialQuery?: string;
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

export default function ListingsGrid({
  initialListings,
  initialTotal,
  categoryCounts,
  fetchError,
  initialCategory,
  initialQuery,
}: ListingsGridProps) {
  const [supabase] = useState(() => createClient());
  const [searchQuery, setSearchQuery] = useState(initialQuery ?? '');
  const [selectedCategory, setSelectedCategory] = useState<string>(isFilterCategory(initialCategory) ? initialCategory : 'All');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [listings, setListings] = useState<BrowseListing[]>(initialListings);
  const [total, setTotal] = useState(initialTotal);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(fetchError ?? null);
  const requestId = useRef(0);
  // The filters the shown list was loaded for (the server loaded the first page)
  const loadedKey = useRef(`${(initialQuery ?? '').trim()}|${isFilterCategory(initialCategory) ? initialCategory : 'All'}|newest`);

  const fetchPage = async (query: string, category: string, sort: SortKey, offset: number) => {
    const { data, error } = await supabase.rpc('search_listings', {
      p_query: query.trim(),
      p_category: category === 'All' ? null : category,
      p_sort: sort,
      p_limit: BROWSE_PAGE_SIZE,
      p_offset: offset,
    });
    if (error) throw error;
    const rows = (data as BrowseListing[] | null) ?? [];
    return { rows, total: rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0 };
  };

  // Filters changed: load the first page again (the search box waits until typing pauses)
  useEffect(() => {
    const key = `${searchQuery.trim()}|${selectedCategory}|${sortBy}`;
    if (key === loadedKey.current) return;
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const page = await fetchPage(searchQuery, selectedCategory, sortBy, 0);
        if (id !== requestId.current) return; // a newer search started
        loadedKey.current = key;
        setListings(page.rows);
        setTotal(page.total);
        setSearchError(null);
      } catch (err) {
        if (id === requestId.current) setSearchError(errorMessage(err, "Couldn't load listings"));
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchPage only reads the latest filters it is given
  }, [searchQuery, selectedCategory, sortBy]);

  const loadMore = async () => {
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const page = await fetchPage(searchQuery, selectedCategory, sortBy, listings.length);
      if (id !== requestId.current) return;
      setListings((prev) => {
        const seen = new Set(prev.map((l) => l.id));
        return [...prev, ...page.rows.filter((l) => !seen.has(l.id))];
      });
      setTotal(page.total);
    } catch (err) {
      setSearchError(errorMessage(err, "Couldn't load more listings"));
    } finally {
      setLoadingMore(false);
    }
  };

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

  const allCount = Object.values(categoryCounts).reduce((sum, n) => sum + n, 0);
  const visibleListings = listings;
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
          <span className="text-slate-500">{allCount}</span>
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

      {searchError ? (
        <EmptyState
          title="Couldn't load listings"
          body="Something went wrong on our side. Refresh the page to try again."
          action={
            <button type="button" onClick={() => window.location.reload()} className="btn-secondary">
              Refresh
            </button>
          }
          detail={searchError}
        />
      ) : allCount === 0 && !hasFilters ? (
        <EmptyState
          title="Nothing for sale yet"
          body="Be the first to list something. It takes about a minute."
          action={
            <Link href="/listings/create" className="btn-primary">
              Sell an item
            </Link>
          }
        />
      ) : visibleListings.length === 0 && !searching ? (
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
            <span aria-live="polite">
              {searching ? 'Searching...' : <>{total} {total === 1 ? 'listing' : 'listings'}</>}
              {selectedCategory !== 'All' && <> in <span className="text-slate-200">{selectedCategory}</span></>}
            </span>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="text-brand-400 hover:text-brand-300">
                Clear filters
              </button>
            )}
          </div>
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 transition-opacity ${searching ? 'opacity-60' : ''}`}>
            {visibleListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          {visibleListings.length < total && (
            <div className="flex justify-center pt-2">
              <button type="button" onClick={loadMore} disabled={loadingMore || searching} className="btn-secondary">
                {loadingMore ? 'Loading...' : `Show more (${total - visibleListings.length} left)`}
              </button>
            </div>
          )}
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
