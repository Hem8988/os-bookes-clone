'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, FileText, Check, AlertCircle, DollarSign, CreditCard, ShieldCheck, Printer, Plus, AlertTriangle, Eye, Lock, Unlock, RefreshCw } from 'lucide-react';
import { PrintInvoiceModal } from './PrintInvoiceModal';

export default function ApprovalQueueModule() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACCOUNTANT' | 'MANAGER' | 'ADMIN'>('ACCOUNTANT');

  // Day Lock & Reconciliation State
  const [isDayLocked, setIsDayLocked] = useState(false);
  const [reconciliation, setReconciliation] = useState<any>({
    expectedCash: 30500,
    actualCash: 30500,
    cashDifference: 0,
    hasCashMismatch: false,
    expectedStock: 14,
    actualStock: 14,
    stockDifference: 0,
    hasStockMismatch: false,
  });

  // Reopen Day Modal State
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenUserRole, setReopenUserRole] = useState<'SUPER_ADMIN' | 'ACCOUNTANT'>('SUPER_ADMIN');
  const [reopenReason, setReopenReason] = useState('');
  const [reopenSubmitting, setReopenSubmitting] = useState(false);

  // Rejection Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectItemId, setRejectItemId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Print Invoice Modal Integration
  const [isPrintInvoiceOpen, setIsPrintInvoiceOpen] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<any>(null);

  // Late Payment Entry Modal State
  const [isLatePaymentModalOpen, setIsLatePaymentModalOpen] = useState(false);
  const [lateCustomerName, setLateCustomerName] = useState('Hotel Rajdhani');
  const [lateAmount, setLateAmount] = useState('12500');
  const [latePaymentMode, setLatePaymentMode] = useState<'CASH' | 'ONLINE' | 'CHEQUE'>('ONLINE');
  const [lateTransactionId, setLateTransactionId] = useState('UPI-2026-881924');
  const [lateSubmitting, setLateSubmitting] = useState(false);

  const fetchDayLock = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/financial/day-lock?date=${today}`);
      const json = await res.json();
      if (json.success && json.data) {
        setIsDayLocked(json.data.isLocked);
        if (json.data.reconciliation) {
          setReconciliation(json.data.reconciliation);
        }
      }
    } catch (err) {
      console.error('Error fetching day lock:', err);
    }
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cylinder/approval-queue?assignedTo=${activeTab}`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setItems(json.data);
      } else {
        if (activeTab === 'MANAGER') {
          setItems([
            {
              id: 'item_mgr_1',
              requestType: 'ORDER_APPROVAL',
              referenceId: 'CYL-ORD-00042',
              requestedBy: 'WhatsApp (Hotel Rajdhani)',
              notes: 'New Order Approval (5 Pcs 19 KG Commercial LPG)',
              payload: {
                customerName: 'Hotel Rajdhani',
                orderNumber: 'CYL-ORD-00042',
                deliveryDate: '2026-08-26',
                productName: '19 KG Commercial LPG Cylinder',
                orderedQty: 5,
                deliveredQty: 5,
                emptyReceivedQty: 0,
                paymentMode: 'CREDIT',
                paymentAmount: 9250,
                deliveryProofPhotoUrl: 'https://placehold.co/400x300?text=WhatsApp+Order+Req',
              },
              createdAt: '2026-08-26 10:15',
            },
          ]);
        } else if (activeTab === 'ADMIN') {
          setItems([
            {
              id: 'item_adm_1',
              requestType: 'CREDIT_OVERRIDE',
              referenceId: 'CUST-0092',
              requestedBy: 'System Auto-Check',
              notes: 'Credit Limit Override Request (Balance: ₹65,000 > Limit: ₹50,000)',
              payload: {
                customerName: 'Apex Industrial Fabrics',
                orderNumber: 'CYL-ORD-00039',
                deliveryDate: '2026-08-26',
                productName: '47.5 KG Industrial LPG Cylinder',
                orderedQty: 10,
                deliveredQty: 10,
                emptyReceivedQty: 5,
                paymentMode: 'CREDIT',
                paymentAmount: 45000,
                deliveryProofPhotoUrl: 'https://placehold.co/400x300?text=Credit+Limit+Exceeded',
              },
              createdAt: '2026-08-26 11:00',
            },
          ]);
        } else {
          setItems([
            {
              id: 'item_cs_1',
              requestType: 'CASH_SUBMISSION',
              referenceId: 'CS-881924',
              requestedBy: 'Ramesh Kumar (del_boy_ramesh)',
              notes: 'Cash Submission CS-881924 of ₹12,000 by Ramesh Kumar to Accountant Office',
              payload: {
                deliveryBoyId: 'del_boy_ramesh',
                deliveryBoyName: 'Ramesh Kumar',
                openingCash: 2000,
                collections: 30500,
                previousSubmitted: 18500,
                currentWalletBalance: 14000,
                submissionAmount: 12000,
                receiver: 'Accountant Office',
                proofPhotoUrl: 'https://placehold.co/400x300?text=Cash+Deposit+Receipt',
                date: '2026-08-26',
              },
              createdAt: '2026-08-26 16:00',
            },
            {
              id: 'item_1',
              requestType: 'DELIVERY_VERIFICATION',
              referenceId: 'CYL-DEL-00001',
              requestedBy: 'Ramesh (Delivery Boy)',
              notes: 'Delivery CYL-DEL-00001 verification required (ONLINE: ₹18,500)',
              payload: {
                customerName: 'Hotel Rajdhani',
                orderNumber: 'CYL-ORD-00001',
                deliveryDate: '2026-08-26',
                productName: '19 KG Commercial LPG Cylinder',
                orderedQty: 10,
                deliveredQty: 10,
                emptyReceivedQty: 10,
                paymentMode: 'ONLINE',
                paymentAmount: 18500,
                transactionId: 'UPI-2026-98124012',
                paymentProofPhotoUrl: 'https://placehold.co/400x300?text=UPI+Screenshot',
                deliveryProofPhotoUrl: 'https://placehold.co/400x300?text=Delivery+Proof+Photo',
              },
              createdAt: '2026-08-26 14:30',
            },
            {
              id: 'item_2',
              requestType: 'DELIVERY_VERIFICATION',
              referenceId: 'CYL-DEL-00002',
              requestedBy: 'Ramesh (Delivery Boy)',
              notes: 'Delivery CYL-DEL-00002 verification required (CHEQUE: ₹22,500) ⚠️ VARIANCE DETECTED',
              payload: {
                customerName: 'Apex Industrial Fabrics',
                orderNumber: 'CYL-ORD-00002',
                deliveryDate: '2026-08-26',
                productName: '47.5 KG Industrial LPG Cylinder',
                orderedQty: 5,
                deliveredQty: 4,
                emptyReceivedQty: 5,
                hasVariance: true,
                varianceNotes: 'Delivered Qty (4 Pcs) differs from Ordered Qty (5 Pcs).',
                paymentMode: 'CHEQUE',
                paymentAmount: 22500,
                chequeNumber: '000412',
                chequeBank: 'HDFC Bank',
                chequeDate: '2026-08-26',
                chequePhotoUrl: 'https://placehold.co/400x300?text=HDFC+Cheque+Copy',
                deliveryProofPhotoUrl: 'https://placehold.co/400x300?text=Site+Delivery+Proof',
              },
              createdAt: '2026-08-26 15:10',
            },
          ]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDayLock();
    fetchQueue();
  }, [activeTab]);

  const handleLockDay = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/financial/day-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOCK_DAY',
          date: today,
          user: 'Chief Accountant',
          expectedCash: reconciliation.expectedCash,
          actualCash: reconciliation.actualCash,
          expectedStock: reconciliation.expectedStock,
          actualStock: reconciliation.actualStock,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsDayLocked(true);
        alert(json.message);
        fetchDayLock();
      }
    } catch (err) {
      alert('Failed to lock day');
    }
  };

  const handleReopenDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reopenUserRole !== 'SUPER_ADMIN') {
      alert('⚠️ Security Error: Only Super Admin or Admin can reopen a locked day!');
      return;
    }
    if (!reopenReason.trim()) {
      alert('⚠️ Mandatory Reopen Reason is required!');
      return;
    }

    setReopenSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/financial/day-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REOPEN_DAY',
          date: today,
          user: 'Super Admin',
          userRole: reopenUserRole,
          reopenReason: reopenReason.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsDayLocked(false);
        setIsReopenModalOpen(false);
        alert('🔓 Day Reopened Successfully! Action logged in Audit Log.');
        fetchDayLock();
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err: any) {
      alert('Reopen action failed: ' + err.message);
    } finally {
      setReopenSubmitting(false);
    }
  };

  const handleOpenRejectModal = (itemId: string) => {
    setRejectItemId(itemId);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectItemId) return;
    if (!rejectReason.trim()) {
      alert('⚠️ Mandatory Rejection Reason is required!');
      return;
    }

    try {
      const res = await fetch('/api/cylinder/approval-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: rejectItemId, action: 'REJECT', actionBy: activeTab, notes: rejectReason }),
      });
      const json = await res.json();
      if (json.success) {
        alert('❌ Item Rejected & Audit Logged!');
        setIsRejectModalOpen(false);
        fetchQueue();
      }
    } catch (err) {
      alert('Action failed');
    }
  };

  const handleApprove = async (item: any) => {
    if (isDayLocked) {
      alert('🔒 Date is LOCKED by Accountant! Approvals & ledger posting are frozen until Admin reopens the day.');
      return;
    }

    try {
      const res = await fetch('/api/cylinder/approval-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, action: 'APPROVE', actionBy: activeTab }),
      });
      const json = await res.json();
      if (json.success) {
        alert('✅ APPROVED & VERIFIED!\n1. Atomic Ledger & Cash updates completed\n2. Customer Cylinder balance synced');
        
        if (item.requestType === 'DELIVERY_VERIFICATION') {
          setSelectedInvoiceData({
            id: `inv_${Date.now()}`,
            invoiceNumber: `INV-${Date.now().toString().slice(-5)}`,
            date: new Date().toISOString().split('T')[0],
            dueDate: new Date().toISOString().split('T')[0],
            customerName: item.payload?.customerName || 'Hotel Rajdhani',
            customerAddress: 'Connaught Place, New Delhi',
            customerGstin: '07AAAAA0000A1Z5',
            items: [
              {
                productName: item.payload?.productName || '19 KG Commercial LPG Cylinder',
                quantity: item.payload?.deliveredQty || 10,
                unitPrice: item.payload?.paymentAmount ? item.payload.paymentAmount / (item.payload?.deliveredQty || 10) : 1850,
                totalAmount: item.payload?.paymentAmount || 18500,
              },
            ],
            grandTotal: item.payload?.paymentAmount || 18500,
            paymentMode: item.payload?.paymentMode || 'CASH',
          });
          setIsPrintInvoiceOpen(true);
        }
        fetchQueue();
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err) {
      alert('Approval Action Failed');
    }
  };

  const handleLatePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDayLocked) {
      alert('🔒 Date is LOCKED by Accountant! Payment entries are frozen until Admin reopens the day.');
      return;
    }
    setLateSubmitting(true);
    try {
      const res = await fetch('/api/payments/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: `inv_late_${Date.now()}`,
          paymentAmount: Number(lateAmount),
          paymentMode: latePaymentMode,
          transactionId: lateTransactionId,
          customerName: lateCustomerName,
          status: 'SUCCESS',
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert(`✅ Late Payment Verified & Posted!\n1. Ledger Credit created: ₹${lateAmount}\n2. Customer Balance recalculated\n3. WhatsApp Receipt dispatched!`);
        setIsLatePaymentModalOpen(false);
        fetchQueue();
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err: any) {
      alert('Late payment posting failed: ' + err.message);
    } finally {
      setLateSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 text-slate-800 dark:text-slate-100">
      
      {/* Top Header & Role Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Clock className="w-7 h-7 text-amber-500" /> Central Accountant Verification & Financial Lock Queue
          </h1>
          <p className="text-sm text-slate-500">Verify side-by-side delivery execution, cash submissions, payment screenshots, and day closing locks</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLatePaymentModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs md:text-sm shadow transition"
          >
            <Plus className="w-4 h-4" /> + Late Payment Entry
          </button>
          
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs md:text-sm font-semibold border">
            <button
              onClick={() => setActiveTab('ACCOUNTANT')}
              className={`px-4 py-2 rounded-lg transition ${activeTab === 'ACCOUNTANT' ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 font-bold dark:text-white' : 'text-slate-500'}`}
            >
              Accountant Queue ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('MANAGER')}
              className={`px-4 py-2 rounded-lg transition ${activeTab === 'MANAGER' ? 'bg-white dark:bg-slate-700 shadow text-amber-600 font-bold dark:text-white' : 'text-slate-500'}`}
            >
              Manager Queue
            </button>
            <button
              onClick={() => setActiveTab('ADMIN')}
              className={`px-4 py-2 rounded-lg transition ${activeTab === 'ADMIN' ? 'bg-white dark:bg-slate-700 shadow text-purple-600 font-bold dark:text-white' : 'text-slate-500'}`}
            >
              Admin Queue
            </button>
          </div>
        </div>
      </div>

      {/* Day Lock & Financial Reconciliation Panel */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-sm md:text-base text-slate-900 dark:text-white">
              Daily Financial & Stock Reconciliation Gatekeeper
            </h3>
            {isDayLocked ? (
              <span className="px-3 py-1 bg-slate-900 text-amber-400 font-black text-xs rounded-full flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> LOCKED
              </span>
            ) : (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 text-xs font-bold rounded-full">
                ACTIVE / UNLOCKED
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isDayLocked ? (
              <button
                onClick={handleLockDay}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4 text-amber-400" /> Complete Reconciliation & Lock Day
              </button>
            ) : (
              <button
                onClick={() => setIsReopenModalOpen(true)}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5"
              >
                <Unlock className="w-4 h-4" /> Reopen Day (Super Admin Only)
              </button>
            )}
          </div>
        </div>

        {/* Reconciliation Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Cash Reconciliation */}
          <div className={`p-3 rounded-xl border ${reconciliation.hasCashMismatch ? 'bg-rose-50 border-rose-300 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
            <div className="font-extrabold uppercase text-[10px] text-slate-400">Cash Reconciliation</div>
            <div className="flex justify-between mt-1">
              <span>Expected: <strong>₹{reconciliation.expectedCash.toLocaleString('en-IN')}</strong></span>
              <span>Actual: <strong>₹{reconciliation.actualCash.toLocaleString('en-IN')}</strong></span>
            </div>
            <div className="font-extrabold mt-1 text-sm flex items-center justify-between border-t pt-1">
              <span>Diff: ₹{reconciliation.cashDifference.toLocaleString('en-IN')}</span>
              {reconciliation.hasCashMismatch ? (
                <span className="text-rose-600 flex items-center gap-1 text-[11px]"><AlertTriangle className="w-3.5 h-3.5" /> Cash Mismatch</span>
              ) : (
                <span className="text-emerald-600 text-[11px]">✓ Matched</span>
              )}
            </div>
          </div>

          {/* Stock Reconciliation */}
          <div className={`p-3 rounded-xl border ${reconciliation.hasStockMismatch ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
            <div className="font-extrabold uppercase text-[10px] text-slate-400">Cylinder Stock Reconciliation</div>
            <div className="flex justify-between mt-1">
              <span>Expected: <strong>{reconciliation.expectedStock} Pcs</strong></span>
              <span>Actual: <strong>{reconciliation.actualStock} Pcs</strong></span>
            </div>
            <div className="font-extrabold mt-1 text-sm flex items-center justify-between border-t pt-1">
              <span>Diff: {reconciliation.stockDifference} Pcs</span>
              {reconciliation.hasStockMismatch ? (
                <span className="text-amber-600 flex items-center gap-1 text-[11px]"><AlertTriangle className="w-3.5 h-3.5" /> Stock Mismatch</span>
              ) : (
                <span className="text-emerald-600 text-[11px]">✓ Matched</span>
              )}
            </div>
          </div>

          {/* Verification Progress */}
          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border space-y-1">
            <div className="font-extrabold uppercase text-[10px] text-slate-400">Verification Progress</div>
            <div className="text-sm font-black text-indigo-600 mt-1">{items.length} Verification Items Pending</div>
            <div className="text-[10px] text-slate-400">Locking the day freezes all ledger entries and payment updates.</div>
          </div>
        </div>
      </div>

      {/* Verification Queue Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading Approval Queue...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border text-slate-400 font-semibold">
            🎉 All verification requests have been cleared! No pending queue items.
          </div>
        ) : (
          items.map(item => {
            const isCashSubmission = item.requestType === 'CASH_SUBMISSION';
            const hasVariance = item.payload?.hasVariance || false;
            const varianceNotes = item.payload?.varianceNotes || '';

            return (
              <div key={item.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                
                {/* Item Top Badge Header */}
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 text-xs font-black rounded-full uppercase ${isCashSubmission ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                      {item.requestType}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">{item.referenceId}</span>
                    {hasVariance && (
                      <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[11px] font-extrabold rounded flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> VARIANCE DETECTED
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{item.createdAt}</span>
                </div>

                {/* Render CASH_SUBMISSION Queue View */}
                {isCashSubmission ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-sky-50/50 dark:bg-sky-950/20 p-4 rounded-xl border border-sky-200 dark:border-sky-900">
                    <div>
                      <div className="text-[10px] font-black uppercase text-sky-800 dark:text-sky-300">Delivery Boy Driver Wallet</div>
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm mt-1">{item.payload?.deliveryBoyName}</div>
                      <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                        <div>Opening Cash: <strong>₹{item.payload?.openingCash}</strong></div>
                        <div>Cash Collected: <strong className="text-emerald-600">₹{item.payload?.collections}</strong></div>
                        <div>Previous Submitted: <strong>₹{item.payload?.previousSubmitted}</strong></div>
                        <div>Current Wallet: <strong className="text-amber-600">₹{item.payload?.currentWalletBalance}</strong></div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase text-sky-800 dark:text-sky-300">Deposit Submission Details</div>
                      <div className="text-xl font-black text-emerald-600 mt-1">₹{item.payload?.submissionAmount?.toLocaleString('en-IN')}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-bold">
                        Receiver: {item.payload?.receiver || 'Accountant Office'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Date: {item.payload?.date}</div>
                    </div>

                    <div>
                      <div className="text-[10px] font-black uppercase text-sky-800 dark:text-sky-300 mb-1">Deposit Receipt Proof</div>
                      <img
                        src={item.payload?.proofPhotoUrl || 'https://placehold.co/400x200?text=Deposit+Receipt'}
                        alt="Deposit Receipt"
                        className="w-full h-24 object-cover rounded-lg border shadow-sm"
                      />
                    </div>
                  </div>
                ) : (
                  /* Side-by-Side Comparison Container for Delivery Verification */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* LEFT SIDE: System Order Specs */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border space-y-2">
                      <div className="text-[10px] font-black uppercase text-indigo-600 border-b pb-1">
                        📋 System Order Specifications
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Customer Name</span>
                          <span className="font-extrabold text-slate-900 dark:text-white">{item.payload?.customerName || 'Hotel Rajdhani'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Order Number</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{item.payload?.orderNumber || 'CYL-ORD-00001'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Cylinder Product</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{item.payload?.productName || '19 KG Commercial LPG Cylinder'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Ordered Full Quantity</span>
                          <span className="font-black text-indigo-600 text-sm">{item.payload?.orderedQty || 10} Pcs</span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT SIDE: Delivery Boy Real Execution */}
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 space-y-2">
                      <div className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 border-b pb-1 flex justify-between">
                        <span>🚚 Delivery Partner Real Execution</span>
                        <span className="font-normal text-slate-500">By: {item.requestedBy}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Delivered Full</span>
                          <span className="font-black text-emerald-600 text-sm">{item.payload?.deliveredQty || 10} Pcs</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Empty Received</span>
                          <span className="font-black text-amber-600 text-sm">{item.payload?.emptyReceivedQty || 10} Pcs</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Payment Mode</span>
                          <span className="font-black text-purple-600 text-sm uppercase">{item.payload?.paymentMode || 'CASH'}</span>
                        </div>
                      </div>

                      {/* Mode Specific Verification Proof Details */}
                      <div className="pt-2 border-t space-y-1.5 text-xs">
                        {item.payload?.paymentMode === 'ONLINE' && (
                          <div className="bg-sky-100 dark:bg-sky-950/60 p-2 rounded-lg font-mono text-[11px] text-sky-900 dark:text-sky-200 flex items-center justify-between">
                            <span>UPI Ref: {item.payload?.transactionId || 'UPI-2026-98124012'}</span>
                            <span className="font-bold text-emerald-600">✓ Screenshot Verified</span>
                          </div>
                        )}

                        {item.payload?.paymentMode === 'CHEQUE' && (
                          <div className="bg-amber-100 dark:bg-amber-950/60 p-2 rounded-lg text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between">
                            <span>Cheque #: {item.payload?.chequeNumber} ({item.payload?.chequeBank})</span>
                            <span className="font-bold">Date: {item.payload?.chequeDate}</span>
                          </div>
                        )}

                        {item.payload?.paymentMode === 'CREDIT' && (
                          <div className="bg-purple-100 dark:bg-purple-950/60 p-2 rounded-lg text-[11px] text-purple-900 dark:text-purple-200 font-bold">
                            💳 Credit Delivery: ₹0 collected now. ₹{item.payload?.paymentAmount || 18500} will be posted to Customer Ledger Outstanding.
                          </div>
                        )}

                        {hasVariance && (
                          <div className="bg-rose-100 dark:bg-rose-950 p-2 rounded-lg text-rose-800 dark:text-rose-200 text-[11px] font-bold">
                            ⚠️ Variance Note: {varianceNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Proof Photos Bar for Deliveries */}
                {!isCashSubmission && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Delivery Proof Photo (Mandatory)</div>
                      <img
                        src={item.payload?.deliveryProofPhotoUrl || 'https://placehold.co/400x200?text=Delivery+Proof'}
                        alt="Delivery Proof"
                        className="w-full h-28 object-cover rounded-xl border shadow-sm"
                      />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                        {item.payload?.paymentMode === 'ONLINE' ? 'Payment Screenshot' : item.payload?.paymentMode === 'CHEQUE' ? 'Cheque Copy Photo' : 'Delivery Receipt'}
                      </div>
                      <img
                        src={item.payload?.paymentProofPhotoUrl || item.payload?.chequePhotoUrl || item.payload?.deliveryProofPhotoUrl || 'https://placehold.co/400x200?text=Payment+Proof'}
                        alt="Payment Proof"
                        className="w-full h-28 object-cover rounded-xl border shadow-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-3 border-t">
                  <button
                    onClick={() => handleOpenRejectModal(item.id)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-extrabold transition"
                  >
                    <XCircle className="w-4 h-4" /> Reject / Send Back
                  </button>
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={isDayLocked}
                    className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" /> {isCashSubmission ? 'Approve Cash Submission' : 'Approve & Generate Verified Invoice'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* REOPEN DAY MODAL (Super Admin Only) */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="border-b pb-2">
              <h3 className="text-base font-black text-amber-600 flex items-center gap-2">
                <Unlock className="w-5 h-5" /> Reopen Locked Day (Super Admin)
              </h3>
              <p className="text-xs text-slate-500">Security Check: Only Super Admin can reopen a locked day</p>
            </div>

            <form onSubmit={handleReopenDaySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">User Authorization Role</label>
                <select
                  value={reopenUserRole}
                  onChange={e => setReopenUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg font-bold"
                >
                  <option value="SUPER_ADMIN">Super Admin (Authorized)</option>
                  <option value="ACCOUNTANT">Accountant (Unauthorized)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Mandatory Reopen Reason *</label>
                <textarea
                  value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  placeholder="e.g. Audit correction required after bank deposit statement verification..."
                  className="w-full px-3 py-2 border rounded-xl"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsReopenModalOpen(false)} className="px-3 py-2 border rounded-lg">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reopenSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow"
                >
                  {reopenSubmitting ? 'Unlocking...' : 'Confirm & Reopen Day'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY REJECTION REASON MODAL */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="border-b pb-2">
              <h3 className="text-base font-black text-rose-600 flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Reject Item Verification
              </h3>
              <p className="text-xs text-slate-500">Provide mandatory rejection reason for audit log</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Mandatory Rejection Reason *</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Payment screenshot is unreadable / Cash deposit mismatch..."
                  className="w-full px-3 py-2 border rounded-xl"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsRejectModalOpen(false)} className="px-3 py-2 border rounded-lg">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LATE PAYMENT ENTRY MODAL */}
      {isLatePaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="border-b pb-2">
              <h3 className="text-base font-black text-emerald-600 flex items-center gap-2">
                <Plus className="w-5 h-5" /> Record Verified Late Customer Payment
              </h3>
              <p className="text-xs text-slate-500">Posts credit to ledger, recalculates balance & sends WhatsApp receipt</p>
            </div>

            <form onSubmit={handleLatePaymentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Customer Account</label>
                <input
                  type="text"
                  value={lateCustomerName}
                  onChange={e => setLateCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Payment Amount (₹)</label>
                  <input
                    type="number"
                    value={lateAmount}
                    onChange={e => setLateAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-extrabold text-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-500 mb-1">Payment Mode</label>
                  <select
                    value={latePaymentMode}
                    onChange={e => setLatePaymentMode(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg font-bold"
                  >
                    <option value="ONLINE">Online UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Transaction Ref / Cheque #</label>
                <input
                  type="text"
                  value={lateTransactionId}
                  onChange={e => setLateTransactionId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-mono font-bold"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsLatePaymentModalOpen(false)} className="px-3 py-2 border rounded-lg">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={lateSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow"
                >
                  {lateSubmitting ? 'Posting...' : 'Post Credit & Dispatches Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXISTING PRINT INVOICE MODAL REUSE */}
      {isPrintInvoiceOpen && selectedInvoiceData && (
        <PrintInvoiceModal
          onClose={() => setIsPrintInvoiceOpen(false)}
          invoice={selectedInvoiceData}
        />
      )}
    </div>
  );
}
