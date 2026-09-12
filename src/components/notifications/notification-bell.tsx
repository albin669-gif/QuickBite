'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/actions/notification';
import type { Notification } from '@/types/database.types';

interface Props {
  userId: string;
  initialUnreadCount: number;
}

export function NotificationBell({ userId, initialUnreadCount }: Props) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Supabase Realtime Subscription for incoming notifications
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            const newNotif = payload.new as Notification;
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function handleToggleDropdown() {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState && notifications.length === 0) {
      setLoading(true);
      const data = await getUserNotifications();
      setNotifications(data);
      setLoading(false);
    }
  }

  async function handleMarkOne(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function handleMarkAll() {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggleDropdown}
        className="relative inline-flex items-center justify-center p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
        aria-label="View notifications"
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-stone-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-stone-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3.5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-red-100 text-red-700 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 transition cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
            {loading ? (
              <div className="p-6 text-center text-xs text-stone-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Bell className="w-6 h-6 text-stone-300 mx-auto" />
                <p className="text-xs font-semibold text-stone-600">All caught up!</p>
                <p className="text-[11px] text-stone-400">No notifications to show right now.</p>
              </div>
            ) : (
              notifications.slice(0, 5).map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 text-xs transition flex items-start justify-between gap-3 ${
                    notif.is_read ? 'bg-white hover:bg-stone-50/60' : 'bg-orange-50/40 hover:bg-orange-50/60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900">{notif.title}</span>
                      {!notif.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-stone-600 text-[11px] leading-relaxed">{notif.message}</p>
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-[10px] text-stone-400">
                        {new Date(notif.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {notif.order_id && (
                        <Link
                          href={`/orders/${notif.order_id}`}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:underline"
                        >
                          <span>Track Order</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {!notif.is_read && (
                    <button
                      onClick={(e) => handleMarkOne(notif.id, e)}
                      title="Mark as read"
                      className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 bg-stone-50 border-t border-stone-100 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-stone-700 hover:text-orange-600 transition inline-block py-0.5"
            >
              View all notifications &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
