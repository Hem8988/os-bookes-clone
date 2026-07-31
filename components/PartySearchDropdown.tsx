'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, Edit3, Trash2, Search } from 'lucide-react';
import { Customer } from '../lib/types';

interface PartySearchDropdownProps {
  parties: Customer[];
  selectedPartyId: string;
  onSelect: (partyId: string) => void;
  onCreateNew?: (searchQuery: string) => void;
  createNewLabel?: string;
  placeholder?: string;
}

export const PartySearchDropdown: React.FC<PartySearchDropdownProps> = ({
  parties,
  selectedPartyId,
  onSelect,
  onCreateNew,
  createNewLabel = 'Vendor',
  placeholder = 'Select Name or Enter Mobile No.',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  const filteredParties = useMemo(() => {
    if (!query || !isOpen) return parties;
    const lowerQuery = query.toLowerCase();
    return parties.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        (p.phone && p.phone.includes(query))
    );
  }, [parties, query, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredParties.length > 0) {
        onSelect(filteredParties[0].id);
        setQuery(filteredParties[0].name);
        setIsOpen(false);
      } else if (query.trim()) {
        onCreateNew?.(query);
        setIsOpen(false);
      }
    }
  };

  return (
    <div className="flex items-center gap-1.5 relative">
      <div className="relative w-full">
        <input
          type="text"
          value={isOpen ? query : selectedParty?.name || ''}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setQuery('');
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full py-2 px-3 rounded-lg bg-sky-50 dark:bg-slate-800/60 border border-sky-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <ChevronDown className="h-4 w-4" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
            <div className="absolute z-30 top-full mt-1 left-0 w-[450px] max-h-[400px] overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-b-lg">
              {filteredParties.length === 0 ? (
                <div className="p-3 text-sm text-slate-500 flex flex-col items-center gap-2">
                  <span>No exact match found.</span>
                  {onCreateNew && (
                    <button
                      onClick={() => {
                        onCreateNew(query);
                        setIsOpen(false);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm w-full"
                    >
                      + Create New {createNewLabel}: &quot;{query}&quot;
                    </button>
                  )}
                </div>
              ) : (
                filteredParties.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelect(p.id);
                      setQuery(p.name);
                      setIsOpen(false);
                    }}
                    className={`p-2 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${selectedPartyId === p.id ? 'bg-sky-100 dark:bg-sky-900/40' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{p.name}</span>
                      <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{p.balance}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      <div>
                        <span>City: {p.city || 'N/A'}</span>
                        <span className="mx-1">|</span>
                        <span>Mobile No: {p.phone || 'N/A'}</span>
                        {p.gstin && (
                          <>
                            <span className="mx-1">|</span>
                            <span>GSTIN: {p.gstin}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 ml-2">
                        <Edit3 className="h-3.5 w-3.5 text-teal-600 hover:text-teal-500" />
                        <Trash2 className="h-3.5 w-3.5 text-rose-600 hover:text-rose-500" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
      <button
        type="button"
        title={`Search ${createNewLabel}`}
        className="p-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white shrink-0"
      >
        <Search className="h-4 w-4" />
      </button>
    </div>
  );
};
