'use client';

import { useState } from 'react';
import type { AdminPaymentRecord } from '@/actions/admin';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface Props {
  initialPayments: AdminPaymentRecord[];
}

export function AdminPaymentsView({ initialPayments }: Props) {
  const [payments] = useState<AdminPaymentRecord[]>(initialPayments);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = selectedStatus === 'ALL' || p.status === selectedStatus;
    const matchesSearch =
      !search ||
      p.order?.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.razorpay_payment_id?.toLowerCase().includes(search.toLowerCase()) ||
      p.razorpay_order_id?.toLowerCase().includes(search.toLowerCase()) ||
      p.order?.customer?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.order?.customer?.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.order?.restaurant?.name?.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const totalCaptured = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalFailed = payments.filter((p) => p.status === 'FAILED').length;
  const totalPending = payments.filter((p) => p.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Payments & Transactions
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Real-time Razorpay transaction log, HMAC signature verifications, and gateway audit trail.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-stone-400 block mb-1">
            Total Captured Online
          </span>
          <span className="text-2xl font-extrabold text-emerald-400">
            ₹{totalCaptured.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <p className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Verified via HMAC SHA256
          </p>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-stone-400 block mb-1">
            Pending Online Transactions
          </span>
          <span className="text-2xl font-extrabold text-amber-400">{totalPending}</span>
          <p className="text-[11px] text-stone-500 mt-1">Awaiting customer checkout / webhook</p>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-stone-400 block mb-1">
            Failed / Dropped Transactions
          </span>
          <span className="text-2xl font-extrabold text-red-400">{totalFailed}</span>
          <p className="text-[11px] text-stone-500 mt-1">Customers can retry without duplicate orders</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900/60 p-3 rounded-2xl border border-stone-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order #, Razorpay ID, customer..."
            className="pl-9 text-xs bg-stone-950 border-stone-800 text-stone-200 placeholder:text-stone-500 h-9"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'SUCCESS', 'PENDING', 'FAILED', 'REFUNDED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedStatus === st
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950/70 text-stone-400 uppercase tracking-wider text-[10px] border-b border-stone-800">
              <tr>
                <th className="py-3 px-4">Order / Customer</th>
                <th className="py-3 px-4">Gateway IDs</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-500">
                    No payment transactions found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-800/40 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-white">
                        {p.order?.order_number || 'Order ID: ' + p.order_id.slice(0, 8)}
                      </p>
                      <p className="text-[11px] text-stone-400">
                        {p.order?.customer?.full_name || 'Customer'} &bull; {p.order?.restaurant?.name || 'Restaurant'}
                      </p>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-stone-400">
                      <div>
                        <span className="text-stone-500">Rzp Order:</span>{' '}
                        {p.razorpay_order_id || 'N/A'}
                      </div>
                      <div>
                        <span className="text-stone-500">Payment ID:</span>{' '}
                        <span className="text-stone-300">
                          {p.razorpay_payment_id || 'Pending Gateway Checkout'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      ₹{Number(p.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'SUCCESS'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : p.status === 'FAILED'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : p.status === 'REFUNDED'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {p.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
                        {p.status === 'FAILED' && <AlertTriangle className="w-3 h-3" />}
                        {p.status === 'REFUNDED' && <RotateCcw className="w-3 h-3" />}
                        {p.status === 'PENDING' && <CreditCard className="w-3 h-3" />}
                        {p.status}
                      </span>
                      {p.error_description && (
                        <p className="text-[10px] text-red-400 mt-0.5 truncate max-w-xs" title={p.error_description}>
                          {p.error_description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-stone-400 text-[11px]">
                      {new Date(p.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/orders/${p.order_id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-400 hover:text-purple-300"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </Link>
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
