'use client';

import React, { useState } from 'react';
import type { PlatformSettingsMap } from '@/actions/admin';
import { updatePlatformSetting } from '@/actions/admin';
import { Settings, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  initialSettings: PlatformSettingsMap;
}

export function AdminSettingsView({ initialSettings }: Props) {
  const [settings, setSettings] = useState<PlatformSettingsMap>(initialSettings);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSave(key: keyof PlatformSettingsMap, val: string | number | boolean) {
    setLoadingKey(key);
    setSuccessMsg(null);
    setErrorMsg(null);

    const res = await updatePlatformSetting(key, val);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update platform setting.');
    } else {
      setSuccessMsg(`Setting "${key.replace(/_/g, ' ')}" updated successfully.`);
      setSettings((prev) => ({ ...prev, [key]: val }));
    }
    setLoadingKey(null);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-purple-400" />
          Global Platform Settings
        </h1>
        <p className="text-xs text-stone-400 mt-1">
          Financial rules, default commissions, GST taxation, and operational parameters stored in Supabase.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Settings Cards */}
      <div className="space-y-4">
        {/* 1. Platform Commission */}
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-md">
            <h2 className="text-sm font-bold text-white">Platform Commission (%)</h2>
            <p className="text-xs text-stone-400">
              Percentage deducted from restaurant food subtotal as platform service fee.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Input
              type="number"
              step="0.1"
              value={settings.platform_commission_percent}
              onChange={(e) =>
                setSettings((s) => ({ ...s, platform_commission_percent: Number(e.target.value) }))
              }
              className="w-24 bg-stone-950 border-stone-800 text-white font-mono text-xs"
            />
            <Button
              size="sm"
              isLoading={loadingKey === 'platform_commission_percent'}
              onClick={() => handleSave('platform_commission_percent', settings.platform_commission_percent)}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              Save
            </Button>
          </div>
        </div>

        {/* 2. Platform GST / Tax Rate */}
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-md">
            <h2 className="text-sm font-bold text-white">Food GST / Tax Rate (%)</h2>
            <p className="text-xs text-stone-400">
              Standard Goods & Services Tax applied to orders (5% standard restaurant rate in India).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Input
              type="number"
              step="0.1"
              value={settings.tax_percentage}
              onChange={(e) =>
                setSettings((s) => ({ ...s, tax_percentage: Number(e.target.value) }))
              }
              className="w-24 bg-stone-950 border-stone-800 text-white font-mono text-xs"
            />
            <Button
              size="sm"
              isLoading={loadingKey === 'tax_percentage'}
              onClick={() => handleSave('tax_percentage', settings.tax_percentage)}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              Save
            </Button>
          </div>
        </div>

        {/* 3. Base Delivery Fee */}
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-md">
            <h2 className="text-sm font-bold text-white">Default Base Delivery Fee (₹)</h2>
            <p className="text-xs text-stone-400">
              Default delivery fee applied when a restaurant does not set custom distance tiers.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Input
              type="number"
              step="1"
              value={settings.delivery_fee_base}
              onChange={(e) =>
                setSettings((s) => ({ ...s, delivery_fee_base: Number(e.target.value) }))
              }
              className="w-24 bg-stone-950 border-stone-800 text-white font-mono text-xs"
            />
            <Button
              size="sm"
              isLoading={loadingKey === 'delivery_fee_base'}
              onClick={() => handleSave('delivery_fee_base', settings.delivery_fee_base)}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              Save
            </Button>
          </div>
        </div>

        {/* 4. Minimum Order Value */}
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-md">
            <h2 className="text-sm font-bold text-white">Platform Minimum Order (₹)</h2>
            <p className="text-xs text-stone-400">
              Global baseline threshold across all restaurant checkout carts.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Input
              type="number"
              step="1"
              value={settings.minimum_order_value}
              onChange={(e) =>
                setSettings((s) => ({ ...s, minimum_order_value: Number(e.target.value) }))
              }
              className="w-24 bg-stone-950 border-stone-800 text-white font-mono text-xs"
            />
            <Button
              size="sm"
              isLoading={loadingKey === 'minimum_order_value'}
              onClick={() => handleSave('minimum_order_value', settings.minimum_order_value)}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              Save
            </Button>
          </div>
        </div>

        {/* 5. Maintenance Mode Toggle */}
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-md">
            <h2 className="text-sm font-bold text-white">Platform Maintenance Mode</h2>
            <p className="text-xs text-stone-400">
              When activated, stops new customer checkouts while keeping dashboard accessible.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                settings.maintenance_mode ? 'text-amber-400' : 'text-stone-500'
              }`}
            >
              {settings.maintenance_mode ? 'Active (Halted)' : 'Normal (Live)'}
            </span>
            <Button
              size="sm"
              variant={settings.maintenance_mode ? 'danger' : 'outline'}
              isLoading={loadingKey === 'maintenance_mode'}
              onClick={() => handleSave('maintenance_mode', !settings.maintenance_mode)}
              className="text-xs"
            >
              {settings.maintenance_mode ? 'Disable Maintenance' : 'Enable Maintenance'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
