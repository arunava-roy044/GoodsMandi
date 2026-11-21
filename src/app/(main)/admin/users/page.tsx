import UsersTable from '@/components/admin/UsersTable';

const FILTERS = ['all', 'new', 'warned', 'banned', 'admins'] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { filter, q } = await searchParams;
  const initialFilter = (FILTERS as readonly string[]).includes(filter ?? '') ? (filter as (typeof FILTERS)[number]) : 'all';
  return <UsersTable initialFilter={initialFilter} initialQuery={q ?? ''} />;
}
