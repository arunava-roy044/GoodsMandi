import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ListingCard from '@/components/listings/ListingCard';
import { createClient } from '@/lib/supabase/server';
import { CATEGORY_OTHER, LISTING_CATEGORIES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const SUPABASE_TIMEOUT_MS = 4000;
const FEED_SIZE = 8;

// Never let a slow or paused Supabase hang the landing page: give up and render the logged-out view.
function withTimeout<T>(promise: PromiseLike<T>): Promise<T | null> {
  return Promise.race([
    Promise.resolve(promise).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), SUPABASE_TIMEOUT_MS)),
  ]);
}

async function getHomeData() {
  const supabase = await createClient();
  const userResult = await withTimeout(supabase.auth.getUser());
  const user = userResult?.data.user ?? null;
  if (!user) return { user: null, recent: [], activeCount: null };

  // Listings are only readable when signed in (RLS), so only fetch them for logged-in visitors.
  const [listingsResult, countResult] = await Promise.all([
    withTimeout(
      supabase
        .from('listings')
        .select('id, title, description, asking_price, category, product_age, photos, created_at, seller:profiles!seller_id(id, name, profile_photo_url, rating_avg)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(FEED_SIZE)
    ),
    withTimeout(
      supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active')
    ),
  ]);

  const recent = (listingsResult?.data ?? []).map((listing) => ({
    ...listing,
    // Supabase types the joined seller as an array; it is a single row here.
    seller: Array.isArray(listing.seller) ? listing.seller[0] : listing.seller,
  }));

  return { user, recent, activeCount: countResult?.count ?? null };
}

export default async function HomePage() {
  const { user, recent, activeCount } = await getHomeData();
  const sellHref = user ? '/listings/create' : '/login?next=/listings/create';

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50">
      <Navbar />

      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Buy and sell on campus.
          </h1>
          <p className="text-lg text-slate-400 mb-8">
            A marketplace for college students. Books, gadgets, cycles and room stuff from people you can meet on campus.
          </p>
          {user ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/listings" className="btn-primary text-center">
                Browse listings
              </Link>
              <Link href={sellHref} className="btn-secondary text-center">
                Sell an item
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/signup" className="btn-primary text-center">
                  Sign up
                </Link>
                <Link href="/login" className="btn-secondary text-center">
                  Log in
                </Link>
              </div>
              <p className="mt-6 text-sm text-slate-500">
                Sign up with your <span className="text-slate-300">college email</span> to browse and post listings.
              </p>
            </>
          )}
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-12" aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="text-sm font-medium text-slate-400 mb-3">
            Shop by category
          </h2>
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...LISTING_CATEGORIES, CATEGORY_OTHER].map((category) => (
              <li key={category}>
                <Link
                  href={`/listings?category=${encodeURIComponent(category)}`}
                  className="flex h-full items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200 hover:border-slate-600 hover:bg-slate-800/60 transition-colors"
                >
                  <span>{category}</span>
                  <span className="text-slate-500" aria-hidden="true">&rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24" aria-labelledby="feed-heading">
          <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
            <div>
              <h2 id="feed-heading" className="text-xl font-semibold text-white">
                Latest listings
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {user
                  ? activeCount !== null
                    ? `${activeCount} ${activeCount === 1 ? 'item' : 'items'} for sale right now`
                    : 'Fresh items from students on campus'
                  : 'Log in to see what students are selling right now'}
              </p>
            </div>
            <Link href="/listings" className="text-sm text-brand-400 hover:text-brand-300">
              See all listings &rarr;
            </Link>
          </div>

          {recent.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recent.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/50 px-6 py-12 text-center">
              {user ? (
                <>
                  <p className="text-base font-medium text-white">No items for sale yet</p>
                  <p className="mt-1 text-sm text-slate-400">Be the first to list something for other students.</p>
                  <Link href="/listings/create" className="btn-primary inline-block mt-5">
                    Sell an item
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-base font-medium text-white">Listings are visible to signed-in students</p>
                  <p className="mt-1 text-sm text-slate-400">Log in or sign up with your college email to see what&apos;s for sale.</p>
                  <Link href="/login" className="btn-primary inline-block mt-5">
                    Log in
                  </Link>
                </>
              )}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
