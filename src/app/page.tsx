import Link from 'next/link';
import { LISTING_CATEGORIES } from '@/lib/constants';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 overflow-hidden relative">
      {/* Decorative Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none"></div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-4 container mx-auto text-center z-10 flex flex-col items-center">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-sm font-medium animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          Exclusive for UPES Students
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <span className="block text-slate-100">Welcome to</span>
          <span className="gradient-text pb-2 block">GoodsMandi</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          Your Campus Marketplace — Buy, Sell & Trade with Fellow Students safely and securely.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <Link href="/listings" className="btn-primary text-lg px-8 py-4 w-full sm:w-auto text-center flex items-center justify-center gap-2 group">
            Browse Items
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </Link>
          <Link href="/listings/create" className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto text-center">
            Start Selling
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-900/50 border-y border-slate-800 relative z-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">Why use GoodsMandi?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Built specifically for campus life, making trading easier than ever.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="glass-card p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center mb-4 border border-brand-500/30">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">Campus Verified</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Exclusive to verified @stu.upes.ac.in emails. Trade with real students, no outsiders.</p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-4 border border-teal-500/30">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">Silent Bidding</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Fair and transparent bidding system. Anti-lowball protection ensures serious offers.</p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/30">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">Real-time Chat</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Connect instantly with buyers and sellers to coordinate meetups easily and securely.</p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card p-6 rounded-2xl hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/30">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">Safe Trading</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Community-driven report system and user ratings keep the marketplace safe for everyone.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold text-slate-100 mb-2">Explore Categories</h2>
              <p className="text-slate-400">Find exactly what you need.</p>
            </div>
            <Link href="/listings" className="text-brand-400 hover:text-brand-300 hidden sm:flex items-center gap-1 font-medium transition-colors">
              View all
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {LISTING_CATEGORIES.map((category) => (
              <Link 
                key={category} 
                href={`/listings?category=${encodeURIComponent(category)}`}
                className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col items-center justify-center text-center aspect-square group"
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3 group-hover:bg-brand-500/20 transition-colors duration-300">
                  <span className="text-brand-500 font-bold text-lg">{category.charAt(0)}</span>
                </div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-brand-400 transition-colors duration-300">{category}</span>
              </Link>
            ))}
          </div>
          
          <div className="mt-8 text-center sm:hidden">
             <Link href="/listings" className="btn-secondary w-full flex justify-center items-center gap-2">
              View all listings
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-slate-900/50 border-t border-slate-800 relative z-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">How it works</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Three simple steps to start trading.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
            {/* Connecting lines for desktop */}
            <div className="hidden md:block absolute top-1/2 left-[16.6%] right-[16.6%] h-0.5 bg-gradient-to-r from-slate-800 via-brand-500/50 to-slate-800 -translate-y-1/2 z-0"></div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-slate-950 border-2 border-brand-500 flex items-center justify-center text-2xl font-bold text-brand-500 mb-6 shadow-[0_0_15px_rgba(16,185,129,0.3)]">1</div>
              <h3 className="text-xl font-semibold text-slate-100 mb-3">List or Find</h3>
              <p className="text-slate-400 text-sm px-4">Post your unwanted items in seconds, or browse through categories to find what you need.</p>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center mt-8 md:mt-0">
              <div className="w-16 h-16 rounded-full bg-slate-950 border-2 border-brand-500 flex items-center justify-center text-2xl font-bold text-brand-500 mb-6 shadow-[0_0_15px_rgba(16,185,129,0.3)]">2</div>
              <h3 className="text-xl font-semibold text-slate-100 mb-3">Place a Bid</h3>
              <p className="text-slate-400 text-sm px-4">Make a fair offer using our silent bidding system. Sellers choose the best offer.</p>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center mt-8 md:mt-0">
              <div className="w-16 h-16 rounded-full bg-slate-950 border-2 border-brand-500 flex items-center justify-center text-2xl font-bold text-brand-500 mb-6 shadow-[0_0_15px_rgba(16,185,129,0.3)]">3</div>
              <h3 className="text-xl font-semibold text-slate-100 mb-3">Meet & Exchange</h3>
              <p className="text-slate-400 text-sm px-4">Chat to arrange a meetup on campus. Inspect the item, pay directly, and leave a review!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-12 relative z-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xl font-bold gradient-text">GoodsMandi</div>
          <div className="text-slate-500 text-sm">© 2026 GoodsMandi. Built for UPES.</div>
          <div className="flex gap-6">
            <Link href="/terms" className="text-slate-400 hover:text-brand-400 text-sm transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
