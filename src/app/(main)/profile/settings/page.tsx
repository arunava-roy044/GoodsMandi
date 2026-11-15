'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/lib/utils';
import { PHOTO_CACHE_SECONDS, PHOTO_PICK_MAX_MB, STORAGE_MAX_BYTES, prepareImage } from '@/lib/images';
import { Modal } from '@/components/ui/Modal';

const PHOTO_BUCKET = 'profile-photos';
// Profile photos show at most 80px wide; 512px stays sharp on high-density screens
const PROFILE_PHOTO_MAX_SIDE = 512;
const NAME_MAX = 60;
const BRANCH_MAX = 60;
const YEARS = [1, 2, 3, 4, 5];

type ProfileForm = {
  name: string;
  year_of_study: number | null;
  branch_course: string;
  profile_photo_url: string | null;
};

function SettingsRow({ href, onClick, children, danger = false }: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  const className = `flex w-full items-center justify-between px-4 py-3.5 text-left text-sm transition-colors hover:bg-slate-800/60 ${
    danger ? 'text-red-400' : 'text-slate-200'
  }`;
  const chevron = !danger && (
    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
        {chevron}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
      {chevron}
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [supabase] = useState(() => createClient());

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [saved, setSaved] = useState<ProfileForm | null>(null);
  const [form, setForm] = useState<ProfileForm>({ name: '', year_of_study: null, branch_course: '', profile_photo_url: null });
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const photoPreview = useMemo(() => (newPhoto ? URL.createObjectURL(newPhoto) : null), [newPhoto]);
  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login?next=/profile/settings');
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? '');

      const [{ data, error }, { data: admin }] = await Promise.all([
        supabase
          .from('profiles')
          .select('name, year_of_study, branch_course, profile_photo_url')
          .eq('id', user.id)
          .single(),
        supabase.rpc('is_admin'),
      ]);

      if (error || !data) {
        setError("Couldn't load your profile. Refresh to try again.");
      } else {
        const loaded: ProfileForm = {
          name: data.name ?? '',
          year_of_study: data.year_of_study,
          branch_course: data.branch_course ?? '',
          profile_photo_url: data.profile_photo_url,
        };
        setSaved(loaded);
        setForm(loaded);
        setIsAdmin(admin === true);
      }
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  const dirty =
    !!saved &&
    (newPhoto !== null ||
      form.name.trim() !== saved.name ||
      form.year_of_study !== saved.year_of_study ||
      form.branch_course.trim() !== saved.branch_course);

  const pickPhoto = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Choose an image file.');
    if (file.size > PHOTO_PICK_MAX_MB * 1024 * 1024) return setError(`Photo must be under ${PHOTO_PICK_MAX_MB} MB.`);
    setNewPhoto(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !saved) return;
    setError(null);

    const name = form.name.trim();
    if (name.length < 2) return setError('Enter your name.');

    setSaving(true);
    let uploadedPath: string | null = null;
    try {
      let photoUrl = form.profile_photo_url;
      if (newPhoto) {
        const image = await prepareImage(newPhoto, PROFILE_PHOTO_MAX_SIDE);
        if (image.body.size > STORAGE_MAX_BYTES) throw new Error('That photo is too large. Try a JPEG or PNG under 5 MB.');
        uploadedPath = `${userId}/${crypto.randomUUID()}.${image.extension}`;
        const { error: uploadError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(uploadedPath, image.body, { contentType: image.contentType, cacheControl: PHOTO_CACHE_SECONDS });
        if (uploadError) throw uploadError;
        photoUrl = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
      }

      const updates = {
        name,
        year_of_study: form.year_of_study,
        branch_course: form.branch_course.trim() || null,
        profile_photo_url: photoUrl,
      };
      const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', userId);
      if (updateError) throw updateError;

      const next: ProfileForm = { ...updates, branch_course: updates.branch_course ?? '' };
      setSaved(next);
      setForm(next);
      setNewPhoto(null);
      showToast('Profile saved', 'success');
      router.refresh();
    } catch (err) {
      if (uploadedPath) await supabase.storage.from(PHOTO_BUCKET).remove([uploadedPath]);
      setError(errorMessage(err, "Couldn't save your profile. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    // Deletes the account with its listings, offers, messages and ratings
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      setDeleting(false);
      showToast(errorMessage(error, "Couldn't delete your account. Please try again."), 'error');
      return;
    }
    await supabase.auth.signOut();
    router.replace('/');
    router.refresh();
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Logged out', 'success');
    router.push('/');
    router.refresh();
  };

  const shownPhoto = photoPreview ?? form.profile_photo_url;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/profile" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Back to profile">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
      </div>

      {/* Profile details */}
      <section className="glass-card p-5 sm:p-6">
        <h2 className="text-sm font-medium text-slate-400 mb-4">Profile</h2>

        {loading ? (
          <div className="space-y-4" aria-busy="true">
            <div className="skeleton h-20 w-20 rounded-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {error && (
              <div role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <fieldset disabled={saving} className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center">
                  {shownPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shownPhoto} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-semibold text-slate-300">{form.name.charAt(0).toUpperCase() || '?'}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="btn-secondary cursor-pointer text-sm px-3 py-1.5">
                    {shownPhoto ? 'Change photo' : 'Add photo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        pickPhoto(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {newPhoto && (
                    <button type="button" onClick={() => setNewPhoto(null)} className="text-xs text-slate-400 hover:text-white text-left">
                      Undo
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-200">Name</label>
                <input
                  id="name"
                  type="text"
                  maxLength={NAME_MAX}
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <span id="year-label" className="text-sm font-medium text-slate-200">Year of study</span>
                <div role="radiogroup" aria-labelledby="year-label" className="flex flex-wrap gap-2">
                  {YEARS.map((year) => (
                    <button
                      key={year}
                      type="button"
                      role="radio"
                      aria-checked={form.year_of_study === year}
                      onClick={() => setForm({ ...form, year_of_study: year })}
                      className={`h-10 w-12 rounded-md border text-sm transition-colors ${
                        form.year_of_study === year
                          ? 'border-brand-500 bg-brand-500/10 text-white'
                          : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="branch" className="text-sm font-medium text-slate-200">Branch / course</label>
                <input
                  id="branch"
                  type="text"
                  maxLength={BRANCH_MAX}
                  placeholder="e.g. B.Tech CSE"
                  className="input-field"
                  value={form.branch_course}
                  onChange={(e) => setForm({ ...form, branch_course: e.target.value })}
                />
              </div>
            </fieldset>

            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={!dirty || saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Account */}
      <section className="glass-card overflow-hidden">
        <h2 className="px-4 pt-4 pb-2 text-sm font-medium text-slate-400">Account</h2>
        <div className="px-4 pb-3 text-sm">
          <div className="text-slate-500 text-xs">College email</div>
          <div className="text-slate-200 truncate">{email || ' '}</div>
        </div>
        <div className="divide-y divide-slate-800 border-t border-slate-800">
          <SettingsRow href="/listings/my">My listings</SettingsRow>
          <SettingsRow href="/reset-password">Change password</SettingsRow>
          {isAdmin && <SettingsRow href="/admin">Admin dashboard</SettingsRow>}
          <SettingsRow href="/terms">Terms of Service</SettingsRow>
          <SettingsRow onClick={handleLogout} danger>Log out</SettingsRow>
          <SettingsRow onClick={() => { setDeleteText(''); setDeleteOpen(true); }} danger>Delete account</SettingsRow>
        </div>
      </section>

      <Modal isOpen={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title="Delete your account?">
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            This permanently deletes your profile, your listings, your offers, your messages and your ratings.
            It can&apos;t be undone.
          </p>
          <label htmlFor="delete-confirm" className="block text-slate-400">
            Type <span className="font-mono text-white">DELETE</span> to confirm
          </label>
          <input
            id="delete-confirm"
            type="text"
            autoComplete="off"
            className="input-field"
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            disabled={deleting}
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary bg-red-600 hover:bg-red-500"
              onClick={handleDeleteAccount}
              disabled={deleteText !== 'DELETE' || deleting}
            >
              {deleting ? 'Deleting...' : 'Delete account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
