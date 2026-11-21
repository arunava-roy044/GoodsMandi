import Link from 'next/link';

export function Stat({
  label,
  value,
  hint,
  href,
  tone = 'text-white',
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  tone?: string;
}) {
  const body = (
    <>
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-300">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </>
  );
  const cls = 'glass-card block rounded-lg px-4 py-4';
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-slate-600`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

// 14 small bars, one per day, with the day and the number on hover
export function MiniBars({ data, label }: { data: { day: string; n: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  const total = data.reduce((sum, d) => sum + d.n, 0);
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-slate-300">{label}</h3>
        <span className="text-xs text-slate-500">{total} in 14 days</span>
      </div>
      <div className="flex h-24 items-end gap-1" role="img" aria-label={`${label}: ${total} in the last 14 days`}>
        {data.map((d) => (
          <div key={d.day} className="flex h-full flex-1 items-end" title={`${new Date(d.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ${d.n}`}>
            <div
              className={`w-full rounded-sm ${d.n > 0 ? 'bg-emerald-500/70' : 'bg-slate-800'}`}
              style={{ height: `${d.n > 0 ? Math.max(8, (d.n / max) * 100) : 4}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-600">
        <span>{data[0] ? new Date(data[0].day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>
        <span>today</span>
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
