'use server';

import { createClient } from '@/lib/supabase/server';

export type UploadResult = {
  success: boolean;
  url?: string;
  error?: string;
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function uploadImage(formData: FormData, folder: 'restaurants' | 'menu' = 'menu'): Promise<UploadResult> {
  const file = formData.get('file') as File | null;

  if (!file || file.size === 0) {
    return { success: false, error: 'No file provided.' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: 'Invalid file format. Please upload JPG, PNG, or WebP.' };
  }

  if (file.size > MAX_SIZE) {
    return { success: false, error: 'File size exceeds 5MB limit.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Authentication required to upload media.' };
  }

  // Generate unique file path
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${folder}/${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error } = await supabase.storage
    .from('restaurant-media')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('restaurant-media').getPublicUrl(fileName);

  return { success: true, url: publicUrl };
}
