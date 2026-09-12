'use client';

import React, { useState } from 'react';
import { deleteMenuItem } from '@/actions/restaurant';
import { Trash2 } from 'lucide-react';

interface Props {
  itemId: string;
  itemName: string;
}

export function ItemDeleteButton({ itemId, itemName }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Are you sure you want to remove "${itemName}" from your menu?`)) {
      return;
    }

    setLoading(true);
    const res = await deleteMenuItem(itemId);
    if (!res.success) {
      alert(res.error || 'Failed to delete item');
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
      title="Delete item"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
