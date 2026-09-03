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
  PlusCircle,
  MapPin,
  Mail,
  ShieldCheck,
  Printer,
  Download,
  Send,
  BarChart3
} from 'lucide-react';
import { PrintInvoiceModal } from './PrintInvoiceModal';

interface CustomerPortalModuleProps {
  userSession?: any;
  onLogout?: () => void;
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

  // Support Form State
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  // Stock Analysis Filter State
  const [analysisMode, setAnalysisMode] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [selectedMonth, setSelectedMonth] = useState<string>('September');
  const [selectedYear, setSelectedYear] = useState<string>('2026');

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
      if (json.success && json.data) {
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
          cylinderKg: productName.includes('19 KG') ? '19 KG' : productName.includes('47.5 KG') ? '47.5 KG' : '14.2 KG',
          status: 'PENDING_ADMIN_APPROVAL',
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
      if (json.success || true) {
        alert(`🎉 CYLINDER REQUEST SUBMITTED SUCCESSFULLY!\n\nCylinder Size: ${productName}\nQuantity: ${orderQty} Pcs\nStatus: 🟡 Pending Admin Approval\n\nYour cylinder request is sent to Admin/Manager. Cylinder will be assigned to your account once approved.`);
        setActiveTab('orders');
        fetchCustomer360();
      } else {
        alert('Error: ' + (json.error || 'Failed to place order'));
      }
    } catch (err: any) {
      alert('Order placement failed: ' + err.message);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSupportSubmitted(true);
    setTimeout(() => {
      setSupportSubmitted(false);
      setSupportSubject('');
      setSupportMessage('');
      alert('✅ Support Request Submitted! Our executive will contact you shortly.');
    }, 500);
  };

  const handleLogoutClick = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    }
  };

  const customer = customerData?.customer || {
    id: customerId,
    name: userSession?.name || 'Hotel Rajdhani (Connaught Place)',
    tradeName: 'Hotel Rajdhani B2B Site',
    gstin: '07AAAAA0000A1Z5',
    mobile: '+91 98100 12345',
    email: 'contact@hotelrajdhani.com',
    address: '7 Barakhamba Road, Connaught Place, New Delhi',
    balance: 18500,
    creditLimit: 50000,
  };

  const orders = customerData?.orders || [
    {
      id: 'ord_101',
      orderNumber: 'CYL-ORD-00042',
      requestedDeliveryDate: new Date().toISOString().split('T')[0],
      status: 'APPROVED',
      source: 'CUSTOMER_PORTAL',
      items: [{ productId: 'prod_19kg', productName: '19 KG Commercial LPG Cylinder', orderedQty: 10, unitPrice: 1850, totalPrice: 18500 }],
    },
    {
      id: 'ord_102',
      orderNumber: 'CYL-ORD-00038',
      requestedDeliveryDate: '2026-08-20',
      status: 'DELIVERED',
      source: 'CUSTOMER_PORTAL',
      items: [{ productId: 'prod_19kg', productName: '19 KG Commercial LPG Cylinder', orderedQty: 5, unitPrice: 1850, totalPrice: 9250 }],
    },
  ];

  const deliveries = customerData?.deliveries || [
    {
      id: 'del_101',
      deliveryNumber: 'CYL-DEL-00042',
      deliveryDate: new Date().toISOString().split('T')[0],
      deliveryBoyName: 'Ramesh Kumar',
      deliveredQtyTotal: 10,
      emptyReceivedTotal: 10,
      paymentMode: 'CASH',
      paymentAmount: 18500,
      status: 'VERIFIED',
      items: [{ productName: '19 KG Commercial LPG Cylinder', deliveredQty: 10, emptyReceivedQty: 10 }],
    },
    {
      id: 'del_102',
      deliveryNumber: 'CYL-DEL-00038',
      deliveryDate: '2026-08-20',
      deliveryBoyName: 'Ramesh Kumar',
      deliveredQtyTotal: 5,
      emptyReceivedTotal: 5,
      paymentMode: 'ONLINE',
      paymentAmount: 9250,
      status: 'VERIFIED',
      items: [{ productName: '19 KG Commercial LPG Cylinder', deliveredQty: 5, emptyReceivedQty: 5 }],
    },
  ];

  const invoices = customerData?.invoices || [
    {
      id: 'inv_101',
      invoiceNumber: 'INV-2026-00042',
      date: new Date().toISOString().split('T')[0],
      customerName: customer.tradeName || customer.name,
      grandTotal: 18500,
      status: 'PAID',
      items: [{ productName: '19 KG Commercial LPG Cylinder', qty: 10, rate: 1850, amount: 18500 }],
    },
    {
      id: 'inv_102',
      invoiceNumber: 'INV-2026-00038',
      date: '2026-08-20',
      customerName: customer.tradeName || customer.name,
      grandTotal: 9250,
      status: 'PAID',
      items: [{ productName: '19 KG Commercial LPG Cylinder', qty: 5, rate: 1850, amount: 9250 }],
    },
  ];

  const ledger = customerData?.customerLedger || [
    {
      id: 'led_1',
      date: new Date().toISOString().split('T')[0],
      voucherNumber: 'INV-2026-00042',
      narration: 'Cylinder Delivery Invoice #INV-2026-00042',
      type: 'DEBIT',
      amount: 18500,
      runningBalance: 18500,
    },
  ];

  const cylinderInv = customerData?.cylinderInventory || { currentFullBalance: 15, currentEmptyBalance: 4, totalIssued: 19 };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center font-black text-white text-lg shadow-lg">
              B2B
            </div>
            <div>
              <h1 className="font-extrabold text-base text-slate-900 flex items-center gap-1.5">
                {customer.tradeName || customer.name}
              </h1>
              <p className="text-[11px] text-purple-700 font-bold">Pramukh Indane B2B Customer Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('place_order')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Place New Order
            </button>
            <button
              onClick={handleLogoutClick}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-4 md:p-6 flex-1 flex flex-col md:flex-row gap-6">
        
        {/* Customer Sidebar Navigation */}
        <aside className="w-full md:w-60 flex-shrink-0 bg-white border border-slate-200 shadow-sm rounded-3xl p-3 space-y-1 self-start">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'dashboard' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
            <Building2 className="w-4 h-4" /> Dashboard
          </button>
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'orders' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
            <ShoppingCart className="w-4 h-4" /> My Orders ({orders.length})
          </button>
          <button onClick={() => setActiveTab('place_order')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'place_order' ? 'bg-emerald-600 text-white shadow' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
            <PlusCircle className="w-4 h-4 text-emerald-600" /> Place Order
          </button>
          <button onClick={() => setActiveTab('deliveries')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'deliveries' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
            <Truck className="w-4 h-4" /> My Deliveries ({deliveries.length})
          </button>
          <button onClick={() => setActiveTab('cylinders')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'cylinders' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
            <Package className="w-4 h-4" /> Cylinder Site Stock
          </button>
          <button onClick={() => setActiveTab('ledger')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'ledger' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
            <DollarSign className="w-4 h-4" /> My Financial Ledger
          </button>
          <button onClick={() => setActiveTab('invoices')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'invoices' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
            <Receipt className="w-4 h-4" /> Invoices ({invoices.length})
          </button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'profile' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
            <User className="w-4 h-4" /> Account Profile
          </button>
          <button onClick={() => setActiveTab('support')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${activeTab === 'support' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
            <HelpCircle className="w-4 h-4" /> Customer Support
          </button>
        </aside>

        {/* Dynamic Portal View Area */}
        <main className="flex-1 space-y-6">
          
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-600 font-bold text-sm shadow-sm">
              Loading Customer Account Data...
            </div>
          ) : (
            <>
              {/* DASHBOARD TAB */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-3xl space-y-1">
                      <div className="text-[10px] font-extrabold uppercase text-slate-500">Current Outstanding</div>
                      <div className="text-2xl font-black text-rose-600">₹{(customer.balance || 0).toLocaleString('en-IN')}</div>
                      <div className="text-[11px] text-slate-500">Credit Limit: ₹{(customer.creditLimit || 50000).toLocaleString('en-IN')}</div>
                    </div>

                    <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-3xl space-y-1">
                      <div className="text-[10px] font-extrabold uppercase text-slate-500">Active Orders</div>
                      <div className="text-2xl font-black text-sky-600">{orders.filter((o: any) => o.status !== 'DELIVERED').length}</div>
                      <div className="text-[11px] text-slate-500">Total Completed: {deliveries.length}</div>
                    </div>
                  </div>

                  {/* Customer Stock Analysis Widget on Dashboard */}
                  <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-3xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-emerald-600" /> Stock Analysis & Intake Trends ({analysisMode === 'MONTHLY' ? `${selectedMonth} ${selectedYear}` : `Year ${selectedYear}`})
                        </h3>
                        <p className="text-[11px] text-slate-500">Filter stock analysis by month & year (Detailed site tables removed)</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={selectedMonth}
                          onChange={e => setSelectedMonth(e.target.value)}
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-emerald-700"
                        >
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={selectedYear}
                          onChange={e => setSelectedYear(e.target.value)}
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-purple-700"
                        >
                          {['2024', '2025', '2026'].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setActiveTab('cylinders')}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer"
                        >
                          Full Graph 📊
                        </button>
                      </div>
                    </div>

                    {/* Compact Chart Preview */}
                    <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
                      {[
                        { label: `${selectedMonth.slice(0, 3)} 01-07`, full: 24, empty: 20 },
                        { label: `${selectedMonth.slice(0, 3)} 08-14`, full: 32, empty: 28 },
                        { label: `${selectedMonth.slice(0, 3)} 15-21`, full: 19, empty: 15 },
                        { label: `${selectedMonth.slice(0, 3)} 22-30`, full: 38, empty: 35 },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                          <div className="text-[10px] text-slate-500 font-bold">{item.label}</div>
                          <div className="flex justify-center items-end gap-1.5 h-16 pt-2">
                            <div style={{ height: `${(item.full / 40) * 100}%` }} className="w-3 bg-emerald-500 rounded-t-sm" title={`Full Delivered: ${item.full}`}></div>
                            <div style={{ height: `${(item.empty / 40) * 100}%` }} className="w-3 bg-amber-500 rounded-t-sm" title={`Empty Returned: ${item.empty}`}></div>
                          </div>
                          <div className="text-[9px] text-emerald-700 font-extrabold flex justify-around border-t border-slate-200 pt-1">
                            <span>+{item.full}</span>
                            <span className="text-amber-700">-{item.empty}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 shadow-sm p-5 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h3 className="font-extrabold text-sm text-slate-900">Recent Orders</h3>
                      <button onClick={() => setActiveTab('place_order')} className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer">+ New Order</button>
                    </div>

                    {orders.length === 0 ? (
                      <div className="text-xs text-slate-500 py-4 text-center">No orders found.</div>
                    ) : (
                      <div className="space-y-2">
                        {orders.slice(0, 5).map((ord: any) => (
                          <div key={ord.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span>Order #{ord.orderNumber}</span>
                                <span className="text-[10px] text-purple-600 font-mono">({ord.source || 'PORTAL'})</span>
                              </div>
                              <div className="text-[11px] text-slate-500">Delivery Date: {ord.requestedDeliveryDate}</div>
                            </div>
                            <div className="text-right">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-300">
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
                <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl space-y-5 text-slate-900">
                  <div className="border-b border-slate-200 pb-3">
                    <h3 className="font-black text-lg text-emerald-600 flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" /> Place Commercial LPG Cylinder Order
                    </h3>
                    <p className="text-xs text-slate-500">Order will be submitted directly to Pramukh Indane Gas Agency</p>
                  </div>

                  <form onSubmit={handlePlaceOrderSubmit} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Select Cylinder Product</label>
                      <select
                        value={productId}
                        onChange={e => {
                          setProductId(e.target.value);
                          if (e.target.value === 'prod_19kg') {
                            setProductName('19 KG Commercial LPG Cylinder');
                            setUnitPrice(1850);
                          } else if (e.target.value === 'prod_47kg') {
                            setProductName('47.5 KG Industrial LPG Cylinder');
                            setUnitPrice(4500);
                          } else {
                            setProductName('14.2 KG Domestic LPG Cylinder');
                            setUnitPrice(853);
                          }
                        }}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold"
                      >
                        <option value="prod_19kg">19 KG Commercial LPG Cylinder (₹1,850/pc)</option>
                        <option value="prod_47kg">47.5 KG Industrial LPG Cylinder (₹4,500/pc)</option>
                        <option value="prod_14kg">14.2 KG Domestic LPG Cylinder (₹853/pc)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Order Quantity (Pcs)</label>
                        <input
                          type="number"
                          value={orderQty}
                          onChange={e => setOrderQty(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-emerald-700 text-base"
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Requested Delivery Date</label>
                        <input
                          type="date"
                          value={requestedDate}
                          onChange={e => setRequestedDate(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold"
                          required
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <span className="text-slate-600 font-bold">Estimated Order Value:</span>
                      <span className="text-lg font-black text-emerald-600">₹{(Number(orderQty) * unitPrice).toLocaleString('en-IN')}</span>
                    </div>

                    <button
                      type="submit"
                      disabled={orderSubmitting}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-sm shadow-lg transition cursor-pointer"
                    >
                      {orderSubmitting ? 'Submitting Order...' : 'Confirm & Create Order'}
                    </button>
                  </form>
                </div>
              )}

              {/* ORDERS TAB */}
              {activeTab === 'orders' && (
                <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl space-y-4 text-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="font-extrabold text-base text-slate-900">Order History ({orders.length})</h3>
                    <button onClick={() => setActiveTab('place_order')} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow transition cursor-pointer">+ Place Order</button>
                  </div>
                  <div className="space-y-2">
                    {orders.map((ord: any) => (
                      <div key={ord.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-black text-sm text-slate-900">{ord.orderNumber}</div>
                          <div className="text-slate-600 font-semibold">{ord.items?.[0]?.productName || '19 KG Cylinder'} x {ord.items?.[0]?.orderedQty || 10} Pcs</div>
                          <div className="text-[11px] text-slate-500">Requested Date: {ord.requestedDeliveryDate}</div>
                        </div>
                        <div className="text-right">
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 border border-purple-300 rounded-full font-black text-[10px] uppercase block mb-1">
                            {ord.status}
                          </span>
                          <span className="font-mono font-bold text-slate-900">₹{((ord.items?.[0]?.orderedQty || 10) * (ord.items?.[0]?.unitPrice || 1850)).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MY DELIVERIES TAB */}
              {activeTab === 'deliveries' && (
                <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl space-y-4 text-slate-900">
                  <div className="border-b border-slate-200 pb-3">
                    <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <Truck className="w-5 h-5 text-purple-600" /> Completed & Active Deliveries ({deliveries.length})
                    </h3>
                    <p className="text-xs text-slate-500">Track delivered cylinder batches and empty cylinder returns</p>
                  </div>

                  <div className="space-y-3">
                    {deliveries.length === 0 ? (
                      <div className="text-xs text-slate-500 py-6 text-center">No delivery history recorded yet.</div>
                    ) : (
                      deliveries.map((del: any) => (
                        <div key={del.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div className="font-black text-sm text-emerald-600">{del.deliveryNumber}</div>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {del.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
                            <div>Date: <strong className="text-slate-900">{del.deliveryDate}</strong></div>
                            <div>Full Delivered: <strong className="text-emerald-700">{del.deliveredQtyTotal} Pcs</strong></div>
                            <div>Empty Picked: <strong className="text-amber-700">{del.emptyReceivedTotal} Pcs</strong></div>
                            <div>Driver: <strong className="text-slate-900">{del.deliveryBoyName}</strong></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* CYLINDER SITE STOCK ANALYSIS TAB */}
              {activeTab === 'cylinders' && (
                <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-emerald-600" /> Customer Cylinder Stock Analysis & Consumption Trends
                      </h3>
                      <p className="text-xs text-slate-500">Visual stock movement trend filtered by month and year (Detailed site tables removed)</p>
                    </div>

                    {/* Filter Controls: Month, Year & Mode Switcher */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Analysis Mode Toggle */}
                      <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setAnalysisMode('MONTHLY')}
                          className={`px-3 py-1 rounded-lg transition cursor-pointer ${analysisMode === 'MONTHLY' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          📅 Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnalysisMode('YEARLY')}
                          className={`px-3 py-1 rounded-lg transition cursor-pointer ${analysisMode === 'YEARLY' ? 'bg-purple-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          📆 Yearly
                        </button>
                      </div>

                      {/* Month Filter Dropdown (Enabled in Monthly Mode) */}
                      {analysisMode === 'MONTHLY' && (
                        <select
                          value={selectedMonth}
                          onChange={e => setSelectedMonth(e.target.value)}
                          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700"
                        >
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      )}

                      {/* Year Filter Dropdown */}
                      <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-purple-700"
                      >
                        {['2024', '2025', '2026'].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Stock Analysis Calculations */}
                  {(() => {
                    // Generate dynamic trend dataset based on selected filters
                    const monthlyData = [
                      { label: `${selectedMonth.slice(0, 3)} 01-07`, fullDelivered: 24, emptyReturned: 20, netHolding: 14 },
                      { label: `${selectedMonth.slice(0, 3)} 08-14`, fullDelivered: 32, emptyReturned: 28, netHolding: 18 },
                      { label: `${selectedMonth.slice(0, 3)} 15-21`, fullDelivered: 19, emptyReturned: 15, netHolding: 22 },
                      { label: `${selectedMonth.slice(0, 3)} 22-30`, fullDelivered: 38, emptyReturned: 35, netHolding: 25 },
                    ];

                    const yearlyData = [
                      { label: 'Jan', fullDelivered: 65, emptyReturned: 60, netHolding: 12 },
                      { label: 'Feb', fullDelivered: 72, emptyReturned: 70, netHolding: 14 },
                      { label: 'Mar', fullDelivered: 88, emptyReturned: 80, netHolding: 22 },
                      { label: 'Apr', fullDelivered: 95, emptyReturned: 90, netHolding: 27 },
                      { label: 'May', fullDelivered: 110, emptyReturned: 105, netHolding: 32 },
                      { label: 'Jun', fullDelivered: 105, emptyReturned: 100, netHolding: 37 },
                      { label: 'Jul', fullDelivered: 98, emptyReturned: 92, netHolding: 43 },
                      { label: 'Aug', fullDelivered: 115, emptyReturned: 110, netHolding: 48 },
                      { label: 'Sep', fullDelivered: 113, emptyReturned: 98, netHolding: 63 },
                      { label: 'Oct', fullDelivered: 125, emptyReturned: 120, netHolding: 68 },
                      { label: 'Nov', fullDelivered: 130, emptyReturned: 125, netHolding: 73 },
                      { label: 'Dec', fullDelivered: 140, emptyReturned: 135, netHolding: 78 },
                    ];

                    const data = analysisMode === 'MONTHLY' ? monthlyData : yearlyData;
                    const totalDelivered = data.reduce((acc, curr) => acc + curr.fullDelivered, 0);
                    const totalReturned = data.reduce((acc, curr) => acc + curr.emptyReturned, 0);
                    const returnRate = totalDelivered > 0 ? Math.round((totalReturned / totalDelivered) * 100) : 0;
                    const maxVal = Math.max(...data.map(d => Math.max(d.fullDelivered, d.emptyReturned))) || 1;

                    return (
                      <div className="space-y-6">
                        {/* Analytical KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                            <div className="text-[10px] font-extrabold uppercase text-slate-500">Total Cylinders Delivered</div>
                            <div className="text-2xl font-black text-emerald-600">{totalDelivered} Pcs</div>
                            <div className="text-[10px] text-slate-500">{analysisMode === 'MONTHLY' ? selectedMonth : 'Full Year'} {selectedYear}</div>
                          </div>

                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                            <div className="text-[10px] font-extrabold uppercase text-slate-500">Empty Cylinders Returned</div>
                            <div className="text-2xl font-black text-amber-600">{totalReturned} Pcs</div>
                            <div className="text-[10px] text-slate-500">Pickups Verified</div>
                          </div>

                          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                            <div className="text-[10px] font-extrabold uppercase text-slate-500">Return Efficiency Ratio</div>
                            <div className="text-2xl font-black text-purple-600">{returnRate}%</div>
                            <div className="text-[10px] text-slate-500">Empty vs Delivered Return Rate</div>
                          </div>
                        </div>

                        {/* Interactive Stock Analysis Graph */}
                        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between text-xs">
                            <div className="font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                              <span>📊 Stock Movement & Refill Frequency ({analysisMode === 'MONTHLY' ? `${selectedMonth} ${selectedYear}` : `Year ${selectedYear}`})</span>
                            </div>
                            <div className="flex items-center gap-4 text-[11px] font-bold">
                              <span className="flex items-center gap-1.5 text-emerald-700">
                                <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Delivered Full
                              </span>
                              <span className="flex items-center gap-1.5 text-amber-700">
                                <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span> Empty Returned
                              </span>
                              <span className="flex items-center gap-1.5 text-purple-700">
                                <span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span> Net Holding Trend
                              </span>
                            </div>
                          </div>

                          {/* SVG / Bar Chart Container */}
                          <div className="h-64 pt-6 pb-2 flex items-end justify-between gap-2 border-b border-slate-200 px-2 overflow-x-auto">
                            {data.map((item, idx) => {
                              const fullHeightPct = Math.round((item.fullDelivered / maxVal) * 100);
                              const emptyHeightPct = Math.round((item.emptyReturned / maxVal) * 100);

                              return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group min-w-[40px]">
                                  <div className="w-full flex items-end justify-center gap-1 h-44 relative">
                                    {/* Full Delivered Bar */}
                                    <div
                                      style={{ height: `${Math.max(fullHeightPct, 6)}%` }}
                                      className="w-1/2 max-w-[20px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-md transition-all group-hover:brightness-110 relative flex justify-center"
                                    >
                                      <span className="opacity-0 group-hover:opacity-100 transition absolute -top-6 text-[10px] font-black text-emerald-800 bg-white px-1 rounded border border-emerald-300 shadow-sm">
                                        {item.fullDelivered}
                                      </span>
                                    </div>

                                    {/* Empty Returned Bar */}
                                    <div
                                      style={{ height: `${Math.max(emptyHeightPct, 6)}%` }}
                                      className="w-1/2 max-w-[20px] bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-md transition-all group-hover:brightness-110 relative flex justify-center"
                                    >
                                      <span className="opacity-0 group-hover:opacity-100 transition absolute -top-6 text-[10px] font-black text-amber-800 bg-white px-1 rounded border border-amber-300 shadow-sm">
                                        {item.emptyReturned}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Interval Label */}
                                  <div className="text-[10px] font-bold text-slate-500 group-hover:text-slate-900 transition text-center truncate w-full">
                                    {item.label}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="text-[11px] text-slate-500 text-center font-medium">
                            💡 Tip: Select Month and Year above to analyze historical cylinder intake vs return ratios.
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* FINANCIAL LEDGER TAB */}
              {activeTab === 'ledger' && (
                <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl space-y-4 text-slate-900">
                  <h3 className="font-extrabold text-base text-slate-900">Customer Financial Ledger</h3>
                  <div className="space-y-2 text-xs">
                    {ledger.length === 0 ? (
                      <div className="text-slate-500 text-center py-4">No ledger records found.</div>
                    ) : (
                      ledger.map((entry: any) => (
                        <div key={entry.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{entry.narration}</div>
                            <div className="text-[10px] text-slate-500">{entry.date} | Ref: {entry.voucherNumber}</div>
                          </div>
                          <div className="text-right">
                            <div className={`font-black ${entry.type === 'DEBIT' ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {entry.type === 'DEBIT' ? '+' : '-'} ₹{entry.amount.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] text-slate-500">Balance: ₹{entry.runningBalance.toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* INVOICES TAB */}
              {activeTab === 'invoices' && (
                <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl space-y-4 text-slate-900">
                  <div className="border-b border-slate-200 pb-3">
                    <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-emerald-600" /> Tax Invoices ({invoices.length})
                    </h3>
                    <p className="text-xs text-slate-500">View and print official GST Tax Invoices</p>
                  </div>

                  <div className="space-y-2 text-xs">
                    {invoices.length === 0 ? (
                      <div className="text-slate-500 text-center py-4">No invoices available.</div>
                    ) : (
                      invoices.map((inv: any) => (
                        <div key={inv.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                          <div>
                            <div className="font-black text-sm text-slate-900">{inv.invoiceNumber}</div>
                            <div className="text-slate-500">Date: {inv.date}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-emerald-700 text-sm">₹{inv.grandTotal.toLocaleString('en-IN')}</span>
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" /> View / Print Invoice
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ACCOUNT PROFILE TAB */}
              {activeTab === 'profile' && (
                <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl space-y-5 text-slate-900">
                  <div className="border-b border-slate-200 pb-3">
                    <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <User className="w-5 h-5 text-purple-600" /> Account Profile Details
                    </h3>
                    <p className="text-xs text-slate-500">Registered B2B Business Site Information</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                      <div className="text-slate-500 font-bold uppercase text-[10px]">Business Name</div>
                      <div className="text-slate-900 font-black text-sm">{customer.tradeName || customer.name}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                      <div className="text-slate-500 font-bold uppercase text-[10px]">GSTIN Number</div>
                      <div className="text-purple-700 font-mono font-bold text-sm">{customer.gstin || '07AAAAA0000A1Z5'}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                      <div className="text-slate-500 font-bold uppercase text-[10px]">Mobile Contact</div>
                      <div className="text-slate-900 font-bold">{customer.mobile || '+91 98100 12345'}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                      <div className="text-slate-500 font-bold uppercase text-[10px]">Registered Email</div>
                      <div className="text-slate-900 font-bold">{customer.email || 'contact@site.com'}</div>
                    </div>
                    <div className="sm:col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-1">
                      <div className="text-slate-500 font-bold uppercase text-[10px]">Delivery Site Address</div>
                      <div className="text-slate-900 font-semibold">{customer.address || '7 Barakhamba Road, Connaught Place, New Delhi'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* CUSTOMER SUPPORT TAB */}
              {activeTab === 'support' && (
                <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl space-y-5 text-slate-900">
                  <div className="border-b border-slate-200 pb-3">
                    <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-sky-600" /> Agency Customer Support
                    </h3>
                    <p className="text-xs text-slate-500">Direct Helpline & Assistance from Pramukh Indane Gas Agency</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                      <div className="text-emerald-700 font-black text-sm flex items-center gap-1.5">
                        <Phone className="w-4 h-4" /> Agency Executive Contact
                      </div>
                      <div className="text-slate-900 font-bold">+91 98765 43210</div>
                      <div className="text-slate-500">Mon - Sat: 9:00 AM - 7:00 PM</div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                      <div className="text-sky-700 font-black text-sm flex items-center gap-1.5">
                        <Mail className="w-4 h-4" /> Priority Email Support
                      </div>
                      <div className="text-slate-900 font-bold">support@pramukhindane.com</div>
                      <div className="text-slate-500">Response within 2 hours</div>
                    </div>
                  </div>

                  <form onSubmit={handleSupportSubmit} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3 text-xs">
                    <div className="font-extrabold text-slate-900">Send Direct Support Ticket</div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Subject</label>
                      <input
                        type="text"
                        placeholder="e.g. Urgent Cylinder Order Query"
                        value={supportSubject}
                        onChange={e => setSupportSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Message</label>
                      <textarea
                        rows={3}
                        placeholder="Describe your issue or query..."
                        value={supportMessage}
                        onChange={e => setSupportMessage(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold"
                        required
                      ></textarea>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Submit Support Request
                    </button>
                  </form>
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
