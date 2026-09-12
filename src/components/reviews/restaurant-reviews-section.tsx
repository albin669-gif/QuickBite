'use client';

import React, { useState } from 'react';
import type { ReviewWithCustomer, ReviewStats } from '@/actions/review';
import { Star, ThumbsUp, MessageSquare, CheckCircle2 } from 'lucide-react';

interface Props {
  restaurantName: string;
  initialReviews: ReviewWithCustomer[];
  stats: ReviewStats;
}

export function RestaurantReviewsSection({
  restaurantName,
  initialReviews,
  stats,
}: Props) {
  const [selectedFilter, setSelectedFilter] = useState<number | 'ALL'>('ALL');

  const filteredReviews =
    selectedFilter === 'ALL'
      ? initialReviews
      : initialReviews.filter((r) => Math.round(Number(r.rating)) === selectedFilter);

  return (
    <section className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            Verified Ratings & Reviews ({stats.totalReviews})
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Every review is written by a real customer following a verified delivery from {restaurantName}.
          </p>
        </div>
      </div>

      {/* Real Statistics & Rating Histogram */}
      {stats.totalReviews > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-stone-50 border border-stone-100 items-center">
          {/* Big Score */}
          <div className="text-center md:border-r border-stone-200 md:pr-6 space-y-1">
            <div className="text-4xl sm:text-5xl font-extrabold text-stone-900">
              {stats.averageRating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${
                    s <= Math.round(stats.averageRating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-stone-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-stone-500 font-medium">
              Based on {stats.totalReviews} verified {stats.totalReviews === 1 ? 'order' : 'orders'}
            </p>
            {stats.recommendationPercentage > 0 && (
              <p className="text-[11px] text-emerald-700 font-bold flex items-center justify-center gap-1 pt-1">
                <ThumbsUp className="w-3 h-3" />
                {stats.recommendationPercentage}% would order again
              </p>
            )}
          </div>

          {/* 5-Star Distribution Bars */}
          <div className="md:col-span-2 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.breakdown[star as 1 | 2 | 3 | 4 | 5] || 0;
              const pct = stats.percentages[star as 1 | 2 | 3 | 4 | 5] || 0;

              return (
                <button
                  type="button"
                  key={star}
                  onClick={() => setSelectedFilter(selectedFilter === star ? 'ALL' : star)}
                  className={`w-full flex items-center gap-3 text-xs p-1 rounded-lg transition text-left cursor-pointer ${
                    selectedFilter === star ? 'bg-orange-100/70' : 'hover:bg-stone-100/60'
                  }`}
                >
                  <span className="w-10 font-bold text-stone-700 shrink-0 flex items-center gap-0.5">
                    {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-stone-200 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-medium text-stone-500 shrink-0 text-[11px]">
                    {count} ({pct}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 bg-stone-50 rounded-2xl border border-stone-100 space-y-2">
          <MessageSquare className="w-8 h-8 text-stone-300 mx-auto" />
          <h3 className="text-sm font-bold text-stone-800">No Customer Reviews Yet</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Be the first customer to place an order and share your authentic dining experience!
          </p>
        </div>
      )}

      {/* Filter Chips if reviews exist */}
      {stats.totalReviews > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            onClick={() => setSelectedFilter('ALL')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedFilter === 'ALL'
                ? 'bg-orange-600 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Reviews ({stats.totalReviews})
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => setSelectedFilter(selectedFilter === star ? 'ALL' : star)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                selectedFilter === star
                  ? 'bg-orange-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>{star}</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>({stats.breakdown[star as 1 | 2 | 3 | 4 | 5] || 0})</span>
            </button>
          ))}
        </div>
      )}

      {/* Review Cards List */}
      <div className="divide-y divide-stone-100">
        {filteredReviews.map((r) => (
          <div key={r.id} className="py-5 space-y-2.5">
            {/* Reviewer Meta & Star Rating */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                  {r.customer?.full_name?.charAt(0) || 'C'}
                </div>
                <div>
                  <p className="font-bold text-stone-900 text-xs sm:text-sm">
                    {r.customer?.full_name || 'QuickBite Customer'}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified Purchase</span>
                    {r.order?.order_number && (
                      <span className="text-stone-400 font-mono text-[10px]">
                        &bull; #{r.order.order_number}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-stone-400">
                  {new Date(r.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Comment */}
            {r.comment && (
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed pl-10">
                {r.comment}
              </p>
            )}

            {/* Restaurant Owner Reply if present */}
            {r.owner_reply && (
              <div className="ml-10 mt-3 p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/80 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-orange-950 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-orange-600" />
                    Response from {restaurantName}
                  </span>
                  {r.owner_replied_at && (
                    <span className="text-[10px] text-orange-800/70">
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
          </div>
        ))}
      </div>
    </section>
  );
}
