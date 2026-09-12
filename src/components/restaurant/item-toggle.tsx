'use client';

import React, { useState } from 'react';
import { toggleMenuItemAvailability } from '@/actions/restaurant';
import { clsx } from 'clsx';

interface Props {
  itemId: string;
  initialAvailable: boolean;
}

export function ItemToggle({ itemId, initialAvailable }: Props) {
  const [available, setAvailable] = useState(initialAvailable);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const nextVal = !available;
    setAvailable(nextVal);

    const res = await toggleMenuItemAvailability(itemId, nextVal);
    if (!res.success) {
      setAvailable(!nextVal);
      alert(res.error || 'Failed to update item availability');
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={clsx(
        'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer border',
        available
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
          : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
      )}
    >
      {available ? 'In Stock' : 'Out of Stock'}
    </button>
  );
}
