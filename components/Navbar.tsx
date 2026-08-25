'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Search,
  Bell,
  UserCheck,
  LogOut,
  PlusCircle,
  HelpCircle,
  Smartphone,
  Users,
  Truck,
  Package,
  FileText
} from 'lucide-react';
import { Customer, Product, Invoice } from '../lib/types';

const levenshteinDistance = (a: string, b: string): number => {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[rows - 1][cols - 1];
};

// Substring match first; falls back to per-word edit-distance so small typos still find results.
const fuzzyIncludes = (text: string, query: string): boolean => {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (!lowerQuery) return false;
  if (lowerText.includes(lowerQuery)) return true;
  const threshold = lowerQuery.length <= 3 ? 1 : lowerQuery.length <= 6 ? 2 : 3;
  return lowerText.split(/\s+/).some((word) => levenshteinDistance(word, lowerQuery) <= threshold);
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightMatch = (text: string, query: string) => {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    part.toLowerCase() === query.trim().toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/40 text-slate-900 dark:text-slate-50 font-black rounded-sm px-0.5">{part}</mark>
    ) : (
      part
    )
  );
};

interface NavbarProps {
  userEmail: string;
  activeTab: string;
  setActiveTab: (tab: string, subTab?: string) => void;
  onLogout: () => void;
  customers?: Customer[];
  products?: Product[];
  invoices?: Invoice[];
}

export const Navbar: React.FC<NavbarProps> = ({
  userEmail,
  activeTab,
  setActiveTab,
  onLogout,
  customers = [],
  products = [],
  invoices = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [authName, setAuthName] = useState<string>(typeof userEmail === 'string' ? userEmail : 'Dhananjay (Admin)');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(json => {
        if (json.authenticated && json.user) {
          const val = json.user.name || json.user.email;
          if (val && typeof val === 'string') setAuthName(val);
          else if (val) setAuthName(String(val));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return { customerMatches: [], vendorMatches: [], productMatches: [], invoiceMatches: [] };

    const customerMatches = customers
      .filter((c) => c.type === 'Customer' && (
        fuzzyIncludes(c.name, q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.gstin && fuzzyIncludes(c.gstin, q))
      ))
      .slice(0, 5);

    const vendorMatches = customers
      .filter((c) => c.type === 'Vendor' && (
        fuzzyIncludes(c.name, q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.gstin && fuzzyIncludes(c.gstin, q))
      ))
      .slice(0, 5);

    const productMatches = products
      .filter((p) =>
        fuzzyIncludes(p.name, q) ||
        (p.sku && fuzzyIncludes(p.sku, q)) ||
        (p.hsnCode && fuzzyIncludes(p.hsnCode, q)) ||
        (p.barcode && p.barcode.includes(q))
      )
      .slice(0, 5);

    const invoiceMatches = invoices
      .filter((inv) =>
        fuzzyIncludes(inv.invoiceNumber, q) ||
        fuzzyIncludes(inv.customerName, q)
      )
      .slice(0, 5);

    return { customerMatches, vendorMatches, productMatches, invoiceMatches };
  }, [searchQuery, customers, products, invoices]);

  const hasResults =
    searchResults.customerMatches.length > 0 ||
    searchResults.vendorMatches.length > 0 ||
    searchResults.productMatches.length > 0 ||
    searchResults.invoiceMatches.length > 0;

  const goTo = (tab: string, subTab?: string) => {
    setActiveTab(tab, subTab);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 md:px-6 shadow-sm">
      {/* Left section: Firm/Branch dropdown */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 text-xs md:text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">Active Firm:</span>
          <span className="font-bold">PRAMUKH INDANE GAS AGENCY</span>
          <span className="ml-1 rounded bg-emerald-200 dark:bg-emerald-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-emerald-900 dark:text-emerald-100 font-extrabold">
            GSTIN Active
          </span>
        </div>

        {/* Quick New Invoice Action */}
        <button
          onClick={() => setActiveTab('billing')}
          className="hidden lg:flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition-all transform active:scale-95"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Invoice (F2)</span>
        </button>
      </div>

      {/* Center Search Bar */}
      <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsSearchOpen(true);
          }}
          onFocus={() => setIsSearchOpen(true)}
          placeholder="Search Invoices, Customers, HSN, Stock (Ctrl + K)..."
          className="w-full pl-9 pr-4 py-1.5 text-xs md:text-sm rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
        />

        {isSearchOpen && searchQuery.trim() && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsSearchOpen(false)} />
            <div className="absolute z-50 top-full mt-2 left-0 w-full max-h-[420px] overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl">
              {!hasResults ? (
                <div className="p-4 text-sm text-slate-500 text-center">No results for &quot;{searchQuery}&quot;.</div>
              ) : (
                <>
                  {searchResults.customerMatches.length > 0 && (
                    <div className="py-1.5">
                      <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Customers</div>
                      {searchResults.customerMatches.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => goTo('masters', 'customer')}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60"
                        >
                          <Users className="h-4 w-4 text-emerald-500 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{highlightMatch(c.name, searchQuery)}</div>
                            <div className="text-[11px] text-slate-500">{c.phone || c.gstin || 'Customer'}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.vendorMatches.length > 0 && (
                    <div className="py-1.5 border-t border-slate-100 dark:border-slate-700">
                      <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Vendors</div>
                      {searchResults.vendorMatches.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => goTo('masters', 'vendor')}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60"
                        >
                          <Truck className="h-4 w-4 text-teal-500 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{highlightMatch(v.name, searchQuery)}</div>
                            <div className="text-[11px] text-slate-500">{v.phone || v.gstin || 'Vendor'}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.productMatches.length > 0 && (
                    <div className="py-1.5 border-t border-slate-100 dark:border-slate-700">
                      <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Products / Stock</div>
                      {searchResults.productMatches.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => goTo('inventory-hub', 'stock')}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60"
                        >
                          <Package className="h-4 w-4 text-sky-500 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{highlightMatch(p.name, searchQuery)}</div>
                            <div className="text-[11px] text-slate-500">SKU: {p.sku || '-'} · Stock: {p.stock}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.invoiceMatches.length > 0 && (
                    <div className="py-1.5 border-t border-slate-100 dark:border-slate-700">
                      <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Invoices</div>
                      {searchResults.invoiceMatches.map((inv) => (
                        <button
                          key={inv.id}
                          onClick={() => goTo('inventory-hub', 'sales')}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60"
                        >
                          <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{highlightMatch(inv.invoiceNumber, searchQuery)}</div>
                            <div className="text-[11px] text-slate-500">{highlightMatch(inv.customerName, searchQuery)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right section: System User & Quick Controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* App link indicator */}
        <button 
          title="Mobile POS App Synced"
          className="hidden sm:flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700"
        >
          <Smartphone className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-[11px]">App Synced</span>
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
        </button>

        {/* User profile dropdown badge */}
        {(() => {
          const displayName = typeof authName === 'string' && authName.trim() ? authName.trim() : 'Dhananjay (Admin)';
          const avatarInitials = displayName.substring(0, 2).toUpperCase();
          return (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                {avatarInitials}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight flex items-center gap-1">
                  {displayName}
                  <UserCheck className="h-3 w-3 text-emerald-500" />
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Authenticated Session</span>
              </div>
              
              <button
                onClick={onLogout}
                title="Logout"
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-1"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          );
        })()}
      </div>
    </header>
  );
};
