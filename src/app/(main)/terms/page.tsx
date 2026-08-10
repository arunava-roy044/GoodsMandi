import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="mb-8">
        <Link href="/" className="text-brand-500 hover:text-brand-400 inline-flex items-center text-sm font-medium transition-colors">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Home
        </Link>
      </div>

      <div className="glass-card rounded-2xl p-8 md:p-12 prose prose-invert prose-slate max-w-none">
        <h1 className="text-4xl font-bold mb-2 gradient-text">Terms of Service</h1>
        <p className="text-slate-400 mb-8 font-medium">Last updated: August 1, 2026</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">1. Platform Purpose</h2>
          <p className="text-slate-300 leading-relaxed">
            GoodsMandi is a listing and matching service designed exclusively for students. We provide a platform for users to discover items and connect with sellers. GoodsMandi <strong>does not process payments</strong>, facilitate shipping, or verify the physical condition of listed items. All payment, exchange, and inspection of goods happen offline directly between users at their own risk.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">2. Eligibility</h2>
          <p className="text-slate-300 leading-relaxed">
            To use GoodsMandi, you must be a verified student. Account creation requires a valid college email address ending in <code className="bg-slate-800 px-2 py-1 rounded text-brand-400">@stu.upes.ac.in</code>. Accounts created with non-institutional emails will be disabled.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">3. Prohibited Items</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            To maintain a safe campus environment, the following items are strictly prohibited from being listed:
          </p>
          <ul className="list-disc pl-6 text-slate-300 space-y-2 marker:text-brand-500">
            <li>Alcohol, tobacco, vaping products, and illegal drugs</li>
            <li>Weapons of any kind (including decorative or prop weapons)</li>
            <li>Stolen, counterfeit, or pirated goods</li>
            <li>Leaked academic/exam materials, assignments, or cheating tools</li>
            <li>Pharmaceuticals or medical devices</li>
            <li>Services (GoodsMandi is for physical goods only)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">4. Bidding Rules</h2>
          <p className="text-slate-300 leading-relaxed">
            To prevent spam and lowballing, the system automatically rejects any bids that are below 70% of the asking price set by the seller. Bids are silent and private. The seller has full discretion to choose which buyer they wish to sell to, regardless of the bid amount.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">5. Reporting & Enforcement</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            We rely on community reporting to keep GoodsMandi safe. Users can be reported for four fixed categories: No-show (failing to attend an agreed meetup), Harassment, Fake/Prohibited item, or Scam.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-amber-200/90 text-sm">
            <strong>Three Strike Policy:</strong> Accumulating 3 admin-confirmed warnings will result in a permanent ban from creating new listings or placing new bids. In-progress deals remain completable after a ban to prevent disruption to innocent counter-parties.
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">6. Liability Disclaimer</h2>
          <p className="text-slate-300 leading-relaxed">
            GoodsMandi and its creators disclaim all liability for any disputes, financial losses, physical harm, or damages resulting from offline transactions initiated through the platform. By using the platform, you agree to meet in safe, public campus locations and verify items before completing any transaction.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">7. Updates to Terms</h2>
          <p className="text-slate-300 leading-relaxed">
            We reserve the right to update these terms at any time. Significant changes will be announced on the platform. Continued use of GoodsMandi implies your acceptance of the updated terms.
          </p>
        </section>
      </div>
    </div>
  );
}
