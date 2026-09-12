'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createMenuItem, updateMenuItem } from '@/actions/restaurant';
import type { MenuItem, MenuCategory } from '@/types/database.types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ImageUploader } from './image-uploader';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Props {
  restaurantId: string;
  categories: MenuCategory[];
  initialItem?: MenuItem | null;
}

export function ItemForm({ restaurantId, categories, initialItem }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isVeg, setIsVeg] = useState<boolean>(initialItem ? initialItem.is_veg : true);
  const [isAvailable, setIsAvailable] = useState<boolean>(
    initialItem ? initialItem.is_available : true
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append('restaurantId', restaurantId);
    formData.append('isVeg', String(isVeg));
    formData.append('isAvailable', String(isAvailable));

    if (initialItem) {
      formData.append('itemId', initialItem.id);
      const res = await updateMenuItem(formData);
      if (!res.success) {
        setError(res.error || 'Failed to update menu item.');
        setLoading(false);
        return;
      }
    } else {
      const res = await createMenuItem(formData);
      if (!res.success) {
        setError(res.error || 'Failed to create menu item.');
        setLoading(false);
        return;
      }
    }

    router.push('/restaurant/menu');
    router.refresh();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/restaurant/menu"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Menu Items
      </Link>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8">
        <h2 className="text-xl font-bold text-stone-900 mb-1">
          {initialItem ? 'Edit Menu Item' : 'Add New Dish'}
        </h2>
        <p className="text-xs text-stone-500 mb-6">
          Provide complete dish details and high-quality photography for your customers.
        </p>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Image Uploader */}
          <ImageUploader
            name="imageUrl"
            label="Dish Photograph"
            defaultValue={initialItem?.image_url}
            folder="menu"
          />

          {/* Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="name"
              name="name"
              label="Dish Name"
              defaultValue={initialItem?.name || ''}
              placeholder="e.g. Butter Chicken Curry"
              required
            />

            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-stone-700 mb-1.5">
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={initialItem?.category_id || ''}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price & Prep Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="price"
              name="price"
              type="number"
              step="0.5"
              min="0"
              label="Price in INR (₹)"
              defaultValue={initialItem ? initialItem.price : ''}
              placeholder="e.g. 249.00"
              required
            />

            <Input
              id="prepTime"
              name="prepTime"
              type="number"
              min="1"
              label="Preparation Time (Minutes)"
              defaultValue={initialItem ? initialItem.preparation_time_minutes : 15}
              required
            />
          </div>

          {/* Veg / Non-Veg Selector */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Food Dietary Type</label>
            <div className="flex gap-4">
              <label
                className={`flex-1 p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                  isVeg
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-semibold'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                }`}
              >
                <input
                  type="radio"
                  name="dietary"
                  checked={isVeg}
                  onChange={() => setIsVeg(true)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span className="text-sm">Vegetarian (Pure Veg)</span>
              </label>

              <label
                className={`flex-1 p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                  !isVeg
                    ? 'border-red-500 bg-red-50/50 text-red-900 font-semibold'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                }`}
              >
                <input
                  type="radio"
                  name="dietary"
                  checked={!isVeg}
                  onChange={() => setIsVeg(false)}
                  className="text-red-600 focus:ring-red-500"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                <span className="text-sm">Non-Vegetarian</span>
              </label>
            </div>
          </div>

          {/* Availability Toggle */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-stone-700">
                Item is available for ordering immediately (In Stock)
              </span>
            </label>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-stone-700 mb-1.5">
              Description & Ingredients
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={initialItem?.description || ''}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Describe the flavors, spices, portion size, and accompaniment..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-stone-100">
            <Link href="/restaurant/menu">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" isLoading={loading}>
              {initialItem ? 'Update Dish' : 'Add Dish to Menu'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
