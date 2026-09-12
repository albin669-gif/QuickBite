'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Notification } from '@/types/database.types';
import { sendPushNotification } from '@/lib/push-notifications';

export type NotificationActionResponse = {
  success: boolean;
  error?: string;
  count?: number;
  data?: Notification[];
};

/**
 * Idempotently create an in-app notification and trigger push abstraction.
 * Avoids duplicate notifications on retries or repeated events.
 */
export async function createNotificationIdempotent(params: {
  userId: string;
  title: string;
  message: string;
  type?: 'ORDER' | 'PROMOTION' | 'SYSTEM';
  orderId?: string;
}): Promise<boolean> {
  const supabase = await createClient();

  // Deduplication check: if notification with same title, message, and orderId exists within last 1 hour, ignore
  if (params.orderId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('notifications') as any)
      .select('id')
      .eq('user_id', params.userId)
      .eq('order_id', params.orderId)
      .eq('title', params.title)
      .maybeSingle();

    if (existing) {
      return true; // Already created, prevent duplicate
    }
  }

  // Insert in-app notification
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('notifications') as any).insert({
    user_id: params.userId,
    title: params.title,
    message: params.message,
    type: params.type || 'ORDER',
    order_id: params.orderId || null,
    is_read: false,
  });

  if (error) {
    console.error('Error recording notification:', error);
    return false;
  }

  // Trigger push notification abstraction (FCM / in-app log)
  await sendPushNotification({
    userId: params.userId,
    title: params.title,
    body: params.message,
    orderId: params.orderId,
  });

  return true;
}

/**
 * Fetch all notifications for the authenticated user
 */
export async function getUserNotifications(): Promise<Notification[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('notifications') as any)
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Notification[];
}

/**
 * Fast count of unread notifications for badge indicators
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase.from('notifications') as any)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error || count === null) return 0;
  return count;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<NotificationActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('notifications') as any)
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/notifications');
  return { success: true };
}

/**
 * Mark all notifications for the current user as read
 */
export async function markAllNotificationsAsRead(): Promise<NotificationActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('notifications') as any)
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) return { success: false, error: error.message };

  revalidatePath('/notifications');
  return { success: true };
}
