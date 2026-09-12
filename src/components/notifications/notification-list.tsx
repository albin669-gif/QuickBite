'use client';

import React, { useState } from 'react';
import type { Notification } from '@/types/database.types';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/actions/notification';
import { Bell, Check, ExternalLink, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Props {
  initialNotifications: Notification[];
}

export function NotificationList({ initialNotifications }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleMarkOne(id: string) {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  async function handleMarkAll() {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-sm max-w-md mx-auto space-y-3">
        <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
          <Bell className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">No notifications</h2>
        <p className="text-xs text-stone-500 leading-relaxed">
          You have no notifications at the moment. Status changes and updates on your food orders will appear here.
        </p>
        <Link href="/restaurants" className="inline-block pt-2">
          <Button size="sm">Browse Food</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            All Alerts ({notifications.length})
          </span>
          {unreadCount > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
              {unreadCount} unread
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Notifications Cards Feed */}
      <div className="space-y-3">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`p-5 rounded-3xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              notif.is_read
                ? 'bg-white border-stone-200 shadow-sm'
                : 'bg-orange-50/50 border-orange-200 shadow-sm'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900 text-sm">{notif.title}</span>
                {!notif.is_read && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-600 text-white rounded-full uppercase tracking-wider">
                    New
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 leading-relaxed max-w-2xl">
                {notif.message}
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-stone-400">
                <span>
                  {new Date(notif.created_at).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
                {notif.type && (
                  <span className="uppercase text-[10px] font-semibold bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">
                    {notif.type}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {notif.order_id && (
                <Link href={`/orders/${notif.order_id}`}>
                  <Button size="sm" variant="outline" className="gap-1 text-xs">
                    <span>View Order</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}

              {!notif.is_read && (
                <button
                  onClick={() => handleMarkOne(notif.id)}
                  title="Mark as read"
                  className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
