import Link from 'next/link';
import { NOTICE } from '@/lib/privacyNotice';
import {
  EMAIL_PROVIDER,
  FIDUCIARY_NAME,
  GRIEVANCE_OFFICER_NAME,
  PRIVACY_NOTICE_DATE,
  REQUEST_RESPONSE_DAYS,
  SUPPORT_EMAIL,
} from '@/lib/legal';

export const metadata = {
  title: 'Privacy Notice | GoodsMandi',
  description: 'What personal data GoodsMandi collects, why, and how you can use your rights.',
};

function fill(text: string): string {
  return text
    .replaceAll('{fiduciary}', FIDUCIARY_NAME)
    .replaceAll('{officer}', GRIEVANCE_OFFICER_NAME)
    .replaceAll('{email}', SUPPORT_EMAIL)
    .replaceAll('{days}', String(REQUEST_RESPONSE_DAYS))
    .replaceAll('{emailProvider}', EMAIL_PROVIDER);
}

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const language = lang === 'hi' ? 'hi' : 'en';
  const notice = NOTICE[language];

  const tab = (code: 'en' | 'hi', label: string) => (
    <Link
      href={code === 'en' ? '/privacy' : '/privacy?lang=hi'}
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
            <h1 className="text-3xl font-semibold text-white mb-1">{notice.title}</h1>
            <p className="text-sm text-slate-400">
              {notice.updated}: {PRIVACY_NOTICE_DATE}
            </p>
          </div>
          <nav aria-label="Language" className="flex gap-2">
            {tab('en', 'English')}
            {tab('hi', 'हिन्दी')}
          </nav>
        </div>

        <p className="text-slate-300 leading-relaxed mb-4">{notice.intro}</p>
        <div className="mb-8 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {notice.reviewWarning}
        </div>

        <nav aria-label={notice.tocLabel} className="mb-10 rounded-md border border-slate-800 bg-slate-950/50 p-4">
          <ol className="grid gap-1 text-sm sm:grid-cols-2">
            {notice.sections.map((section, i) => (
              <li key={section.title}>
                <a href={`#section-${i + 1}`} className="text-slate-300 hover:text-white">
                  {i + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {notice.sections.map((section, i) => (
          <section key={section.title} id={`section-${i + 1}`} className="mb-8 scroll-mt-24">
            <h2 className="mb-3 border-b border-slate-800 pb-2 text-xl font-semibold text-white">
              {i + 1}. {section.title}
            </h2>
            <div className="space-y-3 leading-relaxed text-slate-300">
              {section.paragraphs?.map((p) => <p key={p}>{fill(p)}</p>)}
              {section.list && (
                <ul className="ml-5 list-disc space-y-2 text-slate-300">
                  {section.list.map((item) => <li key={item}>{fill(item)}</li>)}
                </ul>
              )}
            </div>
          </section>
        ))}

        <div className="mt-10 rounded-md border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-300">
          <Link href="/privacy/request" className="text-emerald-400 hover:text-emerald-300 font-medium">
            {language === 'hi' ? 'गोपनीयता अनुरोध या शिकायत भेजें →' : 'Send a privacy request or complaint →'}
          </Link>
        </div>
      </article>
    </div>
  );
}
