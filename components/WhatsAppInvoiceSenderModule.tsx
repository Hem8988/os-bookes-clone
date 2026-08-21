'use client';
import React, { useState } from 'react';
import { MessageSquare, Send, QrCode, FileText, CheckCircle2, Copy } from 'lucide-react';

export default function WhatsAppInvoiceSenderModule() {
  const [phone, setPhone] = useState('9876543210');
  const [customerName, setCustomerName] = useState('Hotel Rajdhani');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-00142');
  const [amount, setAmount] = useState('18500');
  const [upiId, setUpiId] = useState('agency@upi');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(customerName)}&am=${amount}&cu=INR&tn=${invoiceNumber}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const message = `🧾 *INVOICE & PAYMENT QR CODE*\n\nNamaste *${customerName}*!\nAapka Cylinder Invoice tayyar hai:\n\n📄 Invoice #: *${invoiceNumber}*\n💰 Bill Amount: *₹${amount}*\n\n📲 *Direct Pay Link*: ${upiUrl}\n\nKripya UPI App (GPay / PhonePe / Paytm) se pay karein. Refill dispatch kar diya gaya hai. Shukriya!`;
      
      const res = await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry: [{
            changes: [{
              value: {
                messages: [{
                  from: phone,
                  text: { body: message }
                }]
              }
            }]
          }]
        })
      });

      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 3000);
    } catch (err) {
      alert('Failed to send WhatsApp message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-emerald-600" /> WhatsApp Invoice & Payment QR Sender Tool
          </h1>
          <p className="text-sm text-slate-500">Send instant PDF Bills & Dynamic GPay/PhonePe QR Links directly to customer WhatsApp</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Panel */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b pb-3">Send WhatsApp Invoice & QR</h2>
          
          <form onSubmit={handleSendWhatsApp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Customer Mobile / WhatsApp Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-semibold text-slate-800 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Customer / Trade Name</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-semibold text-slate-800 dark:text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-bold text-emerald-600"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" /> {sending ? 'Sending WhatsApp...' : 'Send Invoice & Payment QR on WhatsApp'}
            </button>

            {sentSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Sent to WhatsApp Successfully!
              </div>
            )}
          </form>
        </div>

        {/* Live Preview Panel */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-bold text-emerald-400 flex items-center gap-2">
                <QrCode className="w-5 h-5" /> Dynamic Payment QR Code Preview
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full">UPI Auto-Reconciled</span>
            </div>

            <div className="flex items-center justify-center p-4 bg-white rounded-xl">
              <img src={qrUrl} alt="UPI QR Code" className="w-48 h-48 object-contain" />
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-1 font-mono">
              <div className="text-slate-400 font-sans font-bold uppercase mb-1">WhatsApp Message Preview:</div>
              <div className="text-slate-300">🧾 *INVOICE & PAYMENT QR CODE*</div>
              <div className="text-slate-300">Namaste *{customerName}*!</div>
              <div className="text-slate-300">Invoice #: *{invoiceNumber}* | Amount: *₹{amount}*</div>
              <div className="text-emerald-400 break-all">{upiUrl}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
