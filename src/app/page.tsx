import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { LISTING_CATEGORIES } from '@/lib/constants';

const steps = [
  {
    title: 'Sign up with your UPES email',
    body: 'Accounts need a verified @stu.upes.ac.in address, so everyone you deal with is a student here.',
  },
  {
    title: 'List something or make an offer',
    body: 'Post an item with photos and a price. Buyers send private offers of at least 70% of the asking price, and can revise an offer up to three times.',
  },
  {
    title: 'Pick a buyer and meet on campus',
    body: 'The seller chooses an offer, you sort out a time and place in chat, check the item, and pay each other directly.',
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50">
      <Navbar />

      <section className="border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <p className="text-sm font-medium text-brand-400 mb-4">For UPES students</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white max-w-2xl mb-5">
            Buy and sell secondhand stuff with people on campus.
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mb-8">
            Books, cycles, coolers, chairs, gadgets. List what you no longer need, or find
            something a senior is leaving behind, and hand it over in person.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/listings" className="btn-primary text-center">
              Browse listings
            </Link>
            <Link href="/listings/create" className="btn-secondary text-center">
              Sell an item
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-semibold text-white mb-8">How it works</h2>
          <ol className="grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title}>
                <p className="text-sm text-slate-500 mb-2">Step {i + 1}</p>
                <h3 className="text-base font-semibold text-slate-100 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="text-sm text-slate-500 mt-10">
            Every seller has a rating from past trades, and you can report anyone who doesn&apos;t
            show up or misrepresents an item. See the{' '}
            <Link href="/terms" className="text-slate-300 underline underline-offset-2 hover:text-white">
              terms
            </Link>{' '}
            for the full rules.
          </p>
        </div>
      </section>

      <section className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">Categories</h2>
            <Link href="/listings" className="text-sm text-slate-400 hover:text-white">
              All listings
            </Link>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {LISTING_CATEGORIES.map((category) => (
              <li key={category}>
                <Link
                  href={`/listings?category=${encodeURIComponent(category)}`}
                  className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200 hover:border-slate-700 hover:bg-slate-800/60 transition-colors"
                >
                  {category}
                  <span className="text-slate-500" aria-hidden="true">&rarr;</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Footer />
    </div>
  );
}
