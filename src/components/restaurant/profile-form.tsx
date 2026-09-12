'use client';

import React, { useState } from 'react';
import { updateRestaurantProfile } from '@/actions/restaurant';
import type { Restaurant } from '@/types/database.types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ImageUploader } from './image-uploader';
import { CheckCircle2, AlertCircle, Save } from 'lucide-react';

interface Props {
  restaurant: Restaurant;
}

export function ProfileForm({ restaurant }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append('restaurantId', restaurant.id);
    formData.append('isAcceptingOrders', String(restaurant.is_accepting_orders));

    const res = await updateRestaurantProfile(formData);
    if (!res.success) {
      setError(res.error || 'Failed to update restaurant details');
    } else {
      setMessage('Restaurant profile updated successfully!');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {message}
        </div>
      )}

      {/* Media Uploads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
        <ImageUploader
          name="logoUrl"
          label="Restaurant Logo / Avatar"
          defaultValue={restaurant.logo_url}
          folder="restaurants"
        />
        <ImageUploader
          name="bannerUrl"
          label="Storefront Banner Image"
          defaultValue={restaurant.banner_url}
          folder="restaurants"
        />
      </div>

      {/* General Information */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900 border-b border-stone-100 pb-2">
          General Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="name"
            name="name"
            label="Restaurant Name"
            defaultValue={restaurant.name}
            required
          />
          <Input
            id="cuisineTypes"
            name="cuisineTypes"
            label="Cuisines (comma separated)"
            defaultValue={restaurant.cuisine_types.join(', ')}
            placeholder="e.g. North Indian, Biryani, Tandoori"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-stone-700 mb-1.5">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={restaurant.description || ''}
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Tell customers about your specialties, heritage, and flavors..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="phone"
            name="phone"
            type="tel"
            label="Contact Phone"
            defaultValue={restaurant.phone || ''}
            placeholder="+91 98765 43210"
          />
          <Input
            id="email"
            name="email"
            type="email"
            label="Contact Email"
            defaultValue={restaurant.email || ''}
            placeholder="orders@restaurant.com"
          />
        </div>
      </div>

      {/* Location & Delivery Parameters */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900 border-b border-stone-100 pb-2">
          Location & Delivery Settings
        </h3>

        <Input
          id="address"
          name="address"
          label="Street Address"
          defaultValue={restaurant.address}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            id="city"
            name="city"
            label="City"
            defaultValue={restaurant.city}
            required
          />
          <Input
            id="state"
            name="state"
            label="State"
            defaultValue={restaurant.state}
            required
          />
          <Input
            id="postalCode"
            name="postalCode"
            label="Postal Code (PIN)"
            defaultValue={restaurant.postal_code}
            required
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <Input
            id="deliveryFee"
            name="deliveryFee"
            type="number"
            step="0.5"
            min="0"
            label="Delivery Fee (₹)"
            defaultValue={restaurant.delivery_fee}
            required
          />
          <Input
            id="minimumOrder"
            name="minimumOrder"
            type="number"
            step="1"
            min="0"
            label="Min Order (₹)"
            defaultValue={restaurant.minimum_order}
            required
          />
          <Input
            id="deliveryTimeMin"
            name="deliveryTimeMin"
            type="number"
            min="5"
            label="Min Prep/Del (mins)"
            defaultValue={restaurant.delivery_time_min}
            required
          />
          <Input
            id="deliveryTimeMax"
            name="deliveryTimeMax"
            type="number"
            min="10"
            label="Max Prep/Del (mins)"
            defaultValue={restaurant.delivery_time_max}
            required
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="lg" isLoading={loading}>
          <Save className="w-4 h-4 mr-2" /> Save Restaurant Details
        </Button>
      </div>
    </form>
  );
}
