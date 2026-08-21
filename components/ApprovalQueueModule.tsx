'use client';
import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, FileText, Check, AlertCircle } from 'lucide-react';

export default function ApprovalQueueModule() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MANAGER' | 'ACCOUNTANT'>('ACCOUNTANT');

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cylinder/approval-queue?assignedTo=${activeTab}`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setItems(json.data);
      } else {
        setItems([
          {
            id: 'item_1',
            requestType: 'DELIVERY_VERIFICATION',
            referenceId: 'CYL-DEL-00001',
            requestedBy: 'Ramesh (Delivery Boy)',
            notes: 'Delivery CYL-DEL-00001 verification required (CASH: ₹12,000)',
            payload: {
              customerName: 'Hotel Rajdhani',
              deliveredQty: 10,
              emptyReceivedQty: 10,
              paymentMode: 'CASH',
              paymentAmount: 12000,
              deliveryProofPhotoUrl: 'https://placehold.co/400x300?text=Delivery+Proof+Photo'
            },
            createdAt: '2026-08-21 14:30'
          }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [activeTab]);

  const handleAction = async (itemId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch('/api/cylinder/approval-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, action, actionBy: activeTab }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Item ${action === 'APPROVE' ? 'Approved & Invoice Generated!' : 'Rejected'}`);
        fetchQueue();
      }
    } catch (err) {
      alert('Action failed');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Clock className="w-7 h-7 text-amber-500" /> Central Approval & Verification Queue
          </h1>
          <p className="text-sm text-slate-500">Manager & Accountant verification gatekeeper before ledger/invoice posting</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('ACCOUNTANT')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${activeTab === 'ACCOUNTANT' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}
          >
            Accountant Queue
          </button>
          <button
            onClick={() => setActiveTab('MANAGER')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${activeTab === 'MANAGER' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}
          >
            Manager Queue
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase">
                {item.requestType}
              </span>
              <span className="text-xs text-slate-400">{item.createdAt}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Customer / Order</div>
                <div className="font-bold text-slate-800 dark:text-white text-base mt-1">{item.payload?.customerName || 'Customer'}</div>
                <div className="text-xs text-slate-500">Submitted by: {item.requestedBy}</div>
              </div>

              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Execution Details</div>
                <div className="text-sm text-slate-700 dark:text-slate-300 mt-1 font-medium">
                  Delivered: <span className="font-bold text-emerald-600">{item.payload?.deliveredQty || 10} Pcs</span>
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  Empty Received: <span className="font-bold text-amber-600">{item.payload?.emptyReceivedQty || 10} Pcs</span>
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  Payment: <span className="font-bold text-indigo-600">{item.payload?.paymentMode || 'CASH'}: ₹{item.payload?.paymentAmount || 12000}</span>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Proof Photo Uploaded</div>
                <img 
                  src={item.payload?.deliveryProofPhotoUrl || 'https://placehold.co/300x150?text=Photo+Proof'} 
                  alt="Delivery Proof" 
                  className="w-full h-24 object-cover rounded border mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => handleAction(item.id, 'REJECT')}
                className="flex items-center gap-1.5 px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-semibold transition"
              >
                <XCircle className="w-4 h-4" /> Reject (Send Back)
              </button>
              <button
                onClick={() => handleAction(item.id, 'APPROVE')}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow transition"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve & Generate Invoice
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
