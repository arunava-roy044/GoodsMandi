'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LISTING_CATEGORIES,
  MIN_BID_PERCENTAGE,
  PRODUCT_AGE_BRACKETS,
  PRODUCT_AGE_CUSTOM_MAX_LENGTH,
  PRODUCT_AGE_OTHER,
  PROHIBITED_KEYWORDS,
} from '@/lib/constants';
import PhotoUpload from '@/components/listings/PhotoUpload';
import { errorMessage, formatPrice } from '@/lib/utils';

const TITLE_MIN = 3;
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 300;
const PRICE_MAX = 500000;
const PHOTO_BUCKET = 'listing-photos';

// Whole-word match, so "drum" doesn't trip "rum" and "begun" doesn't trip "gun"
function findFlaggedWords(text: string): string[] {
  const lower = text.toLowerCase();
  return PROHIBITED_KEYWORDS.filter((keyword) => {
    const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}s?\\b`).test(lower);
  });
}

function fileExtension(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop() : '';
  const fromType = file.type.split('/')[1];
  return (fromName || fromType || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
}

function chipClass(active: boolean) {
  return `px-3 py-2 rounded-md border text-sm text-left transition-colors ${
    active
      ? 'border-brand-500 bg-brand-500/10 text-white'
      : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500 hover:text-white'
  }`;
}

export default function CreateListingPage() {
  const router = useRouter();
  const topRef = useRef<HTMLDivElement>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('');
  const [askingPrice, setAskingPrice] = useState('');
  const [productAge, setProductAge] = useState<string>('');
  const [customProductAge, setCustomProductAge] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Words the seller has already been warned about and chose to keep
  const [acknowledgedWords, setAcknowledgedWords] = useState<string | null>(null);

  const price = Number(askingPrice);
  const priceIsValid = askingPrice !== '' && Number.isInteger(price) && price > 0 && price <= PRICE_MAX;
  const flaggedWords = findFlaggedWords(`${title} ${description}`);
  const flaggedKey = flaggedWords.join(',');

  const showError = (message: string): false => {
    setError(message);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return false;
  };

  const validate = (): boolean => {
    if (photos.length === 0) return showError('Add at least one photo.');
    if (title.trim().length < TITLE_MIN) return showError(`Give your item a title of at least ${TITLE_MIN} characters.`);
    if (!category) return showError('Pick a category.');
    if (!priceIsValid) return showError(`Enter a price in whole rupees, between ₹1 and ${formatPrice(PRICE_MAX)}.`);
    if (!productAge) return showError('Pick how old the item is.');
    if (productAge === PRODUCT_AGE_OTHER && customProductAge.trim().length === 0) {
      return showError('Type how old the item is.');
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    // Ask once before publishing a listing with flagged words
    if (flaggedWords.length > 0 && acknowledgedWords !== flaggedKey) {
      setAcknowledgedWords(flaggedKey);
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const uploadedPaths: string[] = [];

    try {
      setStatus('Checking your account...');
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) throw new Error('Your session has expired. Log in again to post.');
      const userId = userData.user.id;

      const { data: profile } = await supabase.from('profiles').select('banned').eq('id', userId).single();
      if (profile?.banned) throw new Error('Your account is restricted from creating listings.');

      const photoUrls: string[] = [];
      for (const [index, file] of photos.entries()) {
        setStatus(`Uploading photo ${index + 1} of ${photos.length}...`);
        const filePath = `${userId}/${crypto.randomUUID()}.${fileExtension(file)}`;
        const { error: uploadError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(filePath, file, { contentType: file.type || undefined });
        if (uploadError) throw new Error(`Photo ${index + 1} didn't upload: ${uploadError.message}`);
        uploadedPaths.push(filePath);
        photoUrls.push(supabase.storage.from(PHOTO_BUCKET).getPublicUrl(filePath).data.publicUrl);
      }

      setStatus('Publishing...');
      const { data: newListing, error: insertError } = await supabase
        .from('listings')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          category,
          asking_price: price,
          product_age: productAge === PRODUCT_AGE_OTHER ? customProductAge.trim() : productAge,
          photos: photoUrls,
          seller_id: userId,
          status: 'active',
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      router.push(`/listings/${newListing.id}`);
      router.refresh();
    } catch (err) {
      // Don't leave orphaned photos in storage when the listing wasn't created
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(PHOTO_BUCKET).remove(uploadedPaths);
      }
      showError(errorMessage(err, "Couldn't publish your listing. Please try again."));
      setLoading(false);
      setStatus('');
    }
  };

  const showFlagWarning = flaggedWords.length > 0 && acknowledgedWords === flaggedKey;

  return (
    <div ref={topRef} className="max-w-2xl mx-auto scroll-mt-24">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1">Sell an item</h1>
        <p className="text-sm text-slate-400">Takes about a minute. Buyers on campus will send you offers.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="glass-card p-5 sm:p-6 space-y-7">
        {error && (
          <div role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {showFlagWarning && (
          <div role="alert" className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Your listing mentions <strong>{flaggedWords.join(', ')}</strong>, which may break the{' '}
            <Link href="/terms" className="underline">community rules</Link>. Edit it, or press Publish again to post it
            anyway. It may be reviewed or removed.
          </div>
        )}

        <fieldset disabled={loading} className="space-y-7">
          {/* Photos */}
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-slate-200">Photos</h2>
            <p className="text-xs text-slate-500 -mt-1">The first photo is the cover. Clear, well-lit photos sell faster.</p>
            <PhotoUpload photos={photos} onChange={setPhotos} disabled={loading} />
          </section>

          {/* Title */}
          <section className="space-y-2">
            <div className="flex items-baseline justify-between">
              <label htmlFor="title" className="text-sm font-medium text-slate-200">Title</label>
              <span className="text-xs text-slate-500">{title.length}/{TITLE_MAX}</span>
            </div>
            <input
              id="title"
              type="text"
              maxLength={TITLE_MAX}
              placeholder="e.g. Casio fx-991ES Plus calculator"
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </section>

          {/* Category */}
          <section className="space-y-2">
            <h2 id="category-label" className="text-sm font-medium text-slate-200">Category</h2>
            <div role="radiogroup" aria-labelledby="category-label" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LISTING_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="radio"
                  aria-checked={category === cat}
                  onClick={() => setCategory(cat)}
                  className={chipClass(category === cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>

          {/* Price */}
          <section className="space-y-2">
            <label htmlFor="price" className="text-sm font-medium text-slate-200">Price</label>
            <div className="relative sm:w-56">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
              <input
                id="price"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="500"
                className="input-field pl-7"
                value={askingPrice}
                // Digits only: no decimals, minus signs or scroll-wheel surprises
                onChange={(e) => setAskingPrice(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
            <p className="text-xs text-slate-500">
              {priceIsValid
                ? `Buyers can offer from ${formatPrice(Math.ceil(price * MIN_BID_PERCENTAGE))} (${Math.round(MIN_BID_PERCENTAGE * 100)}% of your price). You pick which offer to accept.`
                : `Buyers can offer down to ${Math.round(MIN_BID_PERCENTAGE * 100)}% of your price. You pick which offer to accept.`}
            </p>
          </section>

          {/* Age */}
          <section className="space-y-2">
            <h2 id="age-label" className="text-sm font-medium text-slate-200">How old is it?</h2>
            <div role="radiogroup" aria-labelledby="age-label" className="flex flex-wrap gap-2">
              {[...PRODUCT_AGE_BRACKETS, PRODUCT_AGE_OTHER].map((age) => (
                <button
                  key={age}
                  type="button"
                  role="radio"
                  aria-checked={productAge === age}
                  onClick={() => setProductAge(age)}
                  className={chipClass(productAge === age)}
                >
                  {age === PRODUCT_AGE_OTHER ? 'Other' : age}
                </button>
              ))}
            </div>
            {productAge === PRODUCT_AGE_OTHER && (
              <input
                type="text"
                maxLength={PRODUCT_AGE_CUSTOM_MAX_LENGTH}
                placeholder="e.g. 3 years, or 2 weeks"
                aria-label="How old is it"
                className="input-field sm:w-72"
                value={customProductAge}
                onChange={(e) => setCustomProductAge(e.target.value)}
                autoFocus
              />
            )}
          </section>

          {/* Description */}
          <section className="space-y-2">
            <div className="flex items-baseline justify-between">
              <label htmlFor="description" className="text-sm font-medium text-slate-200">
                Short description <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <span className="text-xs text-slate-500">{description.length}/{DESCRIPTION_MAX}</span>
            </div>
            <textarea
              id="description"
              rows={3}
              maxLength={DESCRIPTION_MAX}
              placeholder="e.g. Good condition, minor scratches. Can meet near the library after 4 pm."
              className="input-field resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </section>
        </fieldset>

        <div className="pt-5 border-t border-slate-800 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          {loading && <span className="text-sm text-slate-400 sm:mr-auto" aria-live="polite">{status}</span>}
          <Link href="/listings" className={`btn-ghost text-center ${loading ? 'pointer-events-none opacity-50' : ''}`}>
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Publishing...' : showFlagWarning ? 'Publish anyway' : 'Publish listing'}
          </button>
        </div>
      </form>
    </div>
  );
}
