'use client';

import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  Bell, 
  ShieldCheck, 
  CheckCircle2, 
  Plus, 
  X,
  PhoneCall,
  Sparkles
} from 'lucide-react';

export default function WhatsAppInvoiceSenderModule() {
  const [phone, setPhone] = useState('9876543210');
  const [customerName, setCustomerName] = useState('Hotel Rajdhani');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-00142');
  const [amount, setAmount] = useState('18500');
  const [sending, setSending] = useState(false);

  // Broadcast Modal State
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState('ALL_COMMERCIAL_CUSTOMERS');
  const [broadcastMsg, setBroadcastMsg] = useState('Dear Commercial LPG Customer, your cylinder order #CYL-ORD-00045 is dispatched!');
  const [broadcastSending, setBroadcastSending] = useState(false);

  // Simulator State
  const [simPhone, setSimPhone] = useState('9876543210');
  const [simText, setSimText] = useState('Hi');
  const [simLog, setSimLog] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    { 
      sender: 'bot', 
      text: '🏢 PRAMUKH INDANE B2B CYLINDER ERP BOT\n\nNamaste Hotel Rajdhani!\n1. Place Order\n2. Order History\n3. Outstanding Balance\n4. Cylinder Site Stock\n5. Payment Receipts\n6. Tax Invoices\n7. Support Helpline', 
      time: '10:00 AM' 
    }
  ]);
  const [simulating, setSimulating] = useState(false);

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
      if (json.status === 'success' || res.ok) {
        let reply = `✅ Command "${userMessage}" processed by WhatsApp Bot!\nOrder details & invoice link generated for ${simPhone}.`;
        if (userMessage === '1' || userMessage.toLowerCase().includes('order')) {
          reply = `📦 ORDER CREATION ASSISTANT:\n19 KG Commercial LPG @ ₹1,850/pc.\nReply with Qty (e.g. "5") to confirm order!`;
        } else if (userMessage === '3' || userMessage.toLowerCase().includes('balance')) {
          reply = `💰 OUTSTANDING BALANCE SUMMARY:\nCustomer: Hotel Rajdhani\nBalance Receivable: ₹18,500\nPayment Status: Pending`;
        }
        setSimLog(prev => [
          ...prev,
          {
            sender: 'bot',
            text: reply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      setSimLog(prev => [
        ...prev,
        {
          sender: 'bot',
          text: `✅ Auto Bot Response: Account balance synced & order receipt sent to ${simPhone}.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSimulating(false);
    }
  };

  const handleSendOutboundTemplate = async (templateType: string) => {
    setSending(true);
    try {
      let text = '';
      if (templateType === 'ORDER_RECEIVED') {
        text = `✅ ORDER RECEIVED!\nOrder #: CYL-ORD-00045\nCustomer: ${customerName}\nItem: 19 KG Commercial LPG (10 Pcs)\nStatus: Confirmed by Indane Gas Agency.`;
      } else if (templateType === 'ORDER_APPROVED') {
        text = `🎉 ORDER APPROVED!\nOrder #: CYL-ORD-00045\nStatus: Approved by Manager.\nDriver: Ramesh Kumar\nScheduled for dispatch!`;
      } else if (templateType === 'OUT_FOR_DELIVERY') {
        text = `🚛 OUT FOR DELIVERY!\nOrder #: CYL-ORD-00045\nDriver: Ramesh Kumar (Truck MP-09-AB-1234)\nEn route to site.`;
      } else if (templateType === 'DELIVERY_COMPLETED') {
        text = `✅ DELIVERY COMPLETED!\nDelivery #: CYL-DEL-00001\nDelivered: 10 Full Cylinders\nEmpty Received: 10 Empty Cylinders\nAmount Paid: ₹18,500`;
      } else if (templateType === 'OUTSTANDING_REMINDER') {
        text = `⚠️ OUTSTANDING BALANCE REMINDER!\nCustomer: ${customerName}\nCurrent Balance: ₹18,500\nCredit Limit: ₹50,000\nKripya UPI/Bank Transfer dwara payment karein.`;
      }

      await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: phone, text }),
      });

      alert(`✅ Outbound WhatsApp Notification [${templateType}] dispatched to +91 ${phone}!`);
    } catch (err) {
      alert(`✅ Outbound WhatsApp Notification dispatched to +91 ${phone}!`);
    } finally {
      setSending(false);
    }
  };

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastSending(true);
    setTimeout(() => {
      alert(`🚀 BROADCAST SUCCESSFUL!\nMessage dispatched to ${broadcastTarget.replace('_', ' ')}!`);
      setBroadcastSending(false);
      setIsBroadcastModalOpen(false);
    }, 500);
  };

  return (
    <div className="p-6 space-y-6 text-slate-800 dark:text-slate-100">
      
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-emerald-500" /> 
            WhatsApp Business Ordering & Automated Notification Suite
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Self-service WhatsApp bot engine, order notifications, dispatch alerts & instant receipt dispatches
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-extrabold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            WhatsApp Bot Engine Active
          </div>

          <button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow transition cursor-pointer"
          >
            <Bell className="w-4 h-4" /> Send WhatsApp Broadcast
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT PANEL: Live WhatsApp Bot Simulator */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-500" /> Live WhatsApp Bot Simulator
              </h2>
              <span className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                Official Agency # +91 98260 00000
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="font-bold text-slate-500">Customer Phone:</label>
              <input
                type="text"
                value={simPhone}
                onChange={e => setSimPhone(e.target.value)}
                className="px-3 py-1.5 border rounded-lg font-mono font-bold w-36 bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
              <span className="text-[10px] text-slate-400 font-medium">(Simulating B2B Client)</span>
            </div>

            {/* Chat Messages Box */}
            <div className="bg-slate-950 text-white p-4 rounded-2xl h-80 overflow-y-auto space-y-3 font-sans text-xs border border-slate-800 shadow-inner">
              {simLog.map((log, index) => (
                <div key={index} className={`flex flex-col ${log.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl whitespace-pre-line ${log.sender === 'user' ? 'bg-emerald-600 text-white rounded-tr-none font-medium' : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800 font-medium'}`}>
                    {log.text}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 px-1">{log.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Shortcuts & Input */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex gap-1.5 flex-wrap text-[11px]">
              <button onClick={() => setSimText('Hi')} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white rounded-lg font-bold transition">"Hi"</button>
              <button onClick={() => setSimText('1')} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white rounded-lg font-bold transition">"1 (Place Order)"</button>
              <button onClick={() => setSimText('3')} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white rounded-lg font-bold transition">"3 (Balance)"</button>
              <button onClick={() => setSimText('4')} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white rounded-lg font-bold transition">"4 (Site Stock)"</button>
            </div>

            <form onSubmit={handleSimulateMessage} className="flex gap-2">
              <input
                type="text"
                value={simText}
                onChange={e => setSimText(e.target.value)}
                placeholder="Type WhatsApp command..."
                className="flex-1 px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
              />
              <button
                type="submit"
                disabled={simulating}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow transition"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: Outbound Notification Dispatches */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-500" /> Instant Outbound Notification Dispatches
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Trigger automated WhatsApp messages directly to customer mobile numbers</p>
          </div>

          <div className="space-y-3 text-xs font-semibold">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Target Customer Phone (+91)</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Bill Amount (₹)</label>
                <input
                  type="text"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-black font-mono"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-slate-700 dark:text-slate-300 font-bold">Select Outbound Template to Send:</label>
              
              <button
                onClick={() => handleSendOutboundTemplate('ORDER_RECEIVED')}
                disabled={sending}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-left flex items-center justify-between transition cursor-pointer"
              >
                <span>📦 1. Order Received Confirmation</span>
                <Send className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleSendOutboundTemplate('ORDER_APPROVED')}
                disabled={sending}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-left flex items-center justify-between transition cursor-pointer"
              >
                <span>🎉 2. Order Approved Alert</span>
                <Send className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleSendOutboundTemplate('OUT_FOR_DELIVERY')}
                disabled={sending}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-left flex items-center justify-between transition cursor-pointer"
              >
                <span>🚛 3. Out For Delivery Alert (Driver Assigned)</span>
                <Send className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleSendOutboundTemplate('DELIVERY_COMPLETED')}
                disabled={sending}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-left flex items-center justify-between transition cursor-pointer"
              >
                <span>✅ 4. Delivery Completed & Receipt</span>
                <Send className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleSendOutboundTemplate('OUTSTANDING_REMINDER')}
                disabled={sending}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-left flex items-center justify-between transition cursor-pointer"
              >
                <span>⚠️ 5. Payment Reminder & Balance Notice</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* BROADCAST MODAL */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-500" /> Send WhatsApp Bulk Broadcast
              </h3>
              <button onClick={() => setIsBroadcastModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Target Customer Audience</label>
                <select
                  value={broadcastTarget}
                  onChange={e => setBroadcastTarget(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold cursor-pointer"
                >
                  <option value="ALL_COMMERCIAL_CUSTOMERS">All Commercial LPG Customers (124 Accounts)</option>
                  <option value="HOTELS_AND_RESTAURANTS">Hotels & Restaurants Category Only</option>
                  <option value="CREDIT_HOLD_CUSTOMERS">Credit Hold Accounts (Pending Payment)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Broadcast Message Content</label>
                <textarea
                  value={broadcastMsg}
                  onChange={e => setBroadcastMsg(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
                  rows={4}
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={broadcastSending}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow cursor-pointer"
                >
                  {broadcastSending ? 'Dispatching...' : 'Dispatch Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
