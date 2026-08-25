'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ShoppingCart, 
  FileText, 
  DollarSign, 
  User, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Receipt, 
  Building2, 
  Phone, 
  HelpCircle,
  PlusCircle
} from 'lucide-react';
import { PrintInvoiceModal } from './PrintInvoiceModal';

interface CustomerPortalModuleProps {
  userSession: any;
  onLogout: () => void;
}

export const CustomerPortalModule: React.FC<CustomerPortalModuleProps> = ({ userSession, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'place_order' | 'deliveries' | 'cylinders' | 'ledger' | 'invoices' | 'profile' | 'support'>('dashboard');
  const [customerData, setCustomerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New Order Form State
  const [orderQty, setOrderQty] = useState('10');
  const [productId, setProductId] = useState('prod_19kg');
  const [productName, setProductName] = useState('19 KG Commercial LPG Cylinder');
  const [unitPrice, setUnitPrice] = useState(1850);
  const [requestedDate, setRequestedDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const customerId = userSession?.customerId || 'cust_demo_1';

  const fetchCustomer360 = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/360`, {
        headers: {
          'x-user-role': 'CUSTOMER',
          'x-customer-id': customerId,
        },
      });
      const json = await res.json();
      if (json.success) {
        setCustomerData(json.data);
      }
    } catch (err) {
      console.error('Error fetching customer 360 data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer360();
  }, [customerId]);

  const handlePlaceOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderSubmitting(true);
    try {
      const res = await fetch('/api/cylinder/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'CUSTOMER',
          'x-customer-id': customerId,
        },
        body: JSON.stringify({
          customerId,
          requestedDeliveryDate: requestedDate,
          items: [
            {
              productId,
              productName,
              orderedQty: Number(orderQty),
              unitPrice: Number(unitPrice),
            },
          ],
        }),
      });

      const json = await res.json();
      if (json.success) {
        alert('🎉 ORDER CREATED SUCCESSFULLY!\nYour order has been submitted for verification.');
        setActiveTab('orders');
        fetchCustomer360();
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err: any) {
      alert('Order placement failed: ' + err.message);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const customer = customerData?.customer || { name: userSession?.name || 'Valued Customer', balance: 18500, creditLimit: 50000 };
  const orders = customerData?.orders || [];
  const deliveries = customerData?.deliveries || [];
  const invoices = customerData?.invoices || [];
  const ledger = customerData?.customerLedger || [];
  const cylinderInv = customer?.cylinderInventories?.[0] || { currentFullBalance: 15, currentEmptyBalance: 4 };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center font-black text-white text-lg shadow-lg">
              B2B
            </div>
            <div>
              <h1 className="font-extrabold text-base text-white flex items-center gap-1.5">
                {customer.tradeName || customer.name}
              </h1>
              <p className="text-[11px] text-purple-300 font-semibold">Pramukh Indane B2B Customer Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('place_order')}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Place New Order
            </button>
            <button
              onClick={onLogout}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-4 md:p-6 flex-1 flex flex-col md:flex-row gap-6">
        
        {/* Customer Sidebar Navigation */}
        <aside className="w-full md:w-60 flex-shrink-0 bg-slate-900 border border-slate-800 rounded-3xl p-3 space-y-1 self-start">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === 'dashboard' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Building2 className="w-4 h-4" /> Dashboard
          </button>
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === 'orders' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <ShoppingCart className="w-4 h-4" /> My Orders ({orders.length})
          </button>
          <button onClick={() => setActiveTab('place_order')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === 'place_order' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <PlusCircle className="w-4 h-4 text-emerald-400" /> Place Order
          </button>
          <button onClick={() => setActiveTab('deliveries')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === 'deliveries' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Truck className="w-4 h-4" /> My Deliveries
          </button>
          <button onClick={() => setActiveTab('cylinders')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === 'cylinders' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Package className="w-4 h-4" /> Cylinder Site Stock
          </button>
          <button onClick={() => setActiveTab('ledger')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === 'ledger' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <DollarSign className="w-4 h-4" /> My Financial Ledger
          </button>
          <button onClick={() => setActiveTab('invoices')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === 'invoices' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Receipt className="w-4 h-4" /> Invoices
          </button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === 'profile' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <User className="w-4 h-4" /> Account Profile
          </button>
          <button onClick={() => setActiveTab('support')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${activeTab === 'support' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <HelpCircle className="w-4 h-4" /> Customer Support
          </button>
        </aside>

        {/* Dynamic Portal View Area */}
        <main className="flex-1 space-y-6">
          
          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400 text-sm">
              Loading Customer Account Data...
            </div>
          ) : (
            <>
              {/* DASHBOARD TAB */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
                      <div className="text-[10px] font-extrabold uppercase text-slate-400">Current Outstanding</div>
                      <div className="text-2xl font-black text-rose-400">₹{(customer.balance || 0).toLocaleString('en-IN')}</div>
                      <div className="text-[11px] text-slate-500">Credit Limit: ₹{(customer.creditLimit || 50000).toLocaleString('en-IN')}</div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
                      <div className="text-[10px] font-extrabold uppercase text-slate-400">Full Cylinders at Site</div>
                      <div className="text-2xl font-black text-emerald-400">{cylinderInv.currentFullBalance} Pcs</div>
                      <div className="text-[11px] text-slate-500">Empty Cylinders: {cylinderInv.currentEmptyBalance} Pcs</div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
                      <div className="text-[10px] font-extrabold uppercase text-slate-400">Active Orders</div>
                      <div className="text-2xl font-black text-sky-400">{orders.filter((o: any) => o.status !== 'DELIVERED').length}</div>
                      <div className="text-[11px] text-slate-500">Total Completed: {deliveries.length}</div>
                    </div>
                  </div>

                  {/* Recent Orders List */}
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="font-extrabold text-sm text-white">Recent Orders</h3>
                      <button onClick={() => setActiveTab('place_order')} className="text-xs font-bold text-emerald-400 hover:underline">+ New Order</button>
                    </div>

                    {orders.length === 0 ? (
                      <div className="text-xs text-slate-500 py-4 text-center">No orders found.</div>
                    ) : (
                      <div className="space-y-2">
                        {orders.slice(0, 5).map((ord: any) => (
                          <div key={ord.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                <span>Order #{ord.orderNumber}</span>
                                <span className="text-[10px] text-purple-400 font-mono">({ord.source})</span>
                              </div>
                              <div className="text-[11px] text-slate-400">Delivery Date: {ord.requestedDeliveryDate}</div>
                            </div>
                            <div className="text-right">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-950 text-purple-300 border border-purple-800">
                                {ord.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PLACE ORDER TAB */}
              {activeTab === 'place_order' && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-5">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="font-black text-lg text-emerald-400 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" /> Place Commercial LPG Cylinder Order
                    </h3>
                    <p className="text-xs text-slate-400">Order will be submitted directly to Pramukh Indane Gas Agency</p>
                  </div>

                  <form onSubmit={handlePlaceOrderSubmit} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-400 mb-1">Select Product</label>
                      <select
                        value={productId}
                        onChange={e => {
                          setProductId(e.target.value);
                          if (e.target.value === 'prod_19kg') {
                            setProductName('19 KG Commercial LPG Cylinder');
                            setUnitPrice(1850);
                          } else {
                            setProductName('47.5 KG Industrial LPG Cylinder');
                            setUnitPrice(4500);
                          }
                        }}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                      >
                        <option value="prod_19kg">19 KG Commercial LPG Cylinder (₹1,850/pc)</option>
                        <option value="prod_47kg">47.5 KG Industrial LPG Cylinder (₹4,500/pc)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-400 mb-1">Order Quantity (Pcs)</label>
                        <input
                          type="number"
                          value={orderQty}
                          onChange={e => setOrderQty(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-black text-emerald-400"
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-400 mb-1">Requested Delivery Date</label>
                        <input
                          type="date"
                          value={requestedDate}
                          onChange={e => setRequestedDate(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                      <span className="text-slate-400 font-bold">Estimated Order Value:</span>
                      <span className="text-lg font-black text-emerald-400">₹{(Number(orderQty) * unitPrice).toLocaleString('en-IN')}</span>
                    </div>

                    <button
                      type="submit"
                      disabled={orderSubmitting}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-sm shadow-lg transition"
                    >
                      {orderSubmitting ? 'Submitting Order...' : 'Confirm & Create Order'}
                    </button>
                  </form>
                </div>
              )}

              {/* ORDERS TAB */}
              {activeTab === 'orders' && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
                  <h3 className="font-extrabold text-base text-white">Order History</h3>
                  <div className="space-y-2">
                    {orders.map((ord: any) => (
                      <div key={ord.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-black text-sm text-white">{ord.orderNumber}</div>
                          <div className="text-slate-400">{ord.items?.[0]?.productName} x {ord.items?.[0]?.orderedQty} Pcs</div>
                          <div className="text-[11px] text-slate-500">Date: {ord.requestedDeliveryDate}</div>
                        </div>
                        <div className="text-right">
                          <span className="px-3 py-1 bg-purple-950 text-purple-300 border border-purple-800 rounded-full font-black text-[10px] uppercase block mb-1">
                            {ord.status}
                          </span>
                          <span className="font-mono text-slate-300">₹{(ord.items?.[0]?.totalPrice || 18500).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FINANCIAL LEDGER TAB */}
              {activeTab === 'ledger' && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
                  <h3 className="font-extrabold text-base text-white">Customer Financial Ledger</h3>
                  <div className="space-y-2 text-xs">
                    {ledger.length === 0 ? (
                      <div className="text-slate-500 text-center py-4">No ledger records found.</div>
                    ) : (
                      ledger.map((entry: any) => (
                        <div key={entry.id} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between">
                          <div>
                            <div className="font-bold text-white">{entry.narration}</div>
                            <div className="text-[10px] text-slate-500">{entry.date} | Ref: {entry.voucherNumber}</div>
                          </div>
                          <div className="text-right">
                            <div className={`font-black ${entry.type === 'DEBIT' ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {entry.type === 'DEBIT' ? '+' : '-'} ₹{entry.amount.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] text-slate-400">Balance: ₹{entry.runningBalance.toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* INVOICES TAB */}
              {activeTab === 'invoices' && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
                  <h3 className="font-extrabold text-base text-white">My Tax Invoices</h3>
                  <div className="space-y-2 text-xs">
                    {invoices.length === 0 ? (
                      <div className="text-slate-500 text-center py-4">No invoices available.</div>
                    ) : (
                      invoices.map((inv: any) => (
                        <div key={inv.id} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                          <div>
                            <div className="font-black text-sm text-white">{inv.invoiceNumber}</div>
                            <div className="text-slate-400">Date: {inv.date}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-emerald-400">₹{inv.grandTotal.toLocaleString('en-IN')}</span>
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                            >
                              View / Print
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </main>
      </div>

      <PrintInvoiceModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
};
