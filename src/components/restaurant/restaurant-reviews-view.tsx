'use client';

import React, { useState } from 'react';
import type { ReviewWithCustomer } from '@/actions/review';
import { replyToReviewAction } from '@/actions/review';
import { Star, MessageSquare, CheckCircle2, CornerDownRight, AlertCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  restaurantId: string;
  restaurantName: string;
  initialReviews: ReviewWithCustomer[];
}

export function RestaurantReviewsView({
  restaurantName,
  initialReviews,
}: Props) {
  const [reviews, setReviews] = useState<ReviewWithCustomer[]>(initialReviews);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [loadingReply, setLoadingReply] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | 'ALL'>('ALL');

  const filtered =
    selectedRatingFilter === 'ALL'
      ? reviews
      : reviews.filter((r) => Math.round(Number(r.rating)) === selectedRatingFilter);

  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / totalReviews).toFixed(1)
      : '0.0';

  async function handleSendReply(reviewId: string) {
    if (!replyText.trim()) return;
    setLoadingReply(true);
    setActionError(null);

    const res = await replyToReviewAction({
      reviewId,
      replyText: replyText.trim(),
    });

    if (!res.success) {
      setActionError(res.error || 'Failed to post reply.');
    } else {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                owner_reply: replyText.trim(),
                owner_replied_at: new Date().toISOString(),
              }
            : r
        )
      );
      setReplyingId(null);
      setReplyText('');
    }
    setLoadingReply(false);
  }

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
            <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
            Customer Reviews & Feedback ({totalReviews})
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Real customer reviews for {restaurantName}. Respond to feedback and build customer trust.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-orange-50/70 border border-orange-200/80 p-3.5 rounded-2xl shrink-0">
          <div className="text-center">
            <div className="text-2xl font-extrabold text-stone-900 flex items-center justify-center gap-1">
              <span>{avgRating}</span>
              <Star className="w-5 h-5 fill-amber-400 text-amber-400 inline" />
            </div>
            <span className="text-[10px] font-bold text-orange-900/70 uppercase tracking-wider">
              Average Rating
            </span>
          </div>
          <div className="h-8 w-px bg-orange-200" />
          <div className="text-center">
            <div className="text-2xl font-extrabold text-stone-900">{totalReviews}</div>
            <span className="text-[10px] font-bold text-orange-900/70 uppercase tracking-wider">
              Total Reviews
            </span>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedRatingFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            selectedRatingFilter === 'ALL'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          All ({totalReviews})
        </button>
        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            onClick={() => setSelectedRatingFilter(star)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              selectedRatingFilter === star
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            <span>{star}</span>
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-stone-400">
              ({reviews.filter((r) => Math.round(Number(r.rating)) === star).length})
            </span>
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center space-y-2">
            <MessageSquare className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="text-sm font-bold text-stone-800">No Reviews Found</h3>
            <p className="text-xs text-stone-500">
              {selectedRatingFilter === 'ALL'
                ? 'No customers have reviewed this restaurant yet.'
                : `No reviews found with ${selectedRatingFilter} stars.`}
            </p>
          </div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4 hover:border-stone-300 transition"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-stone-100 text-stone-700 font-bold flex items-center justify-center text-xs">
                    {r.customer?.full_name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <span className="font-bold text-stone-900 text-sm">
                      {r.customer?.full_name || 'Customer'}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-stone-400">
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified Order #{r.order?.order_number}
                      </span>
                      <span>&bull;</span>
                      <span>
                        {new Date(r.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-bold text-stone-800 ml-1.5">{r.rating}.0</span>
                </div>
              </div>

              {/* Comment */}
              {r.comment && (
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed bg-stone-50/60 p-3.5 rounded-2xl border border-stone-100">
                  {r.comment}
                </p>
              )}

              {/* Existing Owner Reply */}
              {r.owner_reply && (
                <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/70 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-orange-950 flex items-center gap-1.5">
                      <CornerDownRight className="w-3.5 h-3.5 text-orange-600" />
                      Your Official Response
                    </span>
                    {r.owner_replied_at && (
                      <span className="text-[10px] text-orange-800/60">
                        {new Date(r.owner_replied_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-stone-700 pl-5">{r.owner_reply}</p>
                </div>
              )}

              {/* Reply Button or Textarea */}
              <div className="pt-2 flex justify-end">
                {replyingId === r.id ? (
                  <div className="w-full space-y-2 pt-2 border-t border-stone-100">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Write a polite response to ${r.customer?.full_name || 'the customer'}...`}
                      rows={2}
                      className="w-full p-3 rounded-xl border border-stone-300 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyingId(null);
                          setReplyText('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        isLoading={loadingReply}
                        onClick={() => handleSendReply(r.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"
                      >
                        <Send className="w-3 h-3" /> Post Response
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReplyingId(r.id);
                      setReplyText(r.owner_reply || '');
                    }}
                    className="text-xs gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {r.owner_reply ? 'Edit Response' : 'Reply to Review'}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
