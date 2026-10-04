'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { History, X } from 'lucide-react';
import { api, inr } from '../lib/api';
import { cue } from '../lib/feedback';
import { useT } from '../lib/i18n';
import { ProductTile, SearchPick } from './pos';

// Order cart shared by the delivery boy app, the office New order and the
// customer portal: product tiles for the customer's own cylinders, prefilled
// with their last order.

export interface CartProduct { id: string; name: string; salePrice?: number }
interface LastOrder { orderNumber: string; date: string; items: { productId: string; qty: number }[] }

/**
 * Cart for one customer. `assigned` = the customer's cylinder types (empty = all
 * products). When `customerId` changes the cart refills from their last order.
 */
export function useOrderCart(products: CartProduct[], customerId: string | null, assigned: string[]) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [last, setLast] = useState<LastOrder | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const own = assigned.filter((id) => products.some((p) => p.id === id));
  // If the assigned cylinders are all switched off, show none rather than every product.
  const choices = assigned.length ? products.filter((p) => own.includes(p.id)) : products;
  const assignedOff = !!customerId && assigned.length > 0 && own.length === 0 && products.length > 0;
  const choiceKey = choices.map((p) => p.id).join(',');

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- new customer → start from an empty cart
    setQty({});
    setLast(null);
    setPrefilled(false);
    if (!customerId) return;
    api<LastOrder | null>(`/api/cylinder/orders/last?customerId=${encodeURIComponent(customerId)}`)
      .then((o) => {
        if (!alive || !o) return;
        setLast(o);
        const allowed = new Set(choiceKey.split(','));
        const fill = Object.fromEntries(o.items.filter((i) => allowed.has(i.productId)).map((i) => [i.productId, i.qty]));
        if (Object.keys(fill).length) {
          setQty(fill);
          setPrefilled(true);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [customerId, choiceKey]);

  const set = useCallback((productId: string, n: number) => {
    setPrefilled(false);
    setQty((cur) => {
      const next = { ...cur };
      if (n > 0) next[productId] = n;
      else delete next[productId];
      return next;
    });
  }, []);
  const clear = () => {
    cue('remove');
    setQty({});
    setPrefilled(false);
  };
  const items = Object.entries(qty).filter(([id, n]) => n > 0 && choices.some((p) => p.id === id)).map(([productId, n]) => ({ productId, qty: n }));
  const count = items.reduce((s, i) => s + i.qty, 0);
  const estimate = items.reduce((s, i) => s + i.qty * (products.find((p) => p.id === i.productId)?.salePrice || 0), 0);
  const reset = () => {
    setQty({});
    setPrefilled(false);
  };
  return { qty, set, clear, reset, items, count, estimate, choices, assignedOff, last, prefilled };
}

type Cart = ReturnType<typeof useOrderCart>;

/** Product tiles for the cart, with the "filled from last order" strip. */
export function OrderTiles({ cart, showPrice = true, cols = 2 }: { cart: Cart; showPrice?: boolean; cols?: 2 | 3 }) {
  const { t } = useT();
  const many = cart.choices.length > 8;
  const shown = many ? cart.choices.filter((p) => cart.qty[p.id]) : cart.choices;
  return (
    <div className="space-y-2">
      {cart.prefilled && cart.last && (
        <div className="flex items-center gap-2 rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 text-[11px] font-bold text-sky-900">
          <History className="h-4 w-4 shrink-0" />
          <span className="flex-1">{t('Filled from last order {no} ({date})', { no: cart.last.orderNumber, date: cart.last.date })}</span>
          <button type="button" onClick={cart.clear} className="flex items-center gap-0.5 text-sky-700">
            <X className="h-3.5 w-3.5" />{t('Clear')}
          </button>
        </div>
      )}
      {/* Many cylinders: search to add, tiles only for the ones in the cart. */}
      {many && (
        <SearchPick
          placeholder={t('Search cylinder to add…')}
          items={cart.choices.filter((p) => !cart.qty[p.id]).map((p) => ({ id: p.id, label: p.name, sub: showPrice && p.salePrice ? inr(p.salePrice) : undefined }))}
          onPick={(id) => {
            cart.set(id, 1);
          }}
        />
      )}
      <div className={cols === 3 ? 'grid grid-cols-2 sm:grid-cols-3 gap-2' : 'grid grid-cols-2 gap-2'}>
        {shown.map((p) => (
          <ProductTile key={p.id} name={p.name} sub={showPrice && p.salePrice ? inr(p.salePrice) : undefined} qty={cart.qty[p.id] || 0} onChange={(n) => cart.set(p.id, n)} />
        ))}
      </div>
      {cart.choices.length > 0 && cart.count === 0 && <p className="text-center text-[11px] font-semibold text-slate-400">{t(many ? 'Search above and tap a cylinder to add it' : 'Tap a cylinder to add it')}</p>}
    </div>
  );
}
