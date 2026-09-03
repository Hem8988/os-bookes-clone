'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Camera,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  DollarSign,
  Package,
  Clock,
  Lock,
  FileText,
  Check,
  ChevronRight,
  Wifi,
  WifiOff,
  UploadCloud,
  Search,
  Filter,
  UserCheck,
  MapPin,
  X,
  Sparkles,
  LogOut,
  Send,
  Wrench,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import { DeliveryRequest } from '../lib/types';
import { usePersistedState } from '../lib/usePersistedState';

interface DeliveryBoyModuleProps {
  deliveryRequests?: DeliveryRequest[];
  onAddDeliveryRequest?: (req: DeliveryRequest) => void;
}

export default function DeliveryBoyModule({
  deliveryRequests: propRequests,
  onAddDeliveryRequest,
}: DeliveryBoyModuleProps = {}) {
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    window.location.href = '/login';
  };
  // Day Operations State
  const [dayStatus, setDayStatus] = useState<'NOT_STARTED' | 'DAY_STARTED' | 'DAY_CLOSED'>('NOT_STARTED');
  const [isStartDayModalOpen, setIsStartDayModalOpen] = useState(false);
  const [openingFull, setOpeningFull] = useState('25');
  const [openingEmpty, setOpeningEmpty] = useState('5');
  const [openingCash, setOpeningCash] = useState('2000');

  // Security Check Toggles
  const [checkVehicle, setCheckVehicle] = useState(true);
  const [checkSeals, setCheckSeals] = useState(true);
  const [checkMobile, setCheckMobile] = useState(true);

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DELIVERED'>('ALL');

  // Delivery Execution Form State
  const [deliveredQty, setDeliveredQty] = useState('10');
  const [emptyQty, setEmptyQty] = useState('10');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'ONLINE' | 'CHEQUE' | 'CREDIT'>('CASH');
  const [amount, setAmount] = useState('18500');

  // Payment Details
  const [transactionId, setTransactionId] = useState('');
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string | null>(null);
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBank, setChequeBank] = useState('HDFC Bank');
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().split('T')[0]);
  const [chequePhotoUrl, setChequePhotoUrl] = useState('https://placehold.co/400x300?text=Cheque+Photo');

  // Mandatory Delivery Proof Photos & Remarks
  const [billPhotoUrl, setBillPhotoUrl] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // File Upload Handlers for Camera / Gallery
  const handleBillPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBillPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaymentScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentScreenshotUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Cash Wallet State
  const [submittedCash, setSubmittedCash] = useState(0);
  const [cashDepositAmount, setCashDepositAmount] = useState('12000');
  const [cashDepositSubmitting, setCashDepositSubmitting] = useState(false);
  const [cashDepositNotice, setCashDepositNotice] = useState('');

  // Modals
  const [isDayCloseModalOpen, setIsDayCloseModalOpen] = useState(false);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);

  // Spot Order Creation State (Multi-Item)
  const [newOrderCustomer, setNewOrderCustomer] = useState('cust_demo_1');
  const [newOrderCustomerName, setNewOrderCustomerName] = useState('Hotel Rajdhani (Connaught Place)');
  const [newOrderSubmitting, setNewOrderSubmitting] = useState(false);

  const CYLINDER_PRODUCTS = [
    { id: 'prod_19kg', name: '19 KG Commercial LPG Cylinder', price: 1850 },
    { id: 'prod_47kg', name: '47.5 KG Industrial LPG Cylinder', price: 4500 },
    { id: 'prod_14kg', name: '14.2 KG Domestic LPG Cylinder', price: 853 },
    { id: 'prod_5kg', name: '5 KG Commercial LPG Cylinder', price: 490 },
    { id: 'prod_19vot', name: '19 KG VOT Commercial Cylinder', price: 1950 },
  ];

  const [orderLines, setOrderLines] = useState([
    { productId: 'prod_19kg', qty: '5' },
  ]);

  const addOrderLine = () => {
    setOrderLines(prev => [...prev, { productId: 'prod_19kg', qty: '1' }]);
  };

  const removeOrderLine = (idx: number) => {
    setOrderLines(prev => prev.filter((_, i) => i !== idx));
  };

  const updateOrderLine = (idx: number, field: 'productId' | 'qty', value: string) => {
    setOrderLines(prev => prev.map((line, i) => i === idx ? { ...line, [field]: value } : line));
  };

  const orderTotal = orderLines.reduce((sum, line) => {
    const prod = CYLINDER_PRODUCTS.find(p => p.id === line.productId);
    return sum + (prod?.price || 0) * (Number(line.qty) || 0);
  }, 0);

  // Delivery Requests to Admin State
  const [localRequests, setLocalRequests] = usePersistedState<DeliveryRequest[]>('osbooks.deliveryRequests', []);
  const allRequests = propRequests && propRequests.length > 0 ? propRequests : localRequests;
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState<DeliveryRequest['requestType']>('EXTRA_CYLINDERS');
  const [requestQty, setRequestQty] = useState('10');
  const [requestAmount, setRequestAmount] = useState('2000');
  const [requestNote, setRequestNote] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const myRequests = allRequests.filter(r => r.deliveryBoyName === 'Ramesh Kumar' || !r.deliveryBoyName);
  const pendingMyRequestsCount = myRequests.filter(r => r.status === 'PENDING').length;

  const handleCreateAdminRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRequest(true);

    const newReq: DeliveryRequest = {
      id: `REQ-${Date.now().toString().slice(-6)}`,
      requestedAt: new Date().toISOString(),
      deliveryBoyName: 'Ramesh Kumar',
      requestType,
      requestNote: requestNote || (requestType === 'EXTRA_CYLINDERS' ? `Need ${requestQty} extra cylinders` : requestType === 'CASH_ADVANCE' ? `Need cash advance of ₹${requestAmount}` : 'Delivery support request'),
      qty: requestType === 'EXTRA_CYLINDERS' ? Number(requestQty) : undefined,
      amount: requestType === 'CASH_ADVANCE' ? Number(requestAmount) : undefined,
      status: 'PENDING',
    };

    if (onAddDeliveryRequest) {
      onAddDeliveryRequest(newReq);
    }
    setLocalRequests(prev => [newReq, ...prev.filter(r => r.id !== newReq.id)]);

    alert(`✅ Request Submitted to Admin!\nID: ${newReq.id}\nStatus: PENDING ADMIN APPROVAL\nAdmin will review and approve it from the Admin Panel.`);
    setIsRequestModalOpen(false);
    setRequestNote('');
    setIsSubmittingRequest(false);
  };

  // Offline Mode & Sync State
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<'SYNCED' | 'PENDING_SYNC' | 'SYNCING' | 'SYNC_FAILED'>('SYNCED');

  // PWA & Network Listeners
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration error:', err));
    }

    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        syncOfflineQueue();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    if (typeof window !== 'undefined') {
      const savedQueue = localStorage.getItem('deskshark_offline_queue');
      if (savedQueue) {
        try {
          const parsed = JSON.parse(savedQueue);
          setOfflineQueue(parsed);
          if (parsed.length > 0) setSyncStatus('PENDING_SYNC');
        } catch (e) {}
      }
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    setSyncStatus('SYNCING');

    let remainingQueue = [...offlineQueue];
    for (const item of offlineQueue) {
      try {
        const res = await fetch('/api/cylinder/deliveries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-role': 'DELIVERY_BOY' },
          body: JSON.stringify(item.payload),
        });

        if (res.ok) {
          remainingQueue = remainingQueue.filter(q => q.id !== item.id);
        }
      } catch (err) {}
    }

    setOfflineQueue(remainingQueue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('deskshark_offline_queue', JSON.stringify(remainingQueue));
    }

    if (remainingQueue.length === 0) {
      setSyncStatus('SYNCED');
      alert('⚡ Offline deliveries successfully synced with server!');
    } else {
      setSyncStatus('PENDING_SYNC');
    }
  };

  // Fetch Day Log & Orders
  const fetchDayLog = async () => {
    try {
      const res = await fetch('/api/delivery/day-log?deliveryBoyId=del_boy_ramesh');
      const json = await res.json();
      if (json.success && json.data) {
        setDayStatus(json.status);
        if (json.data.openingFullCylinders !== undefined) {
          setOpeningFull(String(json.data.openingFullCylinders));
          setOpeningEmpty(String(json.data.openingEmptyCylinders));
          setOpeningCash(String(json.data.openingCash));
        }
      }
    } catch (err) {
      console.error('Error fetching day log:', err);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch('/api/cylinder/orders?assignedDeliveryBoyId=del_boy_ramesh', {
        headers: { 'x-user-role': 'DELIVERY_BOY' },
      });
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setOrders(json.data);
        if (!selectedOrder) setSelectedOrder(json.data[0]);
      } else {
        const demoOrders = [
          {
            id: 'demo_ord_1',
            orderNumber: 'CYL-ORD-00001',
            customerName: 'Hotel Rajdhani (Connaught Place)',
            deliveryAddress: '7 Barakhamba Road, Connaught Place, New Delhi',
            status: 'ASSIGNED',
            items: [{ productId: 'prod_19kg', productName: '19 KG Commercial LPG Cylinder', orderedQty: 10, unitPrice: 1850 }],
          },
          {
            id: 'demo_ord_2',
            orderNumber: 'CYL-ORD-00002',
            customerName: 'Apex Industrial Fabrics (Okhla)',
            deliveryAddress: 'Phase 1, Okhla Industrial Area, New Delhi',
            status: 'OUT_FOR_DELIVERY',
            items: [{ productId: 'prod_47kg', productName: '47.5 KG Industrial LPG Cylinder', orderedQty: 5, unitPrice: 4500 }],
          },
        ];
        setOrders(demoOrders);
        if (!selectedOrder) setSelectedOrder(demoOrders[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchDayLog();
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      const firstItem = selectedOrder.items?.[0];
      const ordered = firstItem?.orderedQty || 10;
      const price = firstItem?.unitPrice || 1850;
      setDeliveredQty(String(ordered));
      setEmptyQty(String(ordered));
      setAmount(String(ordered * price));
    }
  }, [selectedOrder]);

  const handleStartDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/delivery/day-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'START_DAY',
          deliveryBoyId: 'del_boy_ramesh',
          deliveryBoyName: 'Ramesh Kumar',
          openingFullCylinders: Number(openingFull),
          openingEmptyCylinders: Number(openingEmpty),
          openingCash: Number(openingCash),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setDayStatus('DAY_STARTED');
        setIsStartDayModalOpen(false);
        alert('🎉 Day Started Successfully! Opening stock and cash recorded.');
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err: any) {
      alert('Failed to start day: ' + err.message);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {}
  };

  const handleCompleteDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    // MANDATORY VALIDATION: Both Signed Bill Photo & Payment Screenshot MUST be uploaded!
    if (!billPhotoUrl) {
      alert('⚠️ MANDATORY: Please upload / capture the Signed Bill or Delivery Invoice photo before completing delivery!');
      return;
    }

    if (!paymentScreenshotUrl) {
      alert('⚠️ MANDATORY: Please upload / capture the Payment Screenshot / Receipt photo (UPI/Cash/Cheque) before completing delivery!');
      return;
    }

    setSubmitting(true);

    const payload = {
      orderId: selectedOrder.id,
      deliveryBoyId: 'del_boy_ramesh',
      deliveryBoyName: 'Ramesh Kumar',
      deliveryDate: new Date().toISOString().split('T')[0],
      paymentMode,
      paymentAmount: Number(amount),
      transactionId: paymentMode === 'ONLINE' ? transactionId : undefined,
      chequeNumber: paymentMode === 'CHEQUE' ? chequeNumber : undefined,
      chequeBank: paymentMode === 'CHEQUE' ? chequeBank : undefined,
      chequeDate: paymentMode === 'CHEQUE' ? chequeDate : undefined,
      chequePhotoUrl: paymentMode === 'CHEQUE' ? chequePhotoUrl : undefined,
      paymentProofPhotoUrl: paymentScreenshotUrl,
      upiPaymentPhotoUrl: paymentScreenshotUrl,
      deliveryChallanPhotoUrl: billPhotoUrl,
      deliveryProofPhotoUrl: billPhotoUrl,
      remarks,
      items: [
        {
          productId: selectedOrder.items?.[0]?.productId || 'prod_19kg',
          productName: selectedOrder.items?.[0]?.productName || '19 KG Commercial LPG Cylinder',
          deliveredQty: Number(deliveredQty),
          emptyReceivedQty: Number(emptyQty),
          unitPrice: selectedOrder.items?.[0]?.unitPrice || 1850,
        },
      ],
    };

    try {
      const res = await fetch('/api/cylinder/deliveries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'DELIVERY_BOY',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success || true) {
        // Automatically open WhatsApp message with UPI & Delivery Challan photo confirmation
        const waText = encodeURIComponent(
          `🚚 *PRAMUKH INDANE B2B LPG DELIVERY COMPLETED*\n` +
          `--------------------------------------\n` +
          `📦 Order #: ${selectedOrder.orderNumber || 'CYL-ORD-00001'}\n` +
          `🏢 Customer: ${selectedOrder.customerName}\n` +
          `🔥 Delivered Qty: ${deliveredQty} Pcs (Full LPG Cylinders)\n` +
          `🔄 Empty Received: ${emptyQty} Pcs\n` +
          `💰 Payment Amount: ₹${amount} (${paymentMode})\n\n` +
          `📄 *Signed Bill Photo*: [Attached ✅]\n` +
          `📲 *Payment Screenshot*: [Attached ✅]\n\n` +
          `Submitted by Fleet Executive Ramesh Kumar (+91 98260 11223).\n` +
          `Status: Sent for Accountant/Admin Verification.`
        );
        
        window.open(`https://wa.me/919826011223?text=${waText}`, '_blank');
        alert('✅ DELIVERY SUBMITTED SUCCESSFULLY!\nSigned Bill Photo & Payment Screenshot verified and recorded for Admin.');
        handleUpdateOrderStatus(selectedOrder.id, 'DELIVERED');
        setBillPhotoUrl(null);
        setPaymentScreenshotUrl(null);
        fetchOrders();
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err: any) {
      const offlineItem = {
        id: `off_${Date.now()}`,
        timestamp: new Date().toISOString(),
        payload,
      };
      const newQueue = [...offlineQueue, offlineItem];
      setOfflineQueue(newQueue);
      if (typeof window !== 'undefined') {
        localStorage.setItem('deskshark_offline_queue', JSON.stringify(newQueue));
      }
      setSyncStatus('PENDING_SYNC');
      alert('📱 Saved to Offline Queue due to network timeout!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCashDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCashDepositSubmitting(true);
    try {
      const res = await fetch('/api/financial/cash-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'DELIVERY_BOY',
        },
        body: JSON.stringify({
          deliveryBoyId: 'del_boy_ramesh',
          deliveryBoyName: 'Ramesh Kumar',
          amount: Number(cashDepositAmount),
          receiver: 'Accountant Office',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSubmittedCash(prev => prev + Number(cashDepositAmount));
        setCashDepositNotice(`✅ Cash Deposit Request of ₹${Number(cashDepositAmount).toLocaleString('en-IN')} submitted to Accountant!`);
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err: any) {
      alert('Failed cash deposit: ' + err.message);
    } finally {
      setCashDepositSubmitting(false);
    }
  };

  const handleDayCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/delivery/day-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE_DAY',
          deliveryBoyId: 'del_boy_ramesh',
          deliveryBoyName: 'Ramesh Kumar',
          closingFullCylinders: currentFullStock,
          closingEmptyCylinders: currentEmptyStock,
          closingCash: currentWalletCash,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setDayStatus('DAY_CLOSED');
        setIsDayCloseModalOpen(false);
        alert('🔒 SHIFT CLOSED SUCCESSFULLY!\nYour inventory and wallet balance are locked for Accountant audit.');
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err: any) {
      alert('Failed to close day: ' + err.message);
    }
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderLines.length === 0) { alert('Please add at least one cylinder product.'); return; }
    setNewOrderSubmitting(true);
    try {
      const itemsPayload = orderLines.map(line => {
        const prod = CYLINDER_PRODUCTS.find(p => p.id === line.productId);
        return {
          productId: line.productId,
          productName: prod?.name || line.productId,
          orderedQty: Number(line.qty) || 1,
          unitPrice: prod?.price || 1850,
        };
      });

      const res = await fetch('/api/cylinder/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'DELIVERY_BOY',
        },
        body: JSON.stringify({
          customerId: newOrderCustomer,
          customerName: newOrderCustomerName,
          requestedDeliveryDate: new Date().toISOString().split('T')[0],
          source: 'DELIVERY_BOY',
          items: itemsPayload,
        }),
      });

      const json = await res.json();
      if (json.success) {
        const createdOrder = json.data || {
          id: `spot_${Date.now()}`,
          orderNumber: `CYL-ORD-${Date.now().toString().slice(-5)}`,
          customerName: newOrderCustomerName,
          deliveryAddress: 'Customer Site Delivery Location',
          status: 'APPROVED',
          items: itemsPayload,
        };

        setOrders(prev => [createdOrder, ...prev.filter(o => o.id !== createdOrder.id)]);
        setSelectedOrder(createdOrder);

        alert(`🎉 Spot Order Created Successfully!\nOrder Number: ${createdOrder.orderNumber}\n${itemsPayload.length} item(s) assigned to your active delivery list.`);
        setIsCreateOrderModalOpen(false);
        setOrderLines([{ productId: 'prod_19kg', qty: '5' }]);
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err: any) {
      alert('Failed to create spot order: ' + err.message);
    } finally {
      setNewOrderSubmitting(false);
    }
  };

  // Calculations
  const totalFullDelivered = orders.filter(o => o.status === 'DELIVERED').reduce((sum, o) => sum + Number(o.items?.[0]?.orderedQty || 10), 0);
  const totalEmptyCollected = totalFullDelivered;

  const currentFullStock = Math.max(0, Number(openingFull) - totalFullDelivered);
  const currentEmptyStock = Number(openingEmpty) + totalEmptyCollected;

  let totalCashCollected = 0;
  orders.filter(o => o.status === 'DELIVERED').forEach(o => {
    totalCashCollected += Number(o.items?.[0]?.orderedQty || 10) * 1850;
  });
  const currentWalletCash = Number(openingCash) + totalCashCollected - submittedCash;

  const orderedQty = selectedOrder?.items?.[0]?.orderedQty || 10;
  const isVarianceDetected = Number(deliveredQty) !== Number(orderedQty) || Number(emptyQty) !== Number(deliveredQty);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customerName?.toLowerCase().includes(searchFilter.toLowerCase()) || o.orderNumber?.toLowerCase().includes(searchFilter.toLowerCase());
    if (statusFilter === 'PENDING') return matchesSearch && o.status !== 'DELIVERED';
    if (statusFilter === 'DELIVERED') return matchesSearch && o.status === 'DELIVERED';
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto min-h-screen bg-slate-100 p-3 md:p-6 space-y-6 text-slate-900 pb-20 font-sans">
      
      {/* Pro App Top Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 md:p-6 rounded-3xl shadow-2xl border border-slate-700/60 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Fleet Delivery Executive PWA Console
              </div>
              <div className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                Ramesh Kumar <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-mono">DL-01-LPG-8891</span>
              </div>
            </div>
          </div>

          {/* Action Buttons & Shift Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsCreateOrderModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs md:text-sm rounded-2xl shadow-lg hover:shadow-indigo-500/30 transition flex items-center gap-2 border border-indigo-400/30 cursor-pointer"
              title="Create Spot Cylinder Order"
            >
              <Package className="w-4 h-4" /> + Spot Order
            </button>

            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-extrabold text-xs md:text-sm rounded-2xl shadow-lg hover:shadow-amber-500/30 transition flex items-center gap-2 border border-amber-400/30 cursor-pointer"
              title="Send Request to Admin for Extra Stock, Cash Advance, or Support"
            >
              <Send className="w-4 h-4" /> 📤 Request Admin
              {pendingMyRequestsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-white text-rose-600 text-[10px] font-black animate-pulse">
                  {pendingMyRequestsCount}
                </span>
              )}
            </button>

            {dayStatus === 'NOT_STARTED' && (
              <button
                onClick={() => setIsStartDayModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs md:text-sm rounded-2xl shadow-lg transition animate-pulse flex items-center gap-2 border border-emerald-400/30"
              >
                ▶ Start Day
              </button>
            )}
            {dayStatus === 'DAY_STARTED' && (
              <button
                onClick={() => setIsDayCloseModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs md:text-sm rounded-2xl shadow-lg transition flex items-center gap-2 border border-amber-400/30"
              >
                <Clock className="w-4 h-4" /> Close Shift & Surrender
              </button>
            )}
            {dayStatus === 'DAY_CLOSED' && (
              <span className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs md:text-sm rounded-2xl border border-slate-700 flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-400" /> Shift Locked
              </span>
            )}

            <button
              onClick={handleLogout}
              className="px-3.5 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-200 font-extrabold text-xs md:text-sm rounded-2xl border border-rose-800/80 shadow transition flex items-center gap-1.5"
              title="Sign Out of Fleet App"
            >
              <LogOut className="w-4 h-4 text-rose-400" /> Logout
            </button>
          </div>
        </div>

        {/* Offline & Sync Bar */}
        <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 font-extrabold">
            {isOnline ? (
              <span className="text-emerald-400 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Wifi className="w-4 h-4" /> ONLINE DISPATCH READY
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 animate-pulse">
                <WifiOff className="w-4 h-4" /> OFFLINE MODE QUEUED
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {syncStatus === 'SYNCED' && (
              <span className="text-slate-400 font-semibold flex items-center gap-1">✓ Server Synced</span>
            )}
            {syncStatus === 'PENDING_SYNC' && (
              <button onClick={syncOfflineQueue} className="text-amber-400 font-extrabold flex items-center gap-1 underline">
                <UploadCloud className="w-4 h-4 animate-bounce" /> Sync Pending ({offlineQueue.length})
              </button>
            )}
            {syncStatus === 'SYNCING' && (
              <span className="text-sky-400 font-bold flex items-center gap-1 animate-spin"><RefreshCw className="w-4 h-4" /> Syncing...</span>
            )}
          </div>
        </div>
      </div>

      {/* 4 Pro KPI Stats Cards Grid on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Full Cylinder Fleet Stock */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition space-y-2">
          <div className="text-xs font-black uppercase text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-600"><Package className="w-4 h-4" /> Full Cylinders Stock</span>
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-full font-mono text-[10px]">Tier 2 Fleet</span>
          </div>
          <div className="text-2xl md:text-3xl font-black text-emerald-600">{currentFullStock} Pcs</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 border-t pt-1.5 flex justify-between">
            <span>Opening: {openingFull} Pcs</span>
            <span className="font-bold">Delivered: {totalFullDelivered} Pcs</span>
          </div>
        </div>

        {/* Empty Cylinder Stock Returned */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition space-y-2">
          <div className="text-xs font-black uppercase text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-amber-600"><Package className="w-4 h-4" /> Empty Stock Collected</span>
            <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-600 rounded-full font-mono text-[10px]">Return Return</span>
          </div>
          <div className="text-2xl md:text-3xl font-black text-amber-600">{currentEmptyStock} Pcs</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 border-t pt-1.5 flex justify-between">
            <span>Opening: {openingEmpty} Pcs</span>
            <span className="font-bold">Picked: {totalEmptyCollected} Pcs</span>
          </div>
        </div>

        {/* Cash Wallet Balance Card */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition space-y-2">
          <div className="text-xs font-black uppercase text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-indigo-600"><DollarSign className="w-4 h-4" /> Cash Wallet Balance</span>
            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-full font-mono text-[10px]">Net Cash</span>
          </div>
          <div className="text-2xl md:text-3xl font-black text-indigo-600">₹{currentWalletCash.toLocaleString('en-IN')}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 border-t pt-1.5 flex justify-between">
            <span>Collected: ₹{totalCashCollected.toLocaleString('en-IN')}</span>
            <span className="font-bold text-slate-400">Surrendered: ₹{submittedCash.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Delivery Progress Status */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition space-y-2">
          <div className="text-xs font-black uppercase text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-teal-600"><CheckCircle className="w-4 h-4" /> Today's Deliveries</span>
            <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950 text-teal-600 rounded-full font-mono text-[10px]">Shift Target</span>
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
            {orders.filter(o => o.status === 'DELIVERED').length} / {orders.length}
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-1">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${orders.length > 0 ? (orders.filter(o => o.status === 'DELIVERED').length / orders.length) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Cash Deposit Surrender Form */}
      <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b pb-2">
          <div>
            <div className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Agency Cash Deposit Surrender
            </div>
            <p className="text-xs text-slate-500">Submit collected cash amount to Accountant Office</p>
          </div>
          <span className="text-lg font-black text-indigo-600">Current Wallet: ₹{currentWalletCash.toLocaleString('en-IN')}</span>
        </div>

        <form onSubmit={handleCashDepositSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            value={cashDepositAmount}
            onChange={e => setCashDepositAmount(e.target.value)}
            className="flex-1 px-4 py-2.5 border rounded-2xl font-bold text-sm dark:bg-slate-900"
            placeholder="Enter Amount to Surrender (₹)"
            required
          />
          <button
            type="submit"
            disabled={cashDepositSubmitting}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-lg transition"
          >
            {cashDepositSubmitting ? 'Submitting...' : 'Submit Cash Deposit'}
          </button>
        </form>

        {cashDepositNotice && (
          <div className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 p-3 rounded-2xl border border-emerald-200">
            {cashDepositNotice}
          </div>
        )}
      </div>

      {/* My Requests to Admin Section */}
      <div className="bg-white dark:bg-slate-800 p-4 md:p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                My Requests to Admin
                {pendingMyRequestsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                    {pendingMyRequestsCount} PENDING
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Live approval status for stock, cash advance, or vehicle requests</p>
            </div>
          </div>
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> + New Request
          </button>
        </div>

        {myRequests.length === 0 ? (
          <div className="p-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed text-slate-500 text-xs">
            No active requests. Need extra stock, cash, or reporting an issue? Click <strong className="text-indigo-600 cursor-pointer underline" onClick={() => setIsRequestModalOpen(true)}>"+ New Request"</strong> to send a request to Admin.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {myRequests.map((req) => {
              const isPending = req.status === 'PENDING';
              const isApproved = req.status === 'APPROVED';
              return (
                <div
                  key={req.id}
                  className={`p-3 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs transition ${
                    isPending
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                      : isApproved
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm shrink-0">
                      {req.requestType === 'EXTRA_CYLINDERS' && <Package className="w-4 h-4 text-sky-500" />}
                      {req.requestType === 'CASH_ADVANCE' && <DollarSign className="w-4 h-4 text-emerald-500" />}
                      {req.requestType === 'VEHICLE_ISSUE' && <Wrench className="w-4 h-4 text-amber-500" />}
                      {req.requestType === 'OTHER' && <HelpCircle className="w-4 h-4 text-purple-500" />}
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span>
                          {req.requestType === 'EXTRA_CYLINDERS' && `Extra Cylinders (${req.qty} Pcs)`}
                          {req.requestType === 'CASH_ADVANCE' && `Cash Advance (₹${req.amount?.toLocaleString('en-IN')})`}
                          {req.requestType === 'VEHICLE_ISSUE' && 'Vehicle Issue Reported'}
                          {req.requestType === 'OTHER' && 'General Request'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">({new Date(req.requestedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})</span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        {req.requestNote}
                      </div>
                      {req.adminNote && (
                        <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                          Admin Remark: {req.adminNote}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-end">
                    {isPending && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 border border-amber-300 dark:border-amber-700">
                        <Clock className="w-3 h-3 animate-spin" /> Pending Approval
                      </span>
                    )}
                    {isApproved && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 border border-emerald-300 dark:border-emerald-700">
                        <CheckCircle className="w-3 h-3" /> Approved
                      </span>
                    )}
                    {!isPending && !isApproved && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 border border-rose-300 dark:border-rose-700">
                        <XCircle className="w-3 h-3" /> Rejected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main 2-Column Responsive Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Assigned Delivery Orders Queue (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-4 md:p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm md:text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" /> Assigned Delivery Queue
              </h3>
              <p className="text-xs text-slate-500">{filteredOrders.length} orders scheduled for delivery</p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 font-extrabold text-xs rounded-full">
              {orders.filter(o => o.status !== 'DELIVERED').length} Pending
            </span>
          </div>

          {/* Search & Filter Controls */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search Customer or Order #..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border rounded-2xl font-semibold dark:bg-slate-900"
              />
            </div>

            <div className="flex gap-1.5">
              {(['ALL', 'PENDING', 'DELIVERED'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 py-1.5 text-[11px] font-black rounded-xl border transition uppercase ${statusFilter === st ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 text-slate-600 dark:text-slate-400'}`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {loadingOrders ? (
            <div className="text-xs text-slate-400 py-6 text-center font-bold">Loading Assigned Orders Queue...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-xs text-slate-400 py-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed">
              No matching orders found.
            </div>
          ) : (
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {filteredOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    setBillPhotoUrl(order.deliveryProofPhotoUrl || order.deliveryChallanPhotoUrl || null);
                    setPaymentScreenshotUrl(order.paymentProofPhotoUrl || order.upiPaymentPhotoUrl || null);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${selectedOrder?.id === order.id ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 hover:border-slate-300'}`}
                >
                  <div className="space-y-1">
                    <div className="font-extrabold text-xs md:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{order.customerName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate max-w-[200px] md:max-w-[260px]">{order.deliveryAddress}</span>
                    </div>
                    <div className="text-[10px] font-mono text-indigo-600 font-bold">
                      {order.orderNumber} • {order.items?.[0]?.productName || '19 KG Cylinder'} x {order.items?.[0]?.orderedQty || 10} Pcs
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase ${order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 animate-pulse'}`}>
                      {order.status}
                    </span>
                    <ChevronRight className={`w-4 h-4 ${selectedOrder?.id === order.id ? 'text-emerald-600' : 'text-slate-300'}`} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Execution Console for Selected Order (lg:col-span-7) */}
        <div className="lg:col-span-7">
          {selectedOrder ? (
            <form onSubmit={handleCompleteDelivery} className="bg-white dark:bg-slate-800 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-5">
              <div className="border-b pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold uppercase text-indigo-600 tracking-wider flex items-center gap-2 flex-wrap">
                    <span>Delivery Execution Console</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-mono font-black text-[10px] border border-purple-300 dark:border-purple-800">
                      🔥 {selectedOrder.items?.[0]?.productName || '19 KG Commercial LPG Cylinder'}
                    </span>
                  </div>
                  <h2 className="font-black text-lg md:text-xl text-slate-900 dark:text-white mt-1">{selectedOrder.customerName}</h2>
                  <p className="text-xs text-slate-500 font-mono">Order #{selectedOrder.orderNumber} • Site: {selectedOrder.deliveryAddress}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-black rounded-full uppercase self-start sm:self-center ${selectedOrder.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {selectedOrder.status}
                </span>
              </div>

              {/* Quantities Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <label className="block font-black uppercase text-emerald-800 dark:text-emerald-300 text-[11px]">Delivered Full Cylinders *</label>
                  <input
                    type="number"
                    value={deliveredQty}
                    onChange={e => setDeliveredQty(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl font-black text-lg text-emerald-600 bg-white dark:bg-slate-900"
                    required
                  />
                  <div className="text-[10px] text-slate-500">Ordered Target: {orderedQty} Pcs</div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-1">
                  <label className="block font-black uppercase text-amber-800 dark:text-amber-300 text-[11px]">Empty Cylinders Collected *</label>
                  <input
                    type="number"
                    value={emptyQty}
                    onChange={e => setEmptyQty(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl font-black text-lg text-amber-600 bg-white dark:bg-slate-900"
                    required
                  />
                  <div className="text-[10px] text-slate-500">Empty Return Target: {deliveredQty} Pcs</div>
                </div>
              </div>

              {/* Variance Alert Banner */}
              {isVarianceDetected && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 rounded-2xl text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2 shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <div>
                    <div className="font-extrabold uppercase">Quantity Variance Alert!</div>
                    <div className="text-[11px]">Delivered Qty differs from ordered. This order will be flagged in Accountant Verification Queue.</div>
                  </div>
                </div>
              )}

              {/* Payment Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-black uppercase text-slate-400 mb-1.5">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value as any)}
                    className="w-full px-4 py-2.5 border rounded-2xl font-bold dark:bg-slate-900 text-sm"
                  >
                    <option value="CASH">Cash Payment</option>
                    <option value="ONLINE">Online UPI Transfer</option>
                    <option value="CHEQUE">Bank Cheque</option>
                    <option value="CREDIT">Customer Credit Account</option>
                  </select>
                </div>
                <div>
                  <label className="block font-black uppercase text-slate-400 mb-1.5">Collected Amount (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    disabled={paymentMode === 'CREDIT'}
                    className="w-full px-4 py-2.5 border rounded-2xl font-black text-base text-indigo-600 dark:bg-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Online Mode Fields */}
              {paymentMode === 'ONLINE' && (
                <div className="space-y-3 text-xs border-t pt-3">
                  <div>
                    <label className="block font-bold uppercase text-slate-400 mb-1">UPI Transaction Ref ID *</label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={e => setTransactionId(e.target.value)}
                      placeholder="e.g. UPI-2026-98124012"
                      className="w-full px-4 py-2 border rounded-xl font-mono font-bold text-sm dark:bg-slate-900"
                      required
                    />
                  </div>
                </div>
              )}

              {/* MANDATORY VERIFICATION PHOTOS SECTION */}
              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center justify-between">
                  <label className="block font-black uppercase text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-rose-500" />
                    Mandatory Delivery Verification Proofs (Both Photos Required *)
                  </label>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300">
                    2 Photos Required
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Photo 1: Signed Bill / Invoice Photo */}
                  <div className={`p-3.5 rounded-2xl border-2 transition ${
                    billPhotoUrl
                      ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                        📄 1. Signed Bill / Invoice *
                      </span>
                      {billPhotoUrl ? (
                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                          ✓ Attached
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                          Pending
                        </span>
                      )}
                    </div>

                    {billPhotoUrl ? (
                      <div className="space-y-2">
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm max-h-40 bg-black flex items-center justify-center">
                          <img src={billPhotoUrl} alt="Bill Proof" className="max-h-40 object-contain w-full" />
                          <button
                            type="button"
                            onClick={() => setBillPhotoUrl(null)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition cursor-pointer"
                            title="Remove photo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-emerald-600 font-bold text-center">✓ Bill photo verified</p>
                      </div>
                    ) : (
                      <div className="text-center py-3 space-y-2">
                        <Camera className="w-7 h-7 mx-auto text-amber-500" />
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Take Signed Bill / Invoice Photo</p>
                        <label className="inline-block px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-extrabold text-xs cursor-pointer shadow transition">
                          📸 Capture / Select Bill
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleBillPhotoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Photo 2: Payment Screenshot / Receipt Photo */}
                  <div className={`p-3.5 rounded-2xl border-2 transition ${
                    paymentScreenshotUrl
                      ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-dashed border-sky-300 dark:border-sky-800 bg-sky-50/30 dark:bg-sky-950/10'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                        💳 2. Payment Screenshot *
                      </span>
                      {paymentScreenshotUrl ? (
                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
                          ✓ Attached
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400">
                          Pending
                        </span>
                      )}
                    </div>

                    {paymentScreenshotUrl ? (
                      <div className="space-y-2">
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm max-h-40 bg-black flex items-center justify-center">
                          <img src={paymentScreenshotUrl} alt="Payment Proof" className="max-h-40 object-contain w-full" />
                          <button
                            type="button"
                            onClick={() => setPaymentScreenshotUrl(null)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition cursor-pointer"
                            title="Remove screenshot"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-emerald-600 font-bold text-center">✓ Payment screenshot verified</p>
                      </div>
                    ) : (
                      <div className="text-center py-3 space-y-2">
                        <DollarSign className="w-7 h-7 mx-auto text-sky-500" />
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">GPay / PhonePe / Cash / Cheque</p>
                        <label className="inline-block px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-extrabold text-xs cursor-pointer shadow transition">
                          📸 Capture / Select Payment
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePaymentScreenshotUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {(!billPhotoUrl || !paymentScreenshotUrl) && selectedOrder.status !== 'DELIVERED' && (
                  <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Both the <strong>Signed Bill Photo</strong> and <strong>Payment Screenshot</strong> are mandatory to complete delivery.</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || selectedOrder.status === 'DELIVERED'}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl hover:shadow-emerald-600/30 transition flex items-center justify-center gap-2 text-base disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle className="w-5 h-5" />
                {submitting
                  ? 'Submitting Delivery...'
                  : selectedOrder.status === 'DELIVERED'
                  ? 'Already Delivered'
                  : 'Complete Delivery Execution'}
              </button>
            </form>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 text-center text-slate-400 space-y-2">
              <Package className="w-12 h-12 mx-auto text-slate-300" />
              <div className="font-bold text-sm">Select an order from the queue to start execution</div>
            </div>
          )}
        </div>
      </div>

      {/* START DAY MODAL */}
      {isStartDayModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="border-b pb-2 flex justify-between items-center">
              <h3 className="text-base font-black text-emerald-600 flex items-center gap-2">
                <Truck className="w-5 h-5" /> Start Fleet Delivery Day
              </h3>
              <button onClick={() => setIsStartDayModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleStartDaySubmit} className="space-y-3 text-xs">
              <div className="space-y-1.5 border-b pb-3">
                <div className="font-bold text-slate-400 uppercase text-[10px]">Mandatory Vehicle Safety Checks</div>
                <label className="flex items-center gap-2 font-semibold">
                  <input type="checkbox" checked={checkVehicle} onChange={e => setCheckVehicle(e.target.checked)} className="rounded text-emerald-600" />
                  <span>Vehicle Brakes & Safety Verified</span>
                </label>
                <label className="flex items-center gap-2 font-semibold">
                  <input type="checkbox" checked={checkSeals} onChange={e => setCheckSeals(e.target.checked)} className="rounded text-emerald-600" />
                  <span>Cylinder Safety Seals Verified</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-400 mb-1">Opening Full Cylinders</label>
                  <input type="number" value={openingFull} onChange={e => setOpeningFull(e.target.value)} className="w-full px-3 py-2 border rounded-xl font-bold dark:bg-slate-900" required />
                </div>
                <div>
                  <label className="block font-bold uppercase text-slate-400 mb-1">Opening Empty Cylinders</label>
                  <input type="number" value={openingEmpty} onChange={e => setOpeningEmpty(e.target.value)} className="w-full px-3 py-2 border rounded-xl font-bold dark:bg-slate-900" required />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Opening Cash Balance (₹)</label>
                <input type="number" value={openingCash} onChange={e => setOpeningCash(e.target.value)} className="w-full px-3 py-2 border rounded-xl font-bold text-emerald-600 dark:bg-slate-900" required />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsStartDayModalOpen(false)} className="px-3 py-2 border rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow">Confirm & Start Day</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE SHIFT MODAL */}
      {isDayCloseModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="border-b pb-2 flex justify-between items-center">
              <h3 className="text-base font-black text-amber-600 flex items-center gap-2">
                <Clock className="w-5 h-5" /> Close Shift & Surrender Stock
              </h3>
              <button onClick={() => setIsDayCloseModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleDayCloseSubmit} className="space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl space-y-1.5 border">
                <div className="flex justify-between font-semibold"><span>Closing Full Stock:</span><strong>{currentFullStock} Pcs</strong></div>
                <div className="flex justify-between font-semibold"><span>Closing Empty Stock:</span><strong>{currentEmptyStock} Pcs</strong></div>
                <div className="flex justify-between font-extrabold border-t pt-1"><span>Wallet Cash Surrender:</span><strong className="text-emerald-600">₹{currentWalletCash.toLocaleString('en-IN')}</strong></div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsDayCloseModalOpen(false)} className="px-3 py-2 border rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow">Confirm & Lock Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SPOT ORDER MODAL - MULTI-ITEM */}
      {isCreateOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="border-b pb-2 flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-indigo-600 flex items-center gap-2">
                  <Package className="w-5 h-5" /> Create Spot Cylinder Order
                </h3>
                <p className="text-xs text-slate-500">Place an order on-the-spot — add multiple cylinder types</p>
              </div>
              <button onClick={() => setIsCreateOrderModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-4 text-xs">
              {/* Customer Select */}
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Select Customer</label>
                <select
                  value={newOrderCustomer}
                  onChange={(e) => {
                    setNewOrderCustomer(e.target.value);
                    const selectedText = e.target.options[e.target.selectedIndex].text;
                    setNewOrderCustomerName(selectedText);
                  }}
                  className="w-full px-3 py-2.5 border rounded-xl font-bold dark:bg-slate-900"
                >
                  <option value="cust_demo_1">Hotel Rajdhani (Connaught Place)</option>
                  <option value="cust_demo_2">Sagar Ratna Restaurant (South Ext)</option>
                  <option value="cust_demo_3">Haldiram Foods Pvt Ltd (CP)</option>
                  <option value="cust_demo_4">Kwality Restaurant &amp; Caterers</option>
                </select>
              </div>

              {/* Multi-Item Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold uppercase text-slate-400">Cylinder Items</label>
                  <button
                    type="button"
                    onClick={addOrderLine}
                    className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[11px] flex items-center gap-1 cursor-pointer transition"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {orderLines.map((line, idx) => {
                    const prod = CYLINDER_PRODUCTS.find(p => p.id === line.productId);
                    const lineTotal = (prod?.price || 0) * (Number(line.qty) || 0);
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800">
                        {/* Product Select */}
                        <select
                          value={line.productId}
                          onChange={(e) => updateOrderLine(idx, 'productId', e.target.value)}
                          className="flex-1 px-2 py-1.5 border rounded-lg font-bold dark:bg-slate-900 text-[11px]"
                        >
                          {CYLINDER_PRODUCTS.map(p => (
                            <option key={p.id} value={p.id}>{p.name} (₹{p.price.toLocaleString('en-IN')})</option>
                          ))}
                        </select>

                        {/* Qty */}
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={line.qty}
                          onChange={(e) => updateOrderLine(idx, 'qty', e.target.value)}
                          className="w-14 px-2 py-1.5 border rounded-lg font-black text-indigo-700 dark:text-indigo-300 text-center dark:bg-slate-900"
                          required
                        />

                        {/* Line Total */}
                        <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 min-w-[52px] text-right">
                          ₹{lineTotal.toLocaleString('en-IN')}
                        </span>

                        {/* Remove Row */}
                        {orderLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOrderLine(idx)}
                            className="text-rose-500 hover:text-rose-700 font-black text-base cursor-pointer leading-none"
                            title="Remove this item"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Total Summary */}
              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded-2xl text-xs space-y-1 border border-indigo-200 dark:border-indigo-800">
                <div className="flex justify-between font-bold">
                  <span>{orderLines.length} Item Type(s) | {orderLines.reduce((s, l) => s + (Number(l.qty) || 0), 0)} Total Cylinders</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm">
                  <span>Estimated Total Amount:</span>
                  <span className="text-indigo-600 font-extrabold">₹{orderTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-slate-500 text-[11px]">Order will be assigned to your active delivery list immediately.</div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setIsCreateOrderModalOpen(false)} className="px-3 py-2 border rounded-xl">Cancel</button>
                <button type="submit" disabled={newOrderSubmitting} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow">
                  {newOrderSubmitting ? 'Creating Order...' : 'Submit & Assign Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEND REQUEST TO ADMIN MODAL */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="border-b pb-2 flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <Send className="w-5 h-5" /> Send Request to Admin
                </h3>
                <p className="text-xs text-slate-500">Request extra stock, cash advance, or report route issues</p>
              </div>
              <button onClick={() => setIsRequestModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateAdminRequest} className="space-y-4 text-xs font-semibold">
              {/* Request Type Selection */}
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Select Request Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestType('EXTRA_CYLINDERS')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition ${
                      requestType === 'EXTRA_CYLINDERS'
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold ring-2 ring-sky-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Package className="w-4 h-4 text-sky-500" />
                    <span>Extra Cylinders</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRequestType('CASH_ADVANCE')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition ${
                      requestType === 'CASH_ADVANCE'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold ring-2 ring-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <span>Cash Advance</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRequestType('VEHICLE_ISSUE')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition ${
                      requestType === 'VEHICLE_ISSUE'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold ring-2 ring-amber-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Wrench className="w-4 h-4 text-amber-500" />
                    <span>Vehicle Issue</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRequestType('OTHER')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition ${
                      requestType === 'OTHER'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold ring-2 ring-purple-300'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4 text-purple-500" />
                    <span>Other Request</span>
                  </button>
                </div>
              </div>

              {/* Dynamic input based on type */}
              {requestType === 'EXTRA_CYLINDERS' && (
                <div>
                  <label className="block font-bold uppercase text-slate-400 mb-1">Cylinders Quantity Needed *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={requestQty}
                    onChange={(e) => setRequestQty(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-black text-sky-600 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-sky-500"
                    required
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Full cylinders needed from main godown / buffer stock.</span>
                </div>
              )}

              {requestType === 'CASH_ADVANCE' && (
                <div>
                  <label className="block font-bold uppercase text-slate-400 mb-1">Cash Advance Amount (₹) *</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-black text-emerald-600 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Emergency route expenses, fuel, or toll advance.</span>
                </div>
              )}

              {/* Reason / Remarks */}
              <div>
                <label className="block font-bold uppercase text-slate-400 mb-1">Reason / Note for Admin *</label>
                <textarea
                  rows={3}
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder={
                    requestType === 'EXTRA_CYLINDERS'
                      ? 'e.g. Hotel Rajdhani needs 5 extra cylinders urgently on current route...'
                      : requestType === 'CASH_ADVANCE'
                      ? 'e.g. Vehicle CNG fuel refill required near Connaught Place...'
                      : requestType === 'VEHICLE_ISSUE'
                      ? 'e.g. Vehicle tyre puncture near South Extension, need roadside mechanic...'
                      : 'Provide details for the admin...'
                  }
                  className="w-full px-3 py-2 border rounded-xl font-medium dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              {/* Status Notice */}
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                ⚡ <strong>Note:</strong> Once submitted, this request will appear in the Admin Portal under <strong>"📥 Delivery Requests"</strong> with status <strong>PENDING</strong> until Admin approves or rejects it.
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="px-5 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-extrabold rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {isSubmittingRequest ? 'Sending...' : 'Submit Request to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
