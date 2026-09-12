'use client';

import React, { useState, useRef } from 'react';
import { uploadImage } from '@/actions/storage';
import { UploadCloud, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  name: string;
  label: string;
  defaultValue?: string | null;
  folder?: 'restaurants' | 'menu';
}

export function ImageUploader({ name, label, defaultValue, folder = 'menu' }: Props) {
  const [imageUrl, setImageUrl] = useState<string>(defaultValue || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    const res = await uploadImage(formData, folder);
    if (!res.success || !res.url) {
      setError(res.error || 'Failed to upload image. You may enter a direct image URL instead.');
    } else {
      setImageUrl(res.url);
    }
    setUploading(false);
  }

  return (
    <div className="w-full space-y-2">
      <label className="block text-sm font-medium text-stone-700">{label}</label>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Preview Thumbnail */}
        <div className="w-24 h-24 rounded-xl border border-stone-200 bg-stone-100 overflow-hidden flex items-center justify-center shrink-0 relative group">
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={() => setError('Invalid image URL')}
            />
          ) : (
            <ImageIcon className="w-8 h-8 text-stone-400" />
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 space-y-2 w-full">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              isLoading={uploading}
            >
              <UploadCloud className="w-4 h-4 mr-1.5" /> Upload Photo
            </Button>
            {imageUrl && (
              <span className="text-xs text-emerald-600 inline-flex items-center gap-1 font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Photo Attached
              </span>
            )}
          </div>

          {/* Or Manual URL Input */}
          <div className="relative">
            <input
              type="text"
              name={name}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Or paste image URL (e.g. Unsplash / CDN)"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}
    </div>
  );
}
