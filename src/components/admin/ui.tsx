import Link from 'next/link';
import { CountUp } from '@/components/admin/live';

export type Accent = 'emerald' | 'teal' | 'sky' | 'indigo' | 'violet' | 'amber' | 'rose' | 'slate';

// Written out in full so Tailwind keeps these classes in the build
const ACCENTS: Record<Accent, { icon: string; glow: string; bar: string; barToday: string }> = {
  emerald: { icon: 'bg-emerald-500/15 text-emerald-300', glow: 'from-emerald-500/10', bar: 'from-emerald-600/60 to-emerald-400/80', barToday: 'from-emerald-500 to-emerald-300' },
  teal: { icon: 'bg-teal-500/15 text-teal-300', glow: 'from-teal-500/10', bar: 'from-teal-600/60 to-teal-400/80', barToday: 'from-teal-500 to-teal-300' },
  sky: { icon: 'bg-sky-500/15 text-sky-300', glow: 'from-sky-500/10', bar: 'from-sky-600/60 to-sky-400/80', barToday: 'from-sky-500 to-sky-300' },
  indigo: { icon: 'bg-indigo-500/15 text-indigo-300', glow: 'from-indigo-500/10', bar: 'from-indigo-600/60 to-indigo-400/80', barToday: 'from-indigo-500 to-indigo-300' },
  violet: { icon: 'bg-violet-500/15 text-violet-300', glow: 'from-violet-500/10', bar: 'from-violet-600/60 to-violet-400/80', barToday: 'from-violet-500 to-violet-300' },
  amber: { icon: 'bg-amber-500/15 text-amber-300', glow: 'from-amber-500/10', bar: 'from-amber-600/60 to-amber-400/80', barToday: 'from-amber-500 to-amber-300' },
  rose: { icon: 'bg-rose-500/15 text-rose-300', glow: 'from-rose-500/10', bar: 'from-rose-600/60 to-rose-400/80', barToday: 'from-rose-500 to-rose-300' },
  slate: { icon: 'bg-slate-500/15 text-slate-300', glow: 'from-slate-500/10', bar: 'from-slate-600/60 to-slate-400/80', barToday: 'from-slate-500 to-slate-300' },
};

// "This week vs last week": a small green up or red down arrow with the change
export function Trend({ now, prev }: { now: number; prev: number }) {
  if (now === prev) {
    return <span className="text-xs text-slate-500">Same as last week</span>;
  }
  const up = now > prev;
  const change = prev === 0 ? `+${now}` : `${up ? '+' : '−'}${Math.round((Math.abs(now - prev) / prev) * 100)}%`;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${
        up ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
      }`}
      title={`${now} this week, ${prev} last week`}
    >
      <span aria-hidden="true">{up ? '↑' : '↓'}</span>
      <span className="sr-only">{up ? 'Up' : 'Down'}</span>
      {change} <span className="font-normal text-slate-400">vs last week</span>
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  href,
  tone = 'text-white',
  icon,
  accent = 'slate',
  trend,
}: {
  label: string;
  value: number;
  hint?: string;
  href?: string;
  tone?: string;
  icon?: React.ReactNode;
  accent?: Accent;
  trend?: { now: number; prev: number };
}) {
  const a = ACCENTS[accent];
  const body = (
    <>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${a.glow} to-transparent`} aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-2">
        <div className={`text-2xl font-bold sm:text-3xl ${tone}`}>
          <CountUp value={value} />
        </div>
        {icon && <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.icon}`}>{icon}</span>}
      </div>
      <div className="relative mt-1 text-sm font-medium text-slate-300">{label}</div>
      {(hint || trend) && (
        <div className="relative mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {trend && <Trend now={trend.now} prev={trend.prev} />}
          {hint && <span className="text-xs text-slate-500">{hint}</span>}
        </div>
      )}
    </>
  );
  const cls = 'glass-card relative block overflow-hidden rounded-xl px-4 py-4';
  return href ? (
    <Link
      href={href}
      className={`${cls} transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-600 hover:shadow-glass-sm motion-reduce:hover:translate-y-0`}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const shortDay = (day: string) => new Date(day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// 14 bars, one per day. Today's bar is brighter. Hover, tap or tab to a bar to see its day and number.
export function MiniBars({ data, label, accent = 'emerald' }: { data: { day: string; n: number }[]; label: string; accent?: Accent }) {
  const a = ACCENTS[accent];
  const max = Math.max(1, ...data.map((d) => d.n));
  const total = data.reduce((sum, d) => sum + d.n, 0);
  const today = data.at(-1)?.n ?? 0;
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-300">{label}</h3>
        <span className="text-xs text-slate-500">
          <span className="font-semibold text-slate-300">{total}</span> in 14 days · {today} today
        </span>
      </div>
      <div className="flex h-32 items-end gap-1 sm:gap-1.5" role="group" aria-label={`${label}: ${total} in the last 14 days`}>
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          const text = `${isToday ? 'Today' : shortDay(d.day)}: ${d.n}`;
          return (
            <button
              key={d.day}
              type="button"
              aria-label={text}
              className="group relative flex h-full flex-1 items-end rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <span
                className={`block w-full origin-bottom rounded-t-md bg-gradient-to-t transition-all duration-200 group-hover:brightness-125 group-focus:brightness-125 motion-safe:animate-grow-up ${
                  d.n > 0 ? (isToday ? `${a.barToday} shadow-glow` : a.bar) : 'from-slate-800 to-slate-800'
                }`}
                style={{ height: `${d.n > 0 ? Math.max(8, (d.n / max) * 100) : 4}%`, animationDelay: `${i * 25}ms` }}
              />
              <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 shadow-glass-sm group-hover:block group-focus:block">
                {text}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-slate-600">
        <span>{data[0] ? shortDay(data[0].day) : ''}</span>
        <span className="text-slate-400">today</span>
      </div>
    </div>
  );
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
  disabled,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  disabled?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
      <span>{total === 0 ? 'Nothing to show' : `${from}–${to} of ${total}`}</span>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary px-3 py-1.5 text-sm" disabled={disabled || page === 0} onClick={() => onPage(page - 1)}>Previous</button>
        <button type="button" className="btn-secondary px-3 py-1.5 text-sm" disabled={disabled || page + 1 >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
            value === o.value
              ? 'border-slate-100 bg-slate-100 text-slate-900'
              : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600 hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
