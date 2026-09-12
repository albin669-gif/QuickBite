'use client';

import React, { useState } from 'react';
import { Star, AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { submitReviewAction } from '@/actions/review';

interface Props {
  orderId: string;
  orderNumber: string;
  restaurantName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const RATING_DESCRIPTIONS = [
  'Select a rating',
  '1 Star - Poor experience',
  '2 Stars - Fair, could be better',
  '3 Stars - Good meal',
  '4 Stars - Very good food & service',
  '5 Stars - Outstanding & delicious!',
];

export function ReviewFormModal({
  orderId,
  orderNumber,
  restaurantName,
  onSuccess,
  onCancel,
}: Props) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const activeStar = hoverRating || rating;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5 stars.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await submitReviewAction({
      orderId,
      rating,
      comment: comment.trim(),
    });

    if (!res.success) {
      setError(res.error || 'Failed to submit review.');
      setLoading(false);
    } else {
      setSubmitted(true);
      setLoading(false);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1200);
    }
  }

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-emerald-950">Thank You for Your Review!</h3>
        <p className="text-xs text-emerald-800">
          Your feedback has been verified and published to {restaurantName}&apos;s profile.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
      <div className="border-b border-stone-100 pb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
          Verified Order Review
        </span>
        <h3 className="text-base font-extrabold text-stone-900 mt-1">
          How was your meal from {restaurantName}?
        </h3>
        <p className="text-xs text-stone-400">Order #{orderNumber}</p>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Star Selector */}
      <div className="space-y-1.5 text-center py-2">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="p-1 text-stone-300 hover:text-amber-400 transition transform hover:scale-110 focus:outline-none cursor-pointer"
              title={`${star} Star`}
            >
              <Star
                className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                  star <= activeStar ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                }`}
              />
            </button>
          ))}
        </div>
        <p className="text-xs font-semibold text-stone-700">
          {RATING_DESCRIPTIONS[activeStar] || 'Select your rating'}
        </p>
      </div>

      {/* Review Comment Textarea */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-orange-600" />
            Detailed Review (Optional)
          </span>
          <span className="text-[10px] text-stone-400 font-normal">
            {comment.length}/1000 characters
          </span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell others what you loved! Mention favorite dishes, taste, packaging, or freshness..."
          maxLength={1000}
          rows={3}
          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="sm"
          isLoading={loading}
          className="font-bold"
        >
          Submit Verified Review
        </Button>
      </div>
    </form>
  );
}
