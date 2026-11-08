import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | GoodsMandi',
  description: 'The rules for buying and selling on GoodsMandi.',
};

const LAST_UPDATED = 'November 8, 2026';
const SUPPORT_EMAIL = 'goodsmandi.support@gmail.com';

type Clause = string | { text: string; list: string[] };
type Section = { title: string; clauses: Clause[] };

const SECTIONS: Section[] = [
  {
    title: 'Who can use GoodsMandi',
    clauses: [
      'GoodsMandi ("the Platform", "we") is open only to currently enrolled students of UPES who sign up with a valid @stu.upes.ac.in email address and confirm it.',
      'By signing up you confirm that you are a currently enrolled UPES student, that the details you give us (name, year, branch) are true, and that you are at least 18 years old, or that a parent or guardian has agreed to you using the Platform.',
      'One person may have only one account. You may not share, sell, lend or transfer your account, or use someone else\'s.',
      'You are responsible for everything done through your account and for keeping your password secret. Tell us straight away at the support email if you think someone else has used your account.',
      'If you stop being an enrolled student, you may finish deals already in progress but must not start new ones. We may close accounts we cannot verify.',
    ],
  },
  {
    title: 'What the Platform is, and is not',
    clauses: [
      'The Platform is a listing and messaging service. It lets students list their own items, receive offers from other students, and chat to arrange a sale.',
      'All payment and handover of items happens directly between users, offline, outside the Platform. We do not handle money, hold funds, check items, deliver anything, or take part in any deal.',
      'We are not a party to any deal between a buyer and a seller and are not responsible for its outcome. This includes non-payment, non-delivery, an item not matching its listing, fake or counterfeit currency, or any other dispute.',
      'You trade at your own risk. Meet in safe, public places on campus, check the item before paying, and never pay in advance to someone you have not met.',
      'GoodsMandi is an independent student project. It is not run, endorsed or supervised by UPES unless UPES says so in writing. UPES is not responsible for the Platform or for deals made on it.',
      'The Platform is free to use. If we ever introduce fees, we will tell you before they apply and they will not apply to deals already in progress.',
    ],
  },
  {
    title: 'Listings',
    clauses: [
      'You may only list personal items that you own and are allowed to sell. The Platform is for students selling their own things, not for running a business, reselling in bulk, or advertising services.',
      'Sellers are solely responsible for their listings being accurate and honest, including the title, description, category, age, condition, photos and price. Do not hide known defects.',
      'Photos must be of the actual item you are selling, or clearly marked as stock photos. Do not use photos you do not have the right to use.',
      {
        text: 'You must not list any of the following:',
        list: [
          'alcohol, tobacco, vapes, drugs or other controlled substances',
          'medicines, prescription items or anything requiring a licence to sell',
          'weapons, ammunition, knives meant as weapons, explosives, gas cylinders or other dangerous goods',
          'stolen, counterfeit or replica goods',
          'property of UPES, a hostel or anyone else (for example hostel furniture, lab equipment or library books)',
          'college ID cards, accounts, passwords, OTPs, SIM cards or anyone\'s personal data',
          'exam papers, answer keys, or any material or service meant for cheating, including writing assignments, projects or exams for someone else, or proxy attendance',
          'animals, adult content, currency, gift cards, lottery or betting products',
          'anything illegal to sell or own under Indian law or against UPES rules',
        ],
      },
      'Do not post duplicate listings, spam, misleading prices, or listings meant to collect offers without a real intention to sell.',
      'We may remove any listing that breaks these Terms, or that we reasonably think is unsafe or unlawful, without notice.',
    ],
  },
  {
    title: 'Offers and sales',
    clauses: [
      'Buyers can make an offer on any active listing. Offers are private: only the seller sees all offers on their listing.',
      'An offer must be at least 70% of the seller\'s asking price. Lower offers are refused automatically.',
      'A buyer can change their offer at most twice (three offers in total) while it is still waiting for the seller.',
      'The seller may accept any offer, or none. They do not have to accept the highest one. Accepting an offer marks the item as sold. The seller may also choose one backup buyer in case the deal falls through.',
      'Making or accepting an offer is a promise to try in good faith to complete the deal at that price. It is not a payment, and the Platform does not enforce it. Repeatedly not showing up, or backing out after your offer is accepted, can be reported as a No-show.',
      'You must not make offers on your own listings, including through another account or with the help of friends, and you must not make fake offers to push the price up or put off other buyers.',
      'Once a deal is agreed, both sides should not change the price or terms at the meet-up without the other\'s free agreement.',
    ],
  },
  {
    title: 'Chat and conduct',
    clauses: [
      'Be respectful. Harassment, threats, hate speech, sexual content, stalking, and abusive or discriminatory language are not allowed anywhere on the Platform.',
      'Use chat only to arrange the sale of the listed item. Do not use it to advertise, spam, ask for prohibited items, or ask for payment in advance.',
      'Your phone number and email are never shown to other users. Share contact details only if you choose to.',
      'Do not try to get around the Platform\'s checks, reporting or bans, for example by making a new account after being banned, or by scraping, attacking or overloading the site.',
    ],
  },
  {
    title: 'Reports, warnings and bans',
    clauses: [
      'You can report a user or a listing for: No-show, Harassment, Fake/Prohibited item, or Scam.',
      'An admin reviews every report. A report only becomes a confirmed warning after an admin decides it is valid. Unconfirmed reports do not count against anyone.',
      'An account with three (3) confirmed warnings is banned automatically. A banned account cannot create listings or make offers. It may still chat to finish a deal that was already agreed before the ban.',
      'For serious cases, such as illegal activity, threats to safety, fraud, or a false identity, we may suspend or ban an account immediately, without earlier warnings, and remove its listings.',
      'Making false or malicious reports is itself a breach of these Terms and can lead to a warning on your own account.',
      `If you think a warning or ban was wrong, email ${SUPPORT_EMAIL} within 14 days, explaining why. A person who did not make the original decision will review it where possible, and we will reply within 15 days.`,
      'Where we believe someone is in danger or a crime has happened, we may share relevant information with UPES authorities or the police.',
    ],
  },
  {
    title: 'Ratings',
    clauses: [
      'After a sale, the seller and the accepted buyer can each rate the other once, from 1 to 5 stars. Ratings cannot be edited later.',
      'Ratings must be honest and about the deal. You must not offer or demand a rating in exchange for anything, threaten a bad rating, or arrange fake deals to raise or lower anyone\'s rating.',
      'We may remove ratings that break these rules.',
    ],
  },
  {
    title: 'Your content',
    clauses: [
      'You keep ownership of the photos and text you post. You give us a free, non-exclusive licence to store, display and resize them for the purpose of running the Platform, for as long as they are on it.',
      'You confirm you have the right to post what you post, and that it does not break anyone else\'s rights or any law.',
    ],
  },
  {
    title: 'Privacy and your data',
    clauses: [
      {
        text: 'We collect only what we need to run the Platform:',
        list: [
          'your college email, name, year, branch and optional profile photo',
          'your listings, offers, ratings, reports and chat messages',
          'basic technical data needed to keep you logged in and the site secure',
        ],
      },
      'Your email is never shown to other users. Your name, photo, year, branch, rating and active listings are shown to other logged-in students.',
      'Chat messages can be read only by the two people in the conversation. Admins review reports using the information in the report. If you report a conversation, include the relevant messages in your report.',
      'Data is stored with our hosting providers (Supabase and Vercel). We do not sell your data or use it for advertising.',
      `You can ask us to see, correct or delete your data, or to close your account, by emailing ${SUPPORT_EMAIL} from your college email. We will do it within 30 days. We may keep records connected to an open report, a ban, or a legal requirement for as long as needed.`,
    ],
  },
  {
    title: 'Limitation of liability',
    clauses: [
      {
        text: 'To the maximum extent allowed by law, the Platform, its founders and operators are not liable for any direct, indirect, incidental or consequential loss arising from:',
        list: [
          'any deal or meeting between users',
          'the condition, legality, safety or authenticity of any item',
          'anything that happens during an offline exchange',
          'loss of money or property, or personal harm, connected to using the Platform',
          'the Platform being unavailable, slow, or losing data',
        ],
      },
      'The Platform is provided "as is" and "as available", without any promise that it will be error-free or always available.',
      'Because the Platform is free, our total liability to you for any claim is limited to ₹1,000, to the extent the law allows such a limit.',
      'Nothing in these Terms limits any right you have that cannot legally be limited.',
    ],
  },
  {
    title: 'Indemnity',
    clauses: [
      'If you break these Terms or the law while using the Platform, and someone makes a claim against us because of it, you agree to cover the reasonable costs and losses this causes us.',
    ],
  },
  {
    title: 'Closing accounts',
    clauses: [
      `You can stop using the Platform at any time and ask us to close your account by emailing ${SUPPORT_EMAIL}.`,
      'We may suspend or close an account that breaks these Terms, acts fraudulently, puts other users at risk, or no longer belongs to an enrolled student.',
      'Sections on liability, indemnity, governing law and anything else that by its nature should continue will still apply after an account is closed.',
    ],
  },
  {
    title: 'Changes to these Terms',
    clauses: [
      'We may update these Terms. The date at the top shows the latest version. For important changes we will tell you on the site or by email before they take effect.',
      'If you keep using the Platform after a change takes effect, you accept the updated Terms. If you do not agree, stop using the Platform and ask us to close your account.',
    ],
  },
  {
    title: 'Governing law and disputes',
    clauses: [
      'These Terms are governed by the laws of India.',
      `Please contact us first at ${SUPPORT_EMAIL} so we can try to resolve any issue informally. If that does not work, the courts of Dehradun, Uttarakhand have exclusive jurisdiction.`,
      'Disputes between users about a deal are between those users. We may help by reviewing reports, but we are not required to resolve them.',
    ],
  },
  {
    title: 'General',
    clauses: [
      'If any part of these Terms is found invalid, the rest still applies.',
      'If we do not enforce a rule straight away, we have not given up the right to enforce it later.',
      'These Terms, together with any rules shown on the Platform, are the whole agreement between you and us about using the Platform.',
    ],
  },
  {
    title: 'Contact and grievances',
    clauses: [
      `For questions, complaints, appeals, data requests, or to report content that is unlawful, email ${SUPPORT_EMAIL}. This address is also our Grievance Officer contact under the Information Technology Rules, 2021.`,
      'We will acknowledge complaints within 24 hours and aim to resolve them within 15 days. Reports of content that is illegal or puts someone at risk are handled first.',
    ],
  },
];

function linkifyEmail(text: string) {
  const parts = text.split(SUPPORT_EMAIL);
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 && (
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-400 hover:text-emerald-300 break-all">
          {SUPPORT_EMAIL}
        </a>
      )}
    </span>
  ));
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Home
      </Link>

      <article className="glass-card p-6 sm:p-10">
        <h1 className="text-3xl font-semibold text-white mb-1">Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-6">Last updated: {LAST_UPDATED}</p>

        <p className="text-slate-300 leading-relaxed mb-4">
          These Terms are the rules for using GoodsMandi. By creating an account or using the Platform, you agree to them.
          Please read them, especially the sections on safety, prohibited items and liability.
        </p>
        <div className="mb-8 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          These Terms were written by the GoodsMandi team and have not yet been reviewed by a lawyer.
        </div>

        <nav aria-label="Sections" className="mb-10 rounded-md border border-slate-800 bg-slate-950/50 p-4">
          <ol className="grid gap-1 text-sm sm:grid-cols-2">
            {SECTIONS.map((section, i) => (
              <li key={section.title}>
                <a href={`#section-${i + 1}`} className="text-slate-300 hover:text-white">
                  {i + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {SECTIONS.map((section, i) => (
          <section key={section.title} id={`section-${i + 1}`} className="mb-8 scroll-mt-24">
            <h2 className="mb-3 border-b border-slate-800 pb-2 text-xl font-semibold text-white">
              {i + 1}. {section.title}
            </h2>
            <div className="space-y-3 leading-relaxed text-slate-300">
              {section.clauses.map((clause, j) => {
                const number = <strong className="text-slate-200">{i + 1}.{j + 1}</strong>;
                if (typeof clause === 'string') {
                  return (
                    <p key={j}>
                      {number} {linkifyEmail(clause)}
                    </p>
                  );
                }
                return (
                  <div key={j}>
                    <p>
                      {number} {clause.text}
                    </p>
                    <ul className="mt-2 ml-5 list-disc space-y-1 text-slate-400">
                      {clause.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </article>
    </div>
  );
}
