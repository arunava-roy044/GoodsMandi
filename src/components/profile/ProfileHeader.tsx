type Profile = {
  name: string | null;
  year_of_study: number | null;
  branch_course: string | null;
  profile_photo_url: string | null;
  verified: boolean | null;
  rating_avg: number | string | null;
  total_items_sold: number | null;
  warning_count: number | null;
};

interface ProfileHeaderProps {
  profile: Profile;
  activeListingCount: number;
  /** Only shown on your own profile */
  email?: string;
  /** Your own profile shows the warning count; others only see a clean record badge */
  isOwn?: boolean;
}

export default function ProfileHeader({ profile, activeListingCount, email, isOwn = false }: ProfileHeaderProps) {
  const name = profile.name?.trim() || 'Student';
  // NUMERIC columns can arrive as strings; normalise before formatting
  const rating = Number(profile.rating_avg ?? 0);
  const warnings = profile.warning_count ?? 0;
  const studyLine = [
    profile.year_of_study ? `Year ${profile.year_of_study}` : null,
    profile.branch_course?.trim() || null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="glass-card p-5 sm:p-8">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8">
        <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center">
          {profile.profile_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.profile_photo_url} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl font-semibold text-slate-300">{name.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white break-words">{name}</h1>
            {profile.verified && (
              <span className="badge-success gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Verified student
              </span>
            )}
          </div>

          {studyLine && <p className="text-slate-300">{studyLine}</p>}
          {email && <p className="text-sm text-slate-500 truncate mt-0.5">{email}</p>}

          <dl className="mt-5 grid grid-cols-3 gap-2 sm:max-w-md">
            <div className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-center">
              <dt className="text-xs text-slate-400">Rating</dt>
              <dd className="text-lg font-semibold text-white flex items-center justify-center gap-1">
                {rating > 0 ? (
                  <>
                    <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    {rating.toFixed(1)}
                  </>
                ) : (
                  <span className="text-sm font-normal text-slate-400">None yet</span>
                )}
              </dd>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-center">
              <dt className="text-xs text-slate-400">Sold</dt>
              <dd className="text-lg font-semibold text-white">{profile.total_items_sold ?? 0}</dd>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-center">
              <dt className="text-xs text-slate-400">For sale</dt>
              <dd className="text-lg font-semibold text-brand-400">{activeListingCount}</dd>
            </div>
          </dl>

          <div className="mt-4 flex justify-center sm:justify-start">
            {warnings === 0 ? (
              <span className="badge-success gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                No reports on record
              </span>
            ) : (
              isOwn && (
                <span className="badge-warning">
                  {warnings} of 3 warnings. At 3 your account is restricted.
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
