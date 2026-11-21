import Link from 'next/link';
import { GRIEVANCE_OFFICER_NAME, SUPPORT_EMAIL, TERMS_DATE } from '@/lib/legal';
import { TERMS } from '@/lib/terms';

export const metadata = {
  title: 'Terms of Service | GoodsMandi',
  description: 'The rules for buying and selling on GoodsMandi.',
};

// Fills in {officer}, and turns {email} and [[privacy]] into links
function render(text: string, privacyLinkText: string) {
  const parts = text.replaceAll('{officer}', GRIEVANCE_OFFICER_NAME).split(/(\[\[privacy\]\]|\{email\})/);
  return parts.map((part, i) => {
    if (part === '[[privacy]]') {
      return (
        <Link key={i} href="/privacy" className="text-emerald-400 hover:text-emerald-300">
          {privacyLinkText}
        </Link>
      );
    }
    if (part === '{email}') {
      return (
        <a key={i} href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-400 hover:text-emerald-300 break-all">
          {SUPPORT_EMAIL}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const language = lang === 'hi' ? 'hi' : 'en';
  const terms = TERMS[language];

  const tab = (code: 'en' | 'hi', label: string) => (
    <Link
      href={code === 'en' ? '/terms' : '/terms?lang=hi'}
      hrefLang={code}
      aria-current={language === code ? 'true' : undefined}
      className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
        language === code
          ? 'border-slate-100 bg-slate-100 text-slate-900'
          : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Home
      </Link>

      <article className="glass-card p-6 sm:p-10" lang={language}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-white mb-1">{terms.title}</h1>
            <p className="text-sm text-slate-400">
              {terms.updated}: {TERMS_DATE}
            </p>
          </div>
          <nav aria-label="Language" className="flex gap-2">
            {tab('en', 'English')}
            {tab('hi', 'हिन्दी')}
          </nav>
        </div>

        <p className="text-slate-300 leading-relaxed mb-4">{terms.intro}</p>
        <div className="mb-8 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {terms.reviewWarning}
        </div>

        <nav aria-label={terms.tocLabel} className="mb-10 rounded-md border border-slate-800 bg-slate-950/50 p-4">
          <ol className="grid gap-1 text-sm sm:grid-cols-2">
            {terms.sections.map((section, i) => (
              <li key={section.title}>
                <a href={`#section-${i + 1}`} className="text-slate-300 hover:text-white">
                  {i + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {terms.sections.map((section, i) => (
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
                      {number} {render(clause, terms.privacyLinkText)}
                    </p>
                  );
                }
                return (
                  <div key={j}>
                    <p>
                      {number} {render(clause.text, terms.privacyLinkText)}
                    </p>
                    <ul className="mt-2 ml-5 list-disc space-y-1 text-slate-400">
                      {clause.list.map((item) => (
                        <li key={item}>{render(item, terms.privacyLinkText)}</li>
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
