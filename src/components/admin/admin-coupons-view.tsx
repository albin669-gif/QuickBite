'use client';

import React, { useState } from 'react';
import type { Coupon } from '@/types/database.types';
import { createAdminCoupon, toggleCouponActive } from '@/actions/admin';
import { Tags, Plus, X, CheckCircle2, ShieldAlert, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  initialCoupons: Coupon[];
}

export function AdminCouponsView({ initialCoupons }: Props) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleToggle(coupon: Coupon) {
    const nextState = !coupon.is_active;
    const res = await toggleCouponActive(coupon.id, nextState);
    if (!res.success) {
      alert(res.error || 'Failed to update coupon status.');
    } else {
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: nextState } : c))
      );
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await createAdminCoupon(formData);

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to create coupon.');
    } else {
      setShowModal(false);
      window.location.reload();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Tags className="w-6 h-6 text-purple-400" />
            Promotional Coupons ({coupons.length})
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Configure discount rules, expiry dates, and order minimum thresholds.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coupon</span>
        </Button>
      </div>

      {/* Coupons Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/80 text-stone-400 uppercase tracking-wider text-[10px] border-b border-stone-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Code & Description</th>
                <th className="py-3.5 px-4 font-semibold">Discount Rule</th>
                <th className="py-3.5 px-4 font-semibold">Usage & Minimum</th>
                <th className="py-3.5 px-4 font-semibold">Valid Period</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 text-stone-300">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-stone-500">
                    No promotional coupons created yet.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-800/40 transition">
                    <td className="py-4 px-4">
                      <div>
                        <span className="font-extrabold text-white text-sm tracking-wider px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60 font-mono">
                          {c.code}
                        </span>
                        <p className="text-[11px] text-stone-400 mt-1">{c.description || 'General promotion'}</p>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div>
                        <span className="font-bold text-white">
                          {c.discount_type === 'PERCENTAGE'
                            ? `${c.discount_value}% OFF`
                            : `₹${c.discount_value} FLAT`}
                        </span>
                        {c.max_discount_amount && (
                          <p className="text-[10px] text-stone-500">Max ₹{c.max_discount_amount}</p>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div>
                        <span className="text-stone-300">Used {c.times_used} times</span>
                        <p className="text-[10px] text-stone-500">Min Order: ₹{c.min_order_amount}</p>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-stone-400">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-stone-500" />
                        Expires{' '}
                        {new Date(c.valid_until).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          c.is_active
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-stone-800 text-stone-400 border border-stone-700'
                        }`}
                      >
                        {c.is_active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3 h-3" />
                            <span>Disabled</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <Button
                        size="sm"
                        variant={c.is_active ? 'outline' : 'primary'}
                        onClick={() => handleToggle(c)}
                        className="text-xs"
                      >
                        {c.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h2 className="text-base font-extrabold text-white">Create New Coupon</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Coupon Code</label>
                <Input
                  name="code"
                  placeholder="e.g. FESTIVE50"
                  required
                  className="uppercase font-mono bg-stone-950 border-stone-800 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Description</label>
                <Input
                  name="description"
                  placeholder="e.g. Get 50% discount on orders above ₹299"
                  className="bg-stone-950 border-stone-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Discount Type</label>
                  <select
                    name="discountType"
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white text-xs"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Discount Value</label>
                  <Input
                    type="number"
                    step="0.01"
                    name="discountValue"
                    placeholder="e.g. 20 or 100"
                    required
                    className="bg-stone-950 border-stone-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Min Order (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    name="minOrderAmount"
                    defaultValue="149"
                    className="bg-stone-950 border-stone-800 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-300">Max Discount (₹, opt)</label>
                  <Input
                    type="number"
                    step="0.01"
                    name="maxDiscountAmount"
                    placeholder="e.g. 100"
                    className="bg-stone-950 border-stone-800 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-300">Expiry Date</label>
                <Input
                  type="date"
                  name="validUntil"
                  required
                  className="bg-stone-950 border-stone-800 text-white"
                />
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
                  Save Coupon
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
