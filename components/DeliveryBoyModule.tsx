'use client';
import React, { useState, useEffect } from 'react';
import { Truck, Camera, CheckCircle, RefreshCw } from 'lucide-react';

export default function DeliveryBoyModule() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [deliveredQty, setDeliveredQty] = useState('10');
  const [emptyQty, setEmptyQty] = useState('10');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [amount, setAmount] = useState('18500');
  const [proofPhotoUrl, setProofPhotoUrl] = useState('https://placehold.co/400x300?text=Delivery+Proof+Photo');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/cylinder/orders');
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setOrders(json.data);
        setSelectedOrder(json.data[0]);
      } else {
        // Fallback demo order for testing
        setSelectedOrder({
          id: 'demo_ord_1',
          orderNumber: 'CYL-ORD-00001',
          customerName: 'Hotel Rajdhani',
          deliveryAddress: '7 Barakhamba Road, Connaught Place',
          items: [{ productId: 'prod_19kg', productName: '19 KG Commercial LPG Cylinder', orderedQty: 10, unitPrice: 1850 }],
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmitting(true);

    try {
      const payload = {
        orderId: selectedOrder.id,
        deliveryBoyId: 'del_boy_ramesh',
        deliveryBoyName: 'Ramesh Kumar (Delivery Boy)',
        deliveryDate: new Date().toISOString().split('T')[0],
        paymentMode,
        paymentAmount: Number(amount),
        deliveryProofPhotoUrl: proofPhotoUrl,
        items: [
          {
            productId: selectedOrder.items?.[0]?.productId || 'prod_19kg',
            productName: selectedOrder.items?.[0]?.productName || '19 KG Commercial LPG Cylinder',
            deliveredQty: Number(deliveredQty),
            emptyReceivedQty: Number(emptyQty),
            unitPrice: Number(selectedOrder.items?.[0]?.unitPrice || 1850),
          },
        ],
      };

      const res = await fetch('/api/cylinder/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        alert('✅ SUCCESS! Delivery & Photo proof submitted to Accountant for Verification!');
        fetchOrders();
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err: any) {
      alert('Error submitting delivery: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-100 dark:bg-slate-900 p-4 space-y-4">
      {/* Top Header */}
      <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between">
        <div>
          <div className="text-xs uppercase font-bold text-indigo-200">Delivery Boy Mobile App</div>
          <div className="text-lg font-extrabold">Ramesh Kumar</div>
          <div className="text-xs text-indigo-100">Live Database Connected</div>
        </div>
        <Truck className="w-8 h-8 opacity-80" />
      </div>

      {/* Delivery Form */}
      {selectedOrder ? (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border shadow-sm space-y-4">
          <div className="border-b pb-3 flex justify-between items-start">
            <div>
              <div className="text-xs text-indigo-600 font-bold uppercase">{selectedOrder.orderNumber}</div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{selectedOrder.customerName}</div>
              <div className="text-xs text-slate-500">{selectedOrder.deliveryAddress}</div>
            </div>
            <button onClick={fetchOrders} className="p-2 text-slate-400 hover:text-indigo-600">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Delivered Full Cylinders</label>
              <input
                type="number"
                value={deliveredQty}
                onChange={e => setDeliveredQty(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg font-bold text-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Empty Cylinders Received</label>
              <input
                type="number"
                value={emptyQty}
                onChange={e => setEmptyQty(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg font-bold text-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="CASH">Cash on Delivery</option>
                <option value="ONLINE">Online UPI (GPay / PhonePe)</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CREDIT">Credit (On Account)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Collected Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg font-bold text-lg text-emerald-600 focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Delivery / Receipt Photo Proof URL</label>
              <input
                type="text"
                value={proofPhotoUrl}
                onChange={e => setProofPhotoUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" /> {submitting ? 'Submitting to DB...' : 'Submit Delivery to Accountant'}
            </button>
          </form>
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400">Loading Orders...</div>
      )}
    </div>
  );
}
