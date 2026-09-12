'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Address } from '@/types/database.types';

export type AddressActionResponse = {
  success: boolean;
  data?: Address;
  error?: string;
  message?: string;
};

/**
 * Get all saved delivery addresses for the authenticated customer
 */
export async function getCustomerAddresses(): Promise<Address[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching addresses:', error);
    return [];
  }

  return (data as unknown as Address[]) || [];
}

/**
 * Add a new delivery address
 */
export async function addCustomerAddress(formData: FormData): Promise<AddressActionResponse> {
  const label = (formData.get('label') as string) || 'Home';
  const addressLine1 = formData.get('addressLine1') as string;
  const addressLine2 = formData.get('addressLine2') as string;
  const city = formData.get('city') as string;
  const state = (formData.get('state') as string) || 'Karnataka';
  const postalCode = formData.get('postalCode') as string;
  const landmark = formData.get('landmark') as string;
  const isDefault = formData.get('isDefault') === 'true';

  if (!addressLine1 || !city || !postalCode) {
    return { success: false, error: 'Address line, city, and postal code are required.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  // If this address is set as default, clear existing defaults first
  if (isDefault) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('addresses') as any)
      .update({ is_default: false })
      .eq('user_id', user.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('addresses') as any)
    .insert({
      user_id: user.id,
      label: label.trim(),
      address_line1: addressLine1.trim(),
      address_line2: addressLine2 ? addressLine2.trim() : null,
      city: city.trim(),
      state: state.trim(),
      postal_code: postalCode.trim(),
      landmark: landmark ? landmark.trim() : null,
      is_default: isDefault,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/checkout');
  revalidatePath('/addresses');
  return { success: true, data: data as unknown as Address, message: 'Address saved.' };
}

/**
 * Set an existing address as default
 */
export async function setDefaultAddress(addressId: string): Promise<AddressActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  // Reset all user addresses to non-default
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('addresses') as any)
    .update({ is_default: false })
    .eq('user_id', user.id);

  // Set chosen address as default
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('addresses') as any)
    .update({ is_default: true })
    .eq('id', addressId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/checkout');
  revalidatePath('/addresses');
  return { success: true, data: data as unknown as Address };
}

/**
 * Delete a saved address
 */
export async function deleteCustomerAddress(addressId: string): Promise<AddressActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Authentication required.' };

  const { error } = await supabase
    .from('addresses')
    .delete()
    .eq('id', addressId)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/checkout');
  revalidatePath('/addresses');
  return { success: true, message: 'Address removed.' };
}
