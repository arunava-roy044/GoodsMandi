import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ListingCard from '@/components/listings/ListingCard';
import { createClient } from '@/lib/supabase/server';
import { LISTING_CATEGORIES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const SUPABASE_TIMEOUT_MS = 4000;

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
  if (!user) return { user: null, recent: [] };

  // Listings are only readable when signed in (RLS), so only fetch them for logged-in visitors.
  const listingsResult = await withTimeout(
    supabase
      .from('listings')
      .select('id, title, asking_price, category, product_age, photos, created_at, seller:profiles!seller_id(id, name, profile_photo_url, rating_avg)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(4)
  );

  return { user, recent: listingsResult?.data ?? [] };
}

export default async function HomePage() {
  const { user, recent } = await getHomeData();
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
            A marketplace for UPES students. Books, gadgets, cycles and room stuff from people you can meet on campus.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/listings" className="btn-primary text-center">
              Browse listings
            </Link>
            <Link href={sellHref} className="btn-secondary text-center">
              Sell an item
            </Link>
          </div>
          {!user && (
            <p className="mt-6 text-sm text-slate-500">
              Sign up with your <span className="text-slate-300">@stu.upes.ac.in</span> email to get started.
            </p>
          )}
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-12" aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="text-sm font-medium text-slate-400 mb-3">
            Shop by category
          </h2>
          <ul className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {LISTING_CATEGORIES.map((category) => (
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

        {user && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24" aria-labelledby="recent-heading">
            <div className="flex items-baseline justify-between mb-3">
              <h2 id="recent-heading" className="text-sm font-medium text-slate-400">
                Recently listed
              </h2>
              <Link href="/listings" className="text-sm text-brand-400 hover:text-brand-300">
                See all
              </Link>
            </div>
            {recent.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {recent.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    // Supabase types the joined seller as an array; it is a single row here.
                    listing={{ ...listing, seller: Array.isArray(listing.seller) ? listing.seller[0] : listing.seller }}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-800 px-4 py-10 text-center">
                <p className="text-slate-400 mb-4">Nothing listed yet. Be the first.</p>
                <Link href="/listings/create" className="btn-primary">
                  Sell an item
                </Link>
              </div>
            )}
          </section>
        )}

        {!user && <div className="pb-12" />}
      </main>

      <Footer />
    </div>
  );
}
