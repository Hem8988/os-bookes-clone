'use client';

import React, { useMemo, useState } from 'react';
import { Plus, X, Search, ArrowUpDown } from 'lucide-react';

export interface StatItem {
  label: string;
  value: string;
  valueClassName?: string;
}

export type DateFilter = 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'All';

export const isSameDay = (dateStr: string, ref: Date) => {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
};

interface GenericSummaryListProps<T> {
  title: string;
  items: T[];
  getId: (item: T) => string;
  getDate?: (item: T) => string;
  partyLabel?: string;
  partyOptions?: { id: string; name: string }[];
  getItemPartyName?: (item: T) => string | undefined;
  computeStats?: (filtered: T[]) => StatItem[];
  onCreateNew?: () => void;
  createLabel?: string;
  onClose: () => void;
  emptyMessage: string;
  renderCard: (item: T, idx: number) => React.ReactNode;
  headerExtra?: React.ReactNode;
  defaultDateFilter?: DateFilter;
}

export function GenericSummaryList<T>({
  title,
  items,
  getId,
  getDate,
  partyLabel,
  partyOptions,
  getItemPartyName,
  computeStats,
  onCreateNew,
  createLabel = 'Create New',
  onClose,
  emptyMessage,
  renderCard,
  headerExtra,
  defaultDateFilter = 'All',
}: GenericSummaryListProps<T>) {
  const hasPartyFilter = !!(partyLabel && partyOptions && getItemPartyName);
  const [filterByParty, setFilterByParty] = useState(false);
  const [partyId, setPartyId] = useState(partyOptions?.[0]?.id || '');
  const [dateFilter, setDateFilter] = useState<DateFilter>(defaultDateFilter);
  const [sortDesc, setSortDesc] = useState(true);

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

  const filtered = useMemo(() => {
    let list = [...items];

    if (hasPartyFilter && filterByParty && partyId) {
      const party = partyOptions!.find((p) => p.id === partyId);
      if (party) list = list.filter((item) => getItemPartyName!(item) === party.name);
    }

    if (getDate) {
      if (dateFilter === 'Today') {
        list = list.filter((item) => isSameDay(getDate(item), today));
      } else if (dateFilter === 'Yesterday') {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        list = list.filter((item) => isSameDay(getDate(item), y));
      } else if (dateFilter === 'This Week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        list = list.filter((item) => new Date(getDate(item)) >= weekAgo && new Date(getDate(item)) <= today);
      } else if (dateFilter === 'This Month') {
        list = list.filter((item) => {
          const d = new Date(getDate(item));
          return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
        });
      }

      list.sort((a, b) => (sortDesc ? +new Date(getDate(b)) - +new Date(getDate(a)) : +new Date(getDate(a)) - +new Date(getDate(b))));
    }

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filterByParty, partyId, dateFilter, sortDesc]);

  const stats = computeStats ? computeStats(filtered) : [];

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Teal Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-teal-600 dark:bg-teal-800">
        <h2 className="text-base font-bold text-white">{title}</h2>
        <div className="flex items-center gap-2">
          {headerExtra}
          {onCreateNew && (
            <button
              type="button"
              onClick={onCreateNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow"
            >
              <Plus className="h-3.5 w-3.5" /> {createLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white shadow"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter Row */}
      {(hasPartyFilter || getDate) && (
        <div className="flex flex-wrap items-end justify-between gap-4 p-4 border-b border-slate-200 dark:border-slate-800">
          {hasPartyFilter ? (
            <div className="flex-1 min-w-[240px]">
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  role="switch"
                  aria-checked={filterByParty}
                  onClick={() => setFilterByParty((prev) => !prev)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    filterByParty ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      filterByParty ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200">{partyLabel}</label>
              </div>
              <select
                value={partyId}
                disabled={!filterByParty}
                onChange={(e) => setPartyId(e.target.value)}
                className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
              >
                {(!partyOptions || partyOptions.length === 0) && <option value="">Select Name</option>}
                {partyOptions?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex-1 min-w-[10px]" />
          )}

          {getDate && (
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Date <span className="text-teal-600 dark:text-teal-400 font-mono text-xs">({dateLabel})</span>
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  className="py-2 px-3 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="All">All</option>
                </select>
              </div>
              <button
                type="button"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow"
              >
                <Search className="h-4 w-4" /> Search
              </button>
              <button
                type="button"
                title="Toggle Sort Order"
                onClick={() => setSortDesc((prev) => !prev)}
                className="p-2 rounded-lg bg-slate-500 hover:bg-slate-400 text-white shadow"
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats Bar */}
      {stats.length > 0 && (
        <div className={`grid gap-4 px-4 py-3 bg-slate-900 text-white text-center`} style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-xs font-bold text-slate-300">{s.label}:</div>
              <div className={`text-lg font-black ${s.valueClassName || ''}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      <div className="p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">{emptyMessage}</div>
        ) : (
          filtered.map((item, idx) => (
            <React.Fragment key={getId(item)}>{renderCard(item, idx)}</React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}
