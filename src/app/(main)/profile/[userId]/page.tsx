import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ListingCard from '@/components/listings/ListingCard';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OtherUserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  // A malformed id would otherwise surface as a database error
  if (!UUID_PATTERN.test(userId)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Your own public profile is the same page as /profile
  if (user?.id === userId) redirect('/profile');

  const [profileRes, listingsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, year_of_study, branch_course, profile_photo_url, verified, rating_avg, total_items_sold, warning_count')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('listings')
      .select('id, title, description, asking_price, category, product_age, photos, created_at')
      .eq('seller_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ]);

  const profile = profileRes.data;
  if (!profile) notFound();

  const listings = listingsRes.data ?? [];
  const firstName = (profile.name?.trim() || 'This student').split(/\s+/)[0];
  const seller = {
    id: profile.id,
    name: profile.name ?? 'Student',
    profile_photo_url: profile.profile_photo_url ?? '',
    rating_avg: Number(profile.rating_avg ?? 0),
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <ProfileHeader profile={profile} activeListingCount={listings.length} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">For sale by {firstName}</h2>

        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={{ ...listing, seller }} />
            ))}
          </div>
        ) : (
          <div className="glass-card px-4 py-10 text-center">
            <p className="text-slate-400 mb-4">{firstName} has nothing for sale right now.</p>
            <Link href="/listings" className="btn-secondary">Browse other listings</Link>
          </div>
        )}
      </section>
    </div>
  );
}
