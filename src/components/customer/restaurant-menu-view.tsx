'use client';

import React, { useState } from 'react';
import type { Restaurant, MenuCategory, MenuItem, Tables } from '@/types/database.types';
import { Clock, Star, MapPin, Phone, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { AddToCartButton } from '@/components/cart/add-to-cart-button';

interface Props {
  restaurant: Restaurant;
  categories: MenuCategory[];
  items: MenuItem[];
  hours: Tables<'restaurant_hours'>[];
}

export function RestaurantMenuView({ restaurant, categories, items, hours }: Props) {
  const [vegOnly, setVegOnly] = useState(false);
  const [showHours, setShowHours] = useState(false);

  const displayedItems = vegOnly ? items.filter((i) => i.is_veg) : items;

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-8">
      {/* Restaurant Hero Card */}
      <div className="relative h-64 sm:h-80 w-full bg-stone-900 rounded-3xl overflow-hidden shadow-lg">
        {restaurant.banner_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={restaurant.banner_url}
            alt={restaurant.name}
            className="w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-stone-900 to-orange-950 opacity-90" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/40 to-transparent" />

        <div className="absolute bottom-6 left-0 right-0 max-w-7xl mx-auto px-6 sm:px-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-orange-600 text-white shadow-sm">
                  {restaurant.cuisine_types.join(' • ')}
                </span>
                {restaurant.is_accepting_orders ? (
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-600/90 text-white flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Kitchen Open
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-red-600/90 text-white flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Currently Closed
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                {restaurant.name}
              </h1>

              {restaurant.description && (
                <p className="text-xs sm:text-sm text-stone-200 line-clamp-2 leading-relaxed">
                  {restaurant.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-300 pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-400" />
                  {restaurant.address}, {restaurant.city} ({restaurant.postal_code})
                </span>
                {restaurant.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-orange-400" />
                    {restaurant.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 shrink-0">
              <div className="text-center px-3 border-r border-white/20">
                <div className="flex items-center justify-center gap-1 text-amber-400 font-extrabold text-sm">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{restaurant.rating.toFixed(1)}</span>
                </div>
                <span className="text-[10px] text-stone-300">{restaurant.total_reviews} reviews</span>
              </div>

              <div className="text-center px-3 border-r border-white/20">
                <div className="flex items-center justify-center gap-1 text-white font-bold text-sm">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  <span>{restaurant.delivery_time_min}–{restaurant.delivery_time_max}m</span>
                </div>
                <span className="text-[10px] text-stone-300">Delivery</span>
              </div>

              <div className="text-center px-3">
                <div className="flex items-center justify-center gap-0.5 text-white font-bold text-sm">
                  <span>₹{restaurant.delivery_fee.toFixed(0)}</span>
                </div>
                <span className="text-[10px] text-stone-300">Delivery fee</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operating Hours Accordion */}
      {hours.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <button
            onClick={() => setShowHours(!showHours)}
            className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-stone-800 hover:bg-stone-50 transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" /> View Weekly Operating Hours
            </span>
            {showHours ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHours && (
            <div className="px-5 py-4 border-t border-stone-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-stone-50/50">
              {hours.map((h) => (
                <div key={h.day_of_week} className="flex justify-between py-1">
                  <span className="text-stone-500 font-medium">{daysOfWeek[h.day_of_week]}:</span>
                  <span className="font-bold text-stone-900">
                    {h.is_closed ? 'Closed' : `${h.open_time.slice(0, 5)} - ${h.close_time.slice(0, 5)}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category Navigation & Veg Switch */}
      <div className="sticky top-16 z-30 bg-stone-50/95 backdrop-blur py-3 border-b border-stone-200 flex items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={`#category-${cat.id}`}
              className="px-4 py-1.5 rounded-full text-xs font-bold text-stone-700 hover:text-stone-950 bg-white border border-stone-200 hover:border-stone-400 whitespace-nowrap transition"
            >
              {cat.name}
            </a>
          ))}
        </div>

        {/* Veg Only Toggle */}
        <button
          onClick={() => setVegOnly(!vegOnly)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            vegOnly
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${vegOnly ? 'bg-white' : 'bg-emerald-600'}`} />
          <span>Pure Veg</span>
        </button>
      </div>

      {/* Menu Sections */}
      <div className="space-y-12">
        {categories.map((cat) => {
          const catItems = displayedItems.filter((i) => i.category_id === cat.id);
          if (catItems.length === 0) return null;

          return (
            <section key={cat.id} id={`category-${cat.id}`} className="space-y-4 scroll-mt-28">
              <div className="border-b border-stone-200 pb-2 flex items-baseline justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
                    {cat.name}
                  </h2>
                  {cat.description && (
                    <p className="text-xs text-stone-500 mt-0.5">{cat.description}</p>
                  )}
                </div>
                <span className="text-xs text-stone-400 font-medium">
                  {catItems.length} {catItems.length === 1 ? 'dish' : 'dishes'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {catItems.map((item) => (
                  <DishRow
                    key={item.id}
                    item={item}
                    isAcceptingOrders={restaurant.is_accepting_orders}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {/* Uncategorized dishes */}
        {displayedItems.some((i) => !i.category_id) && (
          <section className="space-y-4">
            <div className="border-b border-stone-200 pb-2">
              <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
                Chef&apos;s Specials
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedItems
                .filter((i) => !i.category_id)
                .map((item) => (
                  <DishRow
                    key={item.id}
                    item={item}
                    isAcceptingOrders={restaurant.is_accepting_orders}
                  />
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function DishRow({
  item,
  isAcceptingOrders,
}: {
  item: MenuItem;
  isAcceptingOrders: boolean;
}) {
  const isOrderable = item.is_available && isAcceptingOrders;

  return (
    <div
      id={`dish-${item.id}`}
      className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-start justify-between gap-4 scroll-mt-32 ${
        isOrderable
          ? 'border-stone-200/90 shadow-sm hover:shadow-md'
          : 'border-stone-200 bg-stone-50/70 opacity-70'
      }`}
    >
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-2">
          {/* Veg/Non-Veg icon */}
          <span
            className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
              item.is_veg ? 'border-emerald-600' : 'border-red-600'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                item.is_veg ? 'bg-emerald-600' : 'bg-red-600'
              }`}
            />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            {item.is_veg ? 'Pure Veg' : 'Non-Veg'}
          </span>
        </div>

        <h3 className="font-bold text-stone-900 text-base leading-snug">{item.name}</h3>

        <p className="font-extrabold text-stone-900 text-sm">₹{item.price.toFixed(2)}</p>

        {item.description && (
          <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed pt-1">
            {item.description}
          </p>
        )}

        <p className="text-[11px] text-stone-400 pt-0.5">
          Prep time: ~{item.preparation_time_minutes} mins
        </p>
      </div>

      {/* Dish Photo & Order CTA */}
      <div className="relative flex flex-col items-center shrink-0 w-28">
        <div className="w-28 h-24 rounded-xl bg-stone-100 overflow-hidden relative">
          {item.image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400">
              Fresh Dish
            </div>
          )}
        </div>

        <div className="mt-2 w-full">
          <AddToCartButton
            restaurantId={item.restaurant_id}
            menuItemId={item.id}
            isAvailable={item.is_available}
            isAcceptingOrders={isAcceptingOrders}
          />
        </div>
      </div>
    </div>
  );
}
