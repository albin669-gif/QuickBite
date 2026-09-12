'use client';

import React, { useState } from 'react';
import { createMenuCategory, updateMenuCategory, deleteMenuCategory } from '@/actions/restaurant';
import type { MenuCategory } from '@/types/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Check, X, AlertCircle } from 'lucide-react';

interface Props {
  restaurantId: string;
  initialCategories: MenuCategory[];
}

export function CategoriesManager({ restaurantId, initialCategories }: Props) {
  const [categories, setCategories] = useState<MenuCategory[]>(initialCategories);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append('restaurantId', restaurantId);

    const res = await createMenuCategory(formData);
    if (!res.success || !res.data) {
      setError(res.error || 'Failed to create category.');
    } else {
      setCategories([...categories, res.data]);
      setIsCreating(false);
    }
    setLoading(false);
  }

  async function handleSaveEdit(catId: string) {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('categoryId', catId);
    formData.append('name', editName);
    formData.append('description', editDesc);
    formData.append('isActive', 'true');

    const res = await updateMenuCategory(formData);
    if (!res.success || !res.data) {
      setError(res.error || 'Failed to update category.');
    } else {
      setCategories(categories.map((c) => (c.id === catId ? res.data! : c)));
      setEditingId(null);
    }
    setLoading(false);
  }

  async function handleDelete(catId: string) {
    if (!confirm('Are you sure you want to delete this category? Linked items will be kept uncategorized.')) {
      return;
    }

    setLoading(true);
    setError(null);

    const res = await deleteMenuCategory(catId);
    if (!res.success) {
      setError(res.error || 'Failed to delete category.');
    } else {
      setCategories(categories.filter((c) => c.id !== catId));
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Categories ({categories.length})</h2>
          <p className="text-xs text-stone-500">Group your dishes so customers can navigate easily.</p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> New Category
          </Button>
        )}
      </div>

      {/* Creation Card */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="bg-white p-5 rounded-2xl border border-emerald-300 shadow-sm space-y-3"
        >
          <h3 className="text-sm font-bold text-emerald-900">Add New Category</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="name"
              name="name"
              label="Category Name"
              placeholder="e.g. Starters, Dum Biryanis, Thalis"
              required
            />
            <Input
              id="description"
              name="description"
              label="Short Description"
              placeholder="e.g. Freshly cooked appetizers"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreating(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={loading}>
              Save Category
            </Button>
          </div>
        </form>
      )}

      {/* Category List */}
      <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 shadow-sm overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-stone-500 text-sm">
            No categories yet. Click &quot;New Category&quot; above to create one.
          </div>
        ) : (
          categories.map((cat, idx) => (
            <div key={cat.id} className="p-4 flex items-center justify-between gap-4">
              {editingId === cat.id ? (
                <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 text-sm font-semibold w-full sm:w-1/3"
                    placeholder="Category Name"
                  />
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs w-full sm:flex-1"
                    placeholder="Description"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleSaveEdit(cat.id)}
                      disabled={loading}
                      className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center text-xs font-semibold">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-stone-900">{cat.name}</h4>
                      {cat.description && (
                        <p className="text-xs text-stone-500">{cat.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditName(cat.name);
                        setEditDesc(cat.description || '');
                      }}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
                      title="Rename"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
