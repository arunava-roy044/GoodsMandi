'use client';

import { useEffect, useMemo, useState } from 'react';
import { MAX_PHOTOS_PER_LISTING } from '@/lib/constants';
import { PHOTO_PICK_MAX_MB } from '@/lib/images';

interface PhotoUploadProps {
  photos: File[];
  onChange: (photos: File[]) => void;
  disabled?: boolean;
}

const MAX_PHOTOS = MAX_PHOTOS_PER_LISTING;
// Photos are shrunk before upload, so big camera originals are fine
const MAX_SIZE_MB = PHOTO_PICK_MAX_MB;

export default function PhotoUpload({ photos, onChange, disabled = false }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One preview URL per file, created once and released when the file is removed
  const previews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const addFiles = (files: FileList | File[]) => {
    setError(null);
    const problems: string[] = [];
    const accepted: File[] = [];
    const room = MAX_PHOTOS - photos.length;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        problems.push(`${file.name} isn't an image.`);
      } else if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        problems.push(`${file.name} is over ${MAX_SIZE_MB} MB.`);
      } else if (accepted.length >= room) {
        problems.push(`Only ${MAX_PHOTOS} photos allowed, so some were left out.`);
        break;
      } else {
        accepted.push(file);
      }
    }

    if (accepted.length > 0) onChange([...photos, ...accepted]);
    if (problems.length > 0) setError(problems.join(' '));
  };

  const removePhoto = (index: number) => {
    setError(null);
    onChange(photos.filter((_, i) => i !== index));
  };

  const makeMain = (index: number) => {
    const reordered = [...photos];
    const [chosen] = reordered.splice(index, 1);
    onChange([chosen, ...reordered]);
  };

  return (
    <div className="space-y-3">
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {photos.map((photo, index) => (
            <li
              key={previews[index]}
              className={`relative aspect-square rounded-md overflow-hidden bg-slate-800 border ${
                index === 0 ? 'border-brand-500' : 'border-slate-700'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={previews[index]} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                disabled={disabled}
                className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white hover:bg-red-600"
                aria-label={`Remove photo ${index + 1}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {index === 0 ? (
                <span className="absolute bottom-0 inset-x-0 bg-brand-600 py-0.5 text-center text-[11px] font-medium text-white">
                  Cover
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeMain(index)}
                  disabled={disabled}
                  className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5 text-center text-[11px] text-white hover:bg-black/80"
                >
                  Make cover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {photos.length < MAX_PHOTOS && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (!disabled && e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 text-center transition-colors cursor-pointer ${
            photos.length > 0 ? 'py-4' : 'py-8'
          } ${
            isDragging
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-slate-700 bg-slate-950 hover:border-slate-500'
          }`}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={disabled}
            className="sr-only"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
              // Reset so picking the same file again still triggers a change
              e.target.value = '';
            }}
          />
          <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium text-white">
            {photos.length > 0 ? 'Add more photos' : 'Add photos'}
          </span>
          <span className="text-xs text-slate-500">
            Tap to choose or drag here. Up to {MAX_PHOTOS}, {MAX_SIZE_MB} MB each.
            {photos.length > 0 && ` ${MAX_PHOTOS - photos.length} left.`}
          </span>
        </label>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
