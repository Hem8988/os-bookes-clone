'use client';

import React, { useState } from 'react';
import { X, Clock, Calendar, Phone, ChevronDown } from 'lucide-react';
import { Customer, FollowUp, FollowUpType } from '../lib/types';

interface CustomerFollowUpModalProps {
  isOpen: boolean;
  customer: Customer | null;
  followUps: FollowUp[];
  onClose: () => void;
  onAddFollowUp: (followUp: FollowUp) => void;
}

const FOLLOW_UP_TYPES: FollowUpType[] = ['Call', 'WhatsApp', 'Email', 'SMS', 'Visit', 'Meeting', 'Other'];

const FOLLOW_UP_TYPE_STYLES: Record<FollowUpType, string> = {
  Call: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300',
  WhatsApp: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300',
  Email: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300',
  SMS: 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300',
  Visit: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300',
  Meeting: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300',
  Other: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
};

export const CustomerFollowUpModal: React.FC<CustomerFollowUpModalProps> = ({
  isOpen,
  customer,
  followUps,
  onClose,
  onAddFollowUp,
}) => {
  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  const [followUpType, setFollowUpType] = useState<FollowUpType>('Call');
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState(getTodayDateString());

  if (!isOpen || !customer) return null;

  const sortedFollowUps = [...followUps].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      alert('Please enter a follow-up note');
      return;
    }

    onAddFollowUp({
      id: `followup-${Date.now()}`,
      customerId: customer.id,
      type: followUpType,
      note: note.trim(),
      followUpDate,
      createdAt: getTodayDateString(),
    });

    setFollowUpType('Call');
    setNote('');
    setFollowUpDate(getTodayDateString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden my-4 border border-slate-200 dark:border-slate-800">

        {/* Header */}
        <div className="bg-[#00a8b5] px-5 py-3 flex items-center justify-between text-white shadow-sm">
          <h2 className="text-base font-extrabold tracking-wide flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Follow-up: {customer.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 bg-[#dc3545] hover:bg-red-700 text-white rounded transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5 font-extrabold" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Phone className="h-3.5 w-3.5" />
            <span>{customer.phone}</span>
          </div>

          {/* Follow-up History */}
          <div className="space-y-1">
            <label className="font-bold text-slate-900 dark:text-slate-100 block">Follow-up History</label>
            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {sortedFollowUps.length === 0 ? (
                <div className="px-3 py-4 text-center text-slate-400 italic">
                  No follow-ups logged yet.
                </div>
              ) : (
                sortedFollowUps.map((f) => (
                  <div key={f.id} className="px-3 py-2.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${FOLLOW_UP_TYPE_STYLES[f.type] || FOLLOW_UP_TYPE_STYLES.Other}`}>
                        {f.type || 'Other'}
                      </span>
                    </div>
                    <div className="text-slate-800 dark:text-slate-200 font-medium">{f.note}</div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Next: {f.followUpDate}
                      </span>
                      <span>Logged: {f.createdAt}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Follow-up Form */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="space-y-1 max-w-xs">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Follow-up Type</label>
              <div className="relative">
                <select
                  value={followUpType}
                  onChange={(e) => setFollowUpType(e.target.value as FollowUpType)}
                  className="w-full px-3 py-2 pr-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 appearance-none focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer font-bold"
                >
                  {FOLLOW_UP_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Follow-up Note</label>
              <textarea
                required
                rows={3}
                placeholder="Enter follow-up details (e.g. called for payment, promised by...)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400 resize-none"
              />
            </div>

            <div className="space-y-1 max-w-xs">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Next Follow-up Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="submit"
                className="px-5 py-2 rounded bg-[#28a745] hover:bg-emerald-700 text-white font-extrabold text-xs shadow transition-colors cursor-pointer"
              >
                + Add Follow-up
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded bg-[#dc3545] hover:bg-red-700 text-white font-extrabold text-xs shadow transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
