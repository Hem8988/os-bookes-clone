'use client';

import React, { useState } from 'react';
import { MessageSquare, Send, QrCode, FileText, CheckCircle2, Copy, Bot, Bell, ShieldCheck, UserCheck } from 'lucide-react';

export default function WhatsAppInvoiceSenderModule() {
  const [phone, setPhone] = useState('9876543210');
  const [customerName, setCustomerName] = useState('Hotel Rajdhani');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-00142');
  const [amount, setAmount] = useState('18500');
  const [upiId, setUpiId] = useState('pramukhindane@upi');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Simulator State
  const [simPhone, setSimPhone] = useState('9876543210');
  const [simText, setSimText] = useState('Hi');
  const [simLog, setSimLog] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    { sender: 'bot', text: '🏢 PRAMUKH INDANE B2B CYLINDER ERP\n\nNamaste Hotel Rajdhani!\n1. Place Order\n2. Order History\n3. Outstanding Balance\n4. Cylinder Site Stock\n5. Payment History\n6. Tax Invoice\n7. Support', time: '10:00 AM' }
  ]);
  const [simulating, setSimulating] = useState(false);

  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(customerName)}&am=${amount}&cu=INR&tn=${invoiceNumber}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

  const handleSimulateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simText.trim()) return;

    const userMessage = simText.trim();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setSimLog(prev => [...prev, { sender: 'user', text: userMessage, time }]);
    setSimText('');
    setSimulating(true);

    try {
      const res = await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: simPhone,
          text: userMessage,
          messageId: `sim_${Date.now()}`,
        }),
      });

      const json = await res.json();
      if (json.status === 'success') {
        setSimLog(prev => [
          ...prev,
          {
            sender: 'bot',
            text: `[Bot Response Executed for "${userMessage}"] Check WhatsApp / Terminal logs. Response sent to ${simPhone}.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleSendOutboundTemplate = async (templateType: string) => {
    setSending(true);
    try {
      let text = '';
      if (templateType === 'ORDER_RECEIVED') {
        text = `✅ ORDER RECEIVED!\nOrder #: CYL-ORD-00045\nCustomer: ${customerName}\nItem: 19 KG Commercial LPG (10 Pcs)\nStatus: Pending Manager Approval.`;
      } else if (templateType === 'ORDER_APPROVED') {
        text = `🎉 ORDER APPROVED!\nOrder #: CYL-ORD-00045\nStatus: Approved by Manager.\nDriver: Ramesh Kumar\nScheduled for dispatch!`;
      } else if (templateType === 'OUT_FOR_DELIVERY') {
        text = `🚛 OUT FOR DELIVERY!\nOrder #: CYL-ORD-00045\nDriver: Ramesh Kumar\nDelivery vehicle is en route to site.`;
      } else if (templateType === 'DELIVERY_COMPLETED') {
        text = `✅ DELIVERY COMPLETED!\nDelivery #: CYL-DEL-00001\nDelivered: 10 Full Cylinders\nEmpty Received: 10 Empty Cylinders\nPayment: CASH (₹18,500)`;
      } else if (templateType === 'OUTSTANDING_REMINDER') {
        text = `⚠️ OUTSTANDING BALANCE REMINDER!\nCustomer: ${customerName}\nCurrent Balance: ₹65,000\nCredit Limit: ₹50,000\nKripya UPI/Bank Transfer dwara payment karein.`;
      }

      await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: phone, text }),
      });

      alert(`✅ Outbound Notification Template [${templateType}] dispatched to ${phone}!`);
    } catch (err) {
      alert('Failed to send outbound template');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 space-y-6 text-slate-800 dark:text-slate-100">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-emerald-600" /> WhatsApp Business Ordering & Outbound Notifications Suite
          </h1>
          <p className="text-sm text-slate-500">Official company WhatsApp channel simulator, interactive self-service bot, and 10 outbound template dispatches</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT PANEL: Interactive WhatsApp Bot Simulator */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-600" /> Live WhatsApp Bot Simulator
              </h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
                Central Channel: Official Agency #
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="font-bold text-slate-500">Simulated Customer Phone:</label>
              <input
                type="text"
                value={simPhone}
                onChange={e => setSimPhone(e.target.value)}
                className="px-3 py-1 border rounded-lg font-mono font-bold w-36"
              />
              <span className="text-[10px] text-slate-400">(Must match registered customer)</span>
            </div>

            {/* Chat Messages Container */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl h-80 overflow-y-auto space-y-3 font-sans text-xs border border-slate-800">
              {simLog.map((log, index) => (
                <div key={index} className={`flex flex-col ${log.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl whitespace-pre-line ${log.sender === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                    {log.text}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 px-1">{log.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Simulator Shortcuts & Input */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex gap-1.5 flex-wrap text-[11px]">
              <button onClick={() => setSimText('Hi')} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 rounded-lg font-bold">"Hi"</button>
              <button onClick={() => setSimText('1')} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 rounded-lg font-bold">1 (Order)</button>
              <button onClick={() => setSimText('10')} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 rounded-lg font-bold">10 Qty</button>
              <button onClick={() => setSimText('DATE_TODAY')} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 rounded-lg font-bold">Today Date</button>
              <button onClick={() => setSimText('CONFIRM_YES')} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 rounded-lg font-bold">Confirm ✅</button>
              <button onClick={() => setSimText('3')} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 rounded-lg font-bold">3 (Balance)</button>
              <button onClick={() => setSimText('4')} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-emerald-50 rounded-lg font-bold">4 (Stock)</button>
            </div>

            <form onSubmit={handleSimulateMessage} className="flex gap-2">
              <input
                type="text"
                value={simText}
                onChange={e => setSimText(e.target.value)}
                placeholder="Type simulated customer message (e.g. Hi, 1, 5, 3)..."
                className="flex-1 px-3 py-2 border rounded-xl font-semibold text-xs text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={simulating}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow transition text-xs flex items-center gap-1"
              >
                <Send className="w-4 h-4" /> Send
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: Outbound Templates & Quick QR Dispatch */}
        <div className="space-y-6">
          
          {/* Outbound Notification Templates Control */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white border-b pb-3 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" /> Outbound Notification Template Dispatcher
            </h2>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleSendOutboundTemplate('ORDER_RECEIVED')}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50 border rounded-xl font-bold text-left text-slate-700 dark:text-slate-200"
              >
                📥 Order Received
              </button>
              <button
                onClick={() => handleSendOutboundTemplate('ORDER_APPROVED')}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50 border rounded-xl font-bold text-left text-slate-700 dark:text-slate-200"
              >
                🎉 Order Approved
              </button>
              <button
                onClick={() => handleSendOutboundTemplate('OUT_FOR_DELIVERY')}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50 border rounded-xl font-bold text-left text-slate-700 dark:text-slate-200"
              >
                🚛 Out for Delivery
              </button>
              <button
                onClick={() => handleSendOutboundTemplate('DELIVERY_COMPLETED')}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50 border rounded-xl font-bold text-left text-slate-700 dark:text-slate-200"
              >
                ✅ Delivery Completed
              </button>
              <button
                onClick={() => handleSendOutboundTemplate('OUTSTANDING_REMINDER')}
                className="p-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50 border rounded-xl font-bold text-left text-slate-700 dark:text-slate-200 col-span-2"
              >
                ⚠️ Outstanding Balance Reminder
              </button>
            </div>
          </div>

          {/* Existing Payment QR Dispatch Tool */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-emerald-400 flex items-center gap-2 text-xs">
                <QrCode className="w-4 h-4" /> Payment UPI QR Link Generator
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full">UPI Auto-Reconciled</span>
            </div>

            <div className="flex items-center justify-center p-3 bg-white rounded-xl">
              <img src={qrUrl} alt="UPI QR Code" className="w-36 h-36 object-contain" />
            </div>

            <div className="text-[11px] font-mono text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="text-emerald-400 break-all">{upiUrl}</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
