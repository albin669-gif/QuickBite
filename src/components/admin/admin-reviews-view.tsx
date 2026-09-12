'use client';

import React, { useState } from 'react';
import type { ReviewWithCustomer } from '@/actions/review';
import { deleteReviewAction } from '@/actions/review';
import { Star, MessageSquare, Trash2, Search, Store, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type AdminReviewItem = ReviewWithCustomer & {
  restaurant?: {
    name: string;
    city: string;
  };
};

interface Props {
  initialReviews: AdminReviewItem[];
}

export function AdminReviewsView({ initialReviews }: Props) {
  const [reviews, setReviews] = useState<AdminReviewItem[]>(initialReviews);
  const [search, setSearch] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | 'ALL'>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = reviews.filter((r) => {
    const matchesRating = selectedRating === 'ALL' || Math.round(Number(r.rating)) === selectedRating;
    const matchesSearch =
      !search ||
      r.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.restaurant?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.comment?.toLowerCase().includes(search.toLowerCase()) ||
      r.order?.order_number?.toLowerCase().includes(search.toLowerCase());

    return matchesRating && matchesSearch;
  });

  async function handleDelete(reviewId: string) {
    if (!confirm('Are you sure you want to permanently delete this customer review? The restaurant rating will be recalculated immediately.')) {
      return;
    }

    setDeletingId(reviewId);
    setActionError(null);

    const res = await deleteReviewAction(reviewId);
    if (!res.success) {
      setActionError(res.error || 'Failed to delete review.');
    } else {
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    }
    setDeletingId(null);
  }

  const avgPlatformRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-purple-400" />
            Review Moderation & Feedback ({reviews.length})
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Global customer reviews across all restaurants. Moderate abuse and review genuine customer sentiment.
          </p>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-red-950 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-stone-400 block mb-1">
            Platform Average Rating
          </span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-amber-400">{avgPlatformRating}</span>
            <div className="flex items-center gap-0.5 text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${
                    s <= Math.round(Number(avgPlatformRating))
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-stone-600'
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Calculated from genuine order deliveries</p>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-stone-400 block mb-1">
            Total Verified Reviews
          </span>
          <span className="text-2xl font-extrabold text-purple-400">{reviews.length}</span>
          <p className="text-[11px] text-stone-500 mt-1">100% verified order deliveries</p>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-stone-400 block mb-1">
            5-Star Satisfaction
          </span>
          <span className="text-2xl font-extrabold text-emerald-400">
            {reviews.length > 0
              ? Math.round(
                  (reviews.filter((r) => Math.round(Number(r.rating)) === 5).length /
                    reviews.length) *
                    100
                )
              : 0}
            %
          </span>
          <p className="text-[11px] text-stone-500 mt-1">Rated 5 out of 5 stars</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900/60 p-3 rounded-2xl border border-stone-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, restaurant, or text..."
            className="pl-9 text-xs bg-stone-950 border-stone-800 text-stone-200 placeholder:text-stone-500 h-9"
          />
        </div>

        {/* Rating Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setSelectedRating('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedRating === 'ALL'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            All Ratings
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => setSelectedRating(star)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
                selectedRating === star
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <span>{star}★</span>
            </button>
          ))}
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950/70 text-stone-400 uppercase tracking-wider text-[10px] border-b border-stone-800">
              <tr>
                <th className="py-3 px-4">Customer & Order</th>
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4">Review Content</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-500">
                    No customer reviews found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-stone-800/40 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white">{r.customer?.full_name || 'Customer'}</p>
                      <p className="text-[10px] text-stone-400 font-mono">
                        Order #{r.order?.order_number || r.order_id.slice(0, 8)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="font-semibold text-stone-200">
                          {r.restaurant?.name || 'Restaurant'}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 block">
                        {r.restaurant?.city || 'Bangalore'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <span>{r.rating}</span>
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 inline" />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      {r.comment ? (
                        <p className="text-stone-300 line-clamp-2 text-xs">{r.comment}</p>
                      ) : (
                        <span className="text-stone-500 italic text-[11px]">Rating only</span>
                      )}
                      {r.owner_reply && (
                        <p className="text-[10px] text-purple-400 mt-1 line-clamp-1">
                          ↳ Replied: &ldquo;{r.owner_reply}&rdquo;
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-stone-400 text-[11px]">
                      {new Date(r.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={deletingId === r.id}
                        onClick={() => handleDelete(r.id)}
                        className="text-red-400 border-red-900/60 hover:bg-red-950/80 hover:text-red-300 text-xs gap-1"
                        title="Delete abusive or spam review"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
