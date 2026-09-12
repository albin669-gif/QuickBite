'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  isOpen: boolean;
  existingRestaurantName: string;
  newRestaurantName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CartConflictModal({
  isOpen,
  existingRestaurantName,
  newRestaurantName,
  onConfirm,
  onCancel,
  isLoading = false,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-stone-200 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-lg font-extrabold text-stone-900">
            Replace items already in cart?
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Your cart contains items from <strong className="text-stone-900">{existingRestaurantName}</strong>.
            A QuickBite order can only contain food from one restaurant at a time.
          </p>
          <p className="text-xs text-stone-500 pt-1">
            Do you want to clear your current cart and add items from <strong className="text-orange-600">{newRestaurantName}</strong>?
          </p>
        </div>

        <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-xl"
          >
            Cancel & Keep Cart
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onConfirm}
            isLoading={isLoading}
            className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
          >
            Clear Cart & Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
