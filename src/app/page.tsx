import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { LISTING_CATEGORIES } from '@/lib/constants';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50">
      <Navbar />

      <div className="flex-1">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Buy and sell on campus.
          </h1>
          <p className="text-lg text-slate-400 mb-8">
            A marketplace for UPES students.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/listings" className="btn-primary text-center">
              Browse listings
            </Link>
            <Link href="/listings/create" className="btn-secondary text-center">
              Sell an item
            </Link>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-24">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LISTING_CATEGORIES.map((category) => (
              <li key={category}>
                <Link
                  href={`/listings?category=${encodeURIComponent(category)}`}
                  className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200 hover:border-slate-600 transition-colors"
                >
                  {category}
                  <span className="text-slate-500" aria-hidden="true">&rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Footer />
    </div>
  );
}
