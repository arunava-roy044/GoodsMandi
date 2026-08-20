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
        <p className="text-slate-400 mb-4 font-medium">Last updated: August 20, 2026</p>
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm mb-8">
          <strong>Important note:</strong> This is a founder-drafted document, not final legal advice, pending review by a lawyer or the college&apos;s legal-aid/incubation cell.
        </div>

        {/* Section 1 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">1. Who Can Use This Platform</h2>
          <div className="space-y-3 text-slate-300 leading-relaxed">
            <p><strong className="text-slate-200">1.1</strong> This platform (&quot;the Platform&quot;) is available only to students who verify their identity using a valid college email address.</p>
            <p><strong className="text-slate-200">1.2</strong> By signing up, you confirm that you are a currently enrolled student at the verified institution and that all information you provide is accurate.</p>
            <p><strong className="text-slate-200">1.3</strong> The Platform reserves the right to suspend or reject any account where verification cannot be confirmed.</p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">2. What This Platform Is (and Isn&apos;t)</h2>
          <div className="space-y-3 text-slate-300 leading-relaxed">
            <p><strong className="text-slate-200">2.1</strong> The Platform is a <strong>listing and matching service</strong> that allows students to list items for sale, receive bids from other students, and communicate via chat to coordinate a sale.</p>
            <p><strong className="text-slate-200">2.2</strong> <strong>All payment and physical exchange of items happens directly between users, offline, outside the Platform.</strong> The Platform does not process payments, hold funds in escrow, verify item condition, or participate in the transaction in any way.</p>
            <p><strong className="text-slate-200">2.3</strong> The Platform is <strong>not a party to any transaction</strong> between a buyer and seller and bears no responsibility for the outcome of any deal, including but not limited to: non-payment, non-delivery, item misrepresentation, counterfeit currency, or any dispute arising from the offline exchange.</p>
            <p><strong className="text-slate-200">2.4</strong> Users transact with each other <strong>at their own risk</strong>. The Platform strongly recommends completing exchanges in safe, public, on-campus locations.</p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">3. Listings</h2>
          <div className="space-y-3 text-slate-300 leading-relaxed">
            <p><strong className="text-slate-200">3.1</strong> Sellers are solely responsible for the accuracy of their listings, including item description, condition, photos, and asking price.</p>
            <p><strong className="text-slate-200">3.2</strong> Listed items must be lawfully owned by the seller and lawful to sell.</p>
            <p><strong className="text-slate-200">3.3</strong> <strong>Prohibited items</strong> may not be listed, including but not limited to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-slate-400">
              <li>Alcohol, tobacco, drugs or controlled substances</li>
              <li>Weapons</li>
              <li>Stolen goods</li>
              <li>Counterfeit goods</li>
              <li>Academic materials intended to facilitate cheating (e.g. leaked exam papers/answer keys)</li>
              <li>Medicines/pharmaceuticals</li>
              <li>Any item illegal to sell or possess under applicable law</li>
            </ul>
            <p className="text-slate-400 text-sm">The Platform reserves the right to remove any listing and suspend the associated account at its sole discretion.</p>
            <p><strong className="text-slate-200">3.4</strong> The Platform may remove any listing that violates these Terms without prior notice.</p>
          </div>
        </section>

        {/* Section 4 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">4. Bidding</h2>
          <div className="space-y-3 text-slate-300 leading-relaxed">
            <p><strong className="text-slate-200">4.1</strong> Buyers may place a bid on any active listing. Bids are <strong>private/silent</strong> — only the seller can view all bids placed on their listing.</p>
            <p><strong className="text-slate-200">4.2</strong> The minimum acceptable bid on any listing is <strong>70% of the seller&apos;s stated asking price</strong>. Bids below this threshold will not be accepted by the Platform.</p>
            <p><strong className="text-slate-200">4.3</strong> The seller has sole discretion to select any bidder to sell to, regardless of bid amount, and is under no obligation to accept the highest bid.</p>
            <p><strong className="text-slate-200">4.4</strong> Placing a bid is an expression of interest, not a binding financial commitment enforceable through the Platform. However, users are expected to act in good faith — repeated no-shows or withdrawal after being selected may be reported (see Section 6).</p>
          </div>
        </section>

        {/* Section 5 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">5. Chat &amp; Conduct</h2>
          <div className="space-y-3 text-slate-300 leading-relaxed">
            <p><strong className="text-slate-200">5.1</strong> Users must communicate respectfully. Harassment, threats, discriminatory language, or abusive conduct of any kind is prohibited.</p>
            <p><strong className="text-slate-200">5.2</strong> Users must not use the chat feature to solicit prohibited transactions, share content unrelated to a listed item&apos;s sale, or attempt to circumvent the Platform&apos;s verification or reporting systems.</p>
            <p><strong className="text-slate-200">5.3</strong> Contact details (such as phone numbers) are not shared automatically and should only be exchanged once both parties choose to do so.</p>
          </div>
        </section>

        {/* Section 6 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">6. Reporting &amp; Enforcement</h2>
          <div className="space-y-3 text-slate-300 leading-relaxed">
            <p><strong className="text-slate-200">6.1</strong> Users may report another user or listing under one of the following categories: <strong>No-show, Harassment, Fake/Prohibited item, Scam.</strong></p>
            <p><strong className="text-slate-200">6.2</strong> All reports are reviewed by the Platform&apos;s admin team. A report only becomes a <strong>confirmed warning</strong> on a user&apos;s account after manual review confirms the report is valid. Unconfirmed or unsubstantiated reports do not count against a user.</p>
            <p><strong className="text-slate-200">6.3</strong> An account that accumulates <strong>three (3) confirmed warnings</strong> will be <strong>permanently banned</strong> from the Platform.</p>
            <p><strong className="text-slate-200">6.4</strong> A banned user may complete any transaction that was already in progress at the time of the ban but may not create new listings or place new bids.</p>
            <p><strong className="text-slate-200">6.5</strong> The Platform reserves the right to suspend or ban any account immediately, without prior warning, in cases of severe violations (e.g. illegal activity, safety threats).</p>
          </div>
        </section>

        {/* Section 7 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">7. Ratings &amp; Feedback</h2>
          <div className="space-y-3 text-slate-300 leading-relaxed">
            <p><strong className="text-slate-200">7.1</strong> Users may leave feedback about their experience with another user following a completed transaction. Feedback must be honest and may not be used to harass or defame another user.</p>
          </div>
        </section>

        {/* Section 8 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">8. Limitation of Liability</h2>
          <div className="space-y-3 text-slate-300 leading-relaxed">
            <p><strong className="text-slate-200">8.1</strong> To the maximum extent permitted by law, the Platform, its founders, and operators are not liable for any direct, indirect, incidental, or consequential damages arising from:</p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-slate-400">
              <li>any transaction between users,</li>
              <li>the condition, legality, or safety of any item listed,</li>
              <li>any interaction, dispute, or incident occurring during an offline exchange,</li>
              <li>loss of money, property, or personal harm resulting from use of the Platform.</li>
            </ul>
            <p><strong className="text-slate-200">8.2</strong> The Platform is provided on an &quot;as-is&quot; and &quot;as-available&quot; basis, without warranties of any kind.</p>
          </div>
        </section>

        {/* Section 9 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">9. Account Termination</h2>
          <div className="space-y-3 text-slate-300 leading-relaxed">
            <p><strong className="text-slate-200">9.1</strong> Users may deactivate their account at any time.</p>
            <p><strong className="text-slate-200">9.2</strong> The Platform may suspend or terminate any account that violates these Terms, engages in fraudulent activity, or poses a risk to other users.</p>
          </div>
        </section>

        {/* Section 10 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">10. Changes to These Terms</h2>
          <div className="space-y-3 text-slate-300 leading-relaxed">
            <p><strong className="text-slate-200">10.1</strong> The Platform may update these Terms from time to time. Continued use of the Platform after changes are posted constitutes acceptance of the updated Terms.</p>
          </div>
        </section>

        {/* Section 11 */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">11. Governing Law</h2>
          <div className="space-y-3 text-slate-300 leading-relaxed">
            <p><strong className="text-slate-200">11.1</strong> These Terms shall be governed by the laws of India, without regard to conflict of law principles.</p>
            <p><strong className="text-slate-200">11.2</strong> The courts of Dehradun, Uttarakhand shall have exclusive jurisdiction over any disputes arising from these Terms or use of the Platform.</p>
          </div>
        </section>

        {/* Section 12 */}
        <section className="mb-4">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-2">12. Contact</h2>
          <div className="space-y-3 text-slate-300 leading-relaxed">
            <p><strong className="text-slate-200">12.1</strong> For questions, disputes, or to report an issue not covered above, contact: <a href="mailto:goodsmandi.support@gmail.com" className="text-emerald-400 hover:text-emerald-300 font-medium">goodsmandi.support@gmail.com</a></p>
          </div>
        </section>

        <hr className="border-slate-700 my-8" />
        <p className="text-slate-500 text-sm italic text-center">Last updated August 20, 2026.</p>
      </div>
    </div>
  );
}
