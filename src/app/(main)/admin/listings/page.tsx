import ListingsManager from '@/components/admin/ListingsManager';

const FILTERS = ['all', 'active', 'flagged', 'sold', 'removed', 'expired'] as const;

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { filter, q } = await searchParams;
  const initialFilter = (FILTERS as readonly string[]).includes(filter ?? '') ? (filter as (typeof FILTERS)[number]) : 'all';
  return <ListingsManager initialFilter={initialFilter} initialQuery={q ?? ''} />;
}
