'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconRefresh } from '@/components/admin/icons';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const format = (n: number) => n.toLocaleString('en-IN');

// A number that quickly rolls up to its value when the page opens, and rolls from the old
// value to the new one when the overview refreshes. The real number is in the page from the
// start (so screen readers and people with "reduce motion" on just see it); only the visible
// digits are animated.
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);

  useEffect(() => {
    const el = ref.current;
    const start = from.current;
    from.current = value;
    if (!el || start === value || prefersReducedMotion()) {
      if (el) el.textContent = format(value);
      return;
    }
    const duration = 700;
    const began = performance.now();
    let frame = 0;
    const tick = (time: number) => {
      const t = Math.min(1, (time - began) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(Math.round(start + (value - start) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      el.textContent = format(value);
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {format(value)}
    </span>
  );
}

function ago(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 30) return 'just now';
  if (s < 90) return '1 min ago';
  return `${Math.round(s / 60)} min ago`;
}

// Quietly reloads the overview's numbers every minute while the tab is open and visible,
// and shows when they were last updated. There's also a button to update right away.
export function AutoRefresh({ renderedAt, everySeconds = 60 }: { renderedAt: string; everySeconds?: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') startTransition(() => router.refresh());
    };
    const timer = setInterval(refresh, everySeconds * 1000);
    const clock = setInterval(() => setNow(Date.now()), 15_000);
    // Catch up straight away when someone comes back to the tab after a while
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - new Date(renderedAt).getTime() > everySeconds * 1000) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      clearInterval(clock);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [router, everySeconds, renderedAt]);

  const label = pending ? 'Updating…' : `Updated ${ago(now - new Date(renderedAt).getTime())}`;

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      <span aria-live="polite" suppressHydrationWarning>{label}</span>
      <button
        type="button"
        onClick={() => {
          setNow(Date.now());
          startTransition(() => router.refresh());
        }}
        disabled={pending}
        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
        aria-label="Update now"
        title="Update now"
      >
        <IconRefresh className={`h-3.5 w-3.5 ${pending ? 'motion-safe:animate-spin' : ''}`} />
      </button>
    </div>
  );
}
