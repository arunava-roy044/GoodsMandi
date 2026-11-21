'use client';

// Asks a signed-in person to agree again when the Privacy Notice or Terms change
// (PRIVACY_NOTICE_VERSION in src/lib/legal.ts), or when their account has no consent
// record yet. The Privacy Notice promises this. Not shown on the pages being agreed to,
// so they can be read first, or on Settings.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PRIVACY_NOTICE_VERSION } from '@/lib/legal';
import { errorMessage } from '@/lib/utils';

// Settings stays open so someone who doesn't agree can delete their account
const SKIP_PATHS = ['/privacy', '/terms', '/profile/settings'];

export default function ConsentCheck() {
  const pathname = usePathname();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [needed, setNeeded] = useState(false);
  const [adult, setAdult] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setNeeded(false);
        return;
      }
      const { data, error } = await supabase
        .from('consent_records')
        .select('notice_version')
        .eq('user_id', user.id)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      // If the check itself fails, don't block the person
      if (!cancelled && !error) setNeeded(data?.notice_version !== PRIVACY_NOTICE_VERSION);
    }
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!needed || SKIP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  const handleAgree = async () => {
    setError(null);
    setSaving(true);
    const { error } = await supabase.rpc('record_consent', {
      p_notice_version: PRIVACY_NOTICE_VERSION,
      p_adult_confirmed: adult,
      p_terms_accepted: agreed,
    });
    setSaving(false);
    if (error) {
      setError(errorMessage(error, "Couldn't save your answer. Please try again."));
      return;
    }
    setNeeded(false);
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="glass-card w-full max-w-lg p-6 text-sm text-slate-300 space-y-4">
        <h2 id="consent-title" className="text-lg font-semibold text-white">We updated our Terms and Privacy Notice</h2>
        <p>
          Please read the <Link href="/terms" target="_blank" className="text-emerald-400 hover:underline">Terms of Service</Link> and
          the <Link href="/privacy" target="_blank" className="text-emerald-400 hover:underline">Privacy Notice</Link> and agree to keep using GoodsMandi.
          If you don&apos;t agree, you can delete your account in Settings.
        </p>
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900" />
          <span>I am 18 years old or older.</span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900" />
          <span>I agree to the Terms of Service and I have read the Privacy Notice and agree that GoodsMandi may use my data as it describes.</span>
        </label>
        {error && <p role="alert" className="text-red-300">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Link href="/profile/settings" className="btn-secondary">Go to Settings</Link>
          <button type="button" className="btn-primary" disabled={!adult || !agreed || saving} onClick={handleAgree}>
            {saving ? 'Saving...' : 'Agree and continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
