'use client';

import React, { useState } from 'react';
import type { Address } from '@/types/database.types';
import { addCustomerAddress, setDefaultAddress, deleteCustomerAddress } from '@/actions/address';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface Props {
  initialAddresses: Address[];
}

export function AddressManager({ initialAddresses }: Props) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAddAddress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('isDefault', String(addresses.length === 0));

    const res = await addCustomerAddress(formData);
    if (!res.success || !res.data) {
      alert(res.error || 'Failed to save address.');
    } else {
      setAddresses([res.data, ...addresses]);
      setShowForm(false);
    }
    setLoading(false);
  }

  async function handleSetDefault(addressId: string) {
    const res = await setDefaultAddress(addressId);
    if (res.success) {
      setAddresses(
        addresses.map((a) => ({
          ...a,
          is_default: a.id === addressId,
        }))
      );
    }
  }

  async function handleDelete(addressId: string) {
    if (!confirm('Are you sure you want to delete this address?')) return;
    const res = await deleteCustomerAddress(addressId);
    if (res.success) {
      setAddresses(addresses.filter((a) => a.id !== addressId));
    }
  }

  return (
    <div className="space-y-6">
      {!showForm && (
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> Add New Address
        </Button>
      )}

      {showForm && (
        <form
          onSubmit={handleAddAddress}
          className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4 max-w-xl"
        >
          <h3 className="text-sm font-bold text-stone-900">New Delivery Address</h3>

          <div className="grid grid-cols-3 gap-2">
            {['Home', 'Work', 'Other'].map((lbl) => (
              <label
                key={lbl}
                className="p-2 text-center rounded-xl border text-xs font-semibold cursor-pointer border-stone-300 hover:bg-stone-50 has-[:checked]:bg-stone-900 has-[:checked]:text-white has-[:checked]:border-stone-900 transition"
              >
                <input
                  type="radio"
                  name="label"
                  value={lbl}
                  defaultChecked={lbl === 'Home'}
                  className="hidden"
                />
                {lbl}
              </label>
            ))}
          </div>

          <Input
            id="addressLine1"
            name="addressLine1"
            label="Street Address / Flat No."
            placeholder="Flat 402, Sunshine Apts, 12th Main"
            required
          />

          <Input
            id="landmark"
            name="landmark"
            label="Landmark (Optional)"
            placeholder="Opposite City Park"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input id="city" name="city" label="City" defaultValue="Bangalore" required />
            <Input id="state" name="state" label="State" defaultValue="Karnataka" required />
            <Input id="postalCode" name="postalCode" label="PIN Code" placeholder="560038" required />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={loading}>
              Save Address
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {addresses.length === 0 ? (
          <div className="sm:col-span-2 bg-white p-8 text-center rounded-2xl border border-stone-200 text-stone-500 text-xs">
            No saved addresses found. Click &quot;Add New Address&quot; above.
          </div>
        ) : (
          addresses.map((addr) => (
            <div
              key={addr.id}
              className={`bg-white p-5 rounded-2xl border transition flex flex-col justify-between ${
                addr.is_default ? 'border-orange-500 shadow-sm ring-1 ring-orange-500/20' : 'border-stone-200'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 px-2.5 py-0.5 rounded-md bg-stone-100 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-orange-600" />
                    {addr.label}
                  </span>
                  {addr.is_default && (
                    <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-stone-900 pt-1">
                  {addr.address_line1}
                </p>
                {addr.landmark && (
                  <p className="text-xs text-stone-500">Near {addr.landmark}</p>
                )}
                <p className="text-xs text-stone-400">
                  {addr.city}, {addr.state} - {addr.postal_code}
                </p>
              </div>

              <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                {!addr.is_default ? (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-stone-500 hover:text-stone-900 font-semibold cursor-pointer"
                  >
                    Set as Default
                  </button>
                ) : (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Selected for Delivery
                  </span>
                )}

                <button
                  onClick={() => handleDelete(addr.id)}
                  className="text-stone-400 hover:text-red-600 cursor-pointer p-1"
                  title="Delete address"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
