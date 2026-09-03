'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Search, 
  RefreshCw, 
  Plus, 
  X, 
  Check, 
  FileText, 
  ArrowRightLeft, 
  AlertCircle, 
  Clock, 
  ShieldAlert,
  Edit,
  Trash2,
  Eye,
  Filter,
  CheckCircle2,
  Building2,
  Truck,
  ArrowUpRight,
  ArrowDownLeft,
  Flame,
  Layers,
  Printer
} from 'lucide-react';

interface CylinderInventoryItem {
  id: string;
  customerId?: string;
  customerName: string;
  productName: string;
  category: 'Commercial 19KG' | 'Industrial 47.5KG' | 'Domestic 14.2KG' | 'Other';
  openingQty: number;
  currentFullBalance: number;
  currentEmptyBalance: number;
  defectiveQty: number;
  inTransitRefillQty: number;
  location: string;
  lastUpdated: string;
}

const DEFAULT_INVENTORY_ITEMS: CylinderInventoryItem[] = [
  {
    id: 'cyl_inv_1',
    customerId: 'cust_1',
    customerName: 'Sharma Electronics & Superstore',
    productName: '19 KG Commercial LPG Cylinder',
    category: 'Commercial 19KG',
    openingQty: 12,
    currentFullBalance: 8,
    currentEmptyBalance: 4,
    defectiveQty: 0,
    inTransitRefillQty: 2,
    location: 'Indore Central Warehouse',
    lastUpdated: '2026-08-30',
  },
  {
    id: 'cyl_inv_2',
    customerId: 'cust_2',
    customerName: 'Apex Infotech Solutions',
    productName: '19 KG Commercial LPG Cylinder',
    category: 'Commercial 19KG',
    openingQty: 20,
    currentFullBalance: 15,
    currentEmptyBalance: 5,
    defectiveQty: 1,
    inTransitRefillQty: 5,
    location: 'Vijay Nagar Godown',
    lastUpdated: '2026-08-31',
  },
  {
    id: 'cyl_inv_3',
    customerId: 'cust_3',
    customerName: 'Rajput Wholesale Traders',
    productName: '47.5 KG Industrial LPG Cylinder',
    category: 'Industrial 47.5KG',
    openingQty: 10,
    currentFullBalance: 6,
    currentEmptyBalance: 4,
    defectiveQty: 0,
    inTransitRefillQty: 3,
    location: 'Pithampur Industrial Godown',
    lastUpdated: '2026-08-29',
  },
  {
    id: 'cyl_inv_4',
    customerId: 'cust_4',
    customerName: 'National Distributors Pvt Ltd',
    productName: '19 KG Commercial LPG Cylinder',
    category: 'Commercial 19KG',
    openingQty: 30,
    currentFullBalance: 22,
    currentEmptyBalance: 8,
    defectiveQty: 2,
    inTransitRefillQty: 10,
    location: 'Dewas Naka Warehouse',
    lastUpdated: '2026-08-31',
  },
  {
    id: 'cyl_inv_5',
    customerId: 'cust_5',
    customerName: 'Gujarat Tech Supplies Ltd',
    productName: '14.2 KG Domestic LPG Cylinder',
    category: 'Domestic 14.2KG',
    openingQty: 15,
    currentFullBalance: 10,
    currentEmptyBalance: 5,
    defectiveQty: 0,
    inTransitRefillQty: 0,
    location: 'Main Plant Storage',
    lastUpdated: '2026-08-28',
  },
];

export default function CylinderBalanceModule() {
  const [activeSubTab, setActiveSubTab] = useState<'customer' | 'plant' | 'defective' | 'voucher'>('customer');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Commercial 19KG' | 'Industrial 47.5KG' | 'Domestic 14.2KG' | 'LOW_STOCK'>('ALL');
  
  const [balances, setBalances] = useState<CylinderInventoryItem[]>(DEFAULT_INVENTORY_ITEMS);
  const [vouchers, setVouchers] = useState<any[]>([
    { 
      id: 'v_1', 
      voucherNumber: 'SV-2026-0089', 
      voucherType: 'SV', 
      customerId: 'cust_demo_1',
      customerName: 'Hotel Rajdhani (Connaught Place)', 
      relationshipManagerId: 'emp_2',
      relationshipManagerName: 'Vikram Sharma',
      defaultDeliveryBoyId: 'emp_1',
      defaultDeliveryBoyName: 'Ramesh Kumar',
      voucherReference: 'REF-SV-8921',
      cylinderQty: 10, 
      regulatorQty: 2, 
      depositAmount: 25000, 
      issueDate: '2026-06-15', 
      status: 'ACTIVE' 
    },
    { 
      id: 'v_2', 
      voucherNumber: 'SV-2026-0104', 
      voucherType: 'SV', 
      customerId: 'cust_demo_2',
      customerName: 'Apex Industrial Fabrics (Okhla)', 
      relationshipManagerId: 'emp_4',
      relationshipManagerName: 'Priya Verma',
      defaultDeliveryBoyId: 'emp_3',
      defaultDeliveryBoyName: 'Suresh Patel',
      voucherReference: 'REF-SV-9912',
      cylinderQty: 20, 
      regulatorQty: 4, 
      depositAmount: 50000, 
      issueDate: '2026-07-01', 
      status: 'ACTIVE' 
    },
    { 
      id: 'v_3', 
      voucherNumber: 'TV-2026-0012', 
      voucherType: 'TV', 
      customerId: 'cust_demo_3',
      customerName: 'Standard Bakers (Karol Bagh)', 
      relationshipManagerId: 'emp_2',
      relationshipManagerName: 'Vikram Sharma',
      defaultDeliveryBoyId: 'emp_1',
      defaultDeliveryBoyName: 'Ramesh Kumar',
      voucherReference: 'REF-TV-0012',
      cylinderQty: 5, 
      regulatorQty: 1, 
      depositAmount: 12500, 
      issueDate: '2026-08-10', 
      status: 'ACTIVE' 
    },
  ]);
  
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CylinderInventoryItem | null>(null);
  
  // Form Fields
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formProductName, setFormProductName] = useState('19 KG Commercial LPG Cylinder');
  const [formCategory, setFormCategory] = useState<'Commercial 19KG' | 'Industrial 47.5KG' | 'Domestic 14.2KG' | 'Other'>('Commercial 19KG');
  const [formOpeningQty, setFormOpeningQty] = useState('10');
  const [formFullQty, setFormFullQty] = useState('5');
  const [formEmptyQty, setFormEmptyQty] = useState('5');
  const [formDefectiveQty, setFormDefectiveQty] = useState('0');
  const [formInTransitQty, setFormInTransitQty] = useState('0');
  const [formLocation, setFormLocation] = useState('Indore Central Warehouse');
  const [saving, setSaving] = useState(false);

  // Ledger Detail Modal State
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState<any>(null);

  // Adjustment Modal State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjCustomerName, setAdjCustomerName] = useState('');
  const [adjFullQty, setAdjFullQty] = useState('0');
  const [adjEmptyQty, setAdjEmptyQty] = useState('0');
  const [adjReason, setAdjReason] = useState('');
  const [adjSubmitting, setAdjSubmitting] = useState(false);

  // Stock Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferType, setTransferType] = useState<'WAREHOUSE_TO_DRIVER' | 'DRIVER_TO_DRIVER' | 'DRIVER_TO_WAREHOUSE'>('WAREHOUSE_TO_DRIVER');
  const [fromLocation, setFromLocation] = useState('Godown 1 (Central Warehouse)');
  const [toLocation, setToLocation] = useState('Ramesh Kumar (Delivery Boy)');
  const [transferFullQty, setTransferFullQty] = useState('10');
  const [transferEmptyQty, setTransferEmptyQty] = useState('0');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  // Fetch Balances from API
  const fetchBalances = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cylinder/inventory');
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setBalances(json.data);
      }
    } catch (err) {
      console.error('API Inventory Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormCustomerName('');
    setFormProductName('19 KG Commercial LPG Cylinder');
    setFormCategory('Commercial 19KG');
    setFormOpeningQty('10');
    setFormFullQty('5');
    setFormEmptyQty('5');
    setFormDefectiveQty('0');
    setFormInTransitQty('0');
    setFormLocation('Indore Central Warehouse');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: CylinderInventoryItem) => {
    setEditingItem(item);
    setFormCustomerName(item.customerName || '');
    setFormProductName(item.productName || '19 KG Commercial LPG Cylinder');
    setFormCategory(item.category || 'Commercial 19KG');
    setFormOpeningQty(String(item.openingQty || 0));
    setFormFullQty(String(item.currentFullBalance || 0));
    setFormEmptyQty(String(item.currentEmptyBalance || 0));
    setFormDefectiveQty(String(item.defectiveQty || 0));
    setFormInTransitQty(String(item.inTransitRefillQty || 0));
    setFormLocation(item.location || 'Indore Central Warehouse');
    setIsModalOpen(true);
  };

  // Delete Record
  const handleDeleteItem = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete cylinder inventory entry for "${name}"?`)) {
      setBalances((prev) => prev.filter((b) => b.id !== id));
      alert('✅ Cylinder inventory record deleted successfully.');
    }
  };

  // Handle Save (Add or Update)
  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerName.trim()) {
      alert('Please enter Customer / Site Name');
      return;
    }

    setSaving(true);
    const today = new Date().toISOString().split('T')[0];

    if (editingItem) {
      // Update existing
      setBalances((prev) =>
        prev.map((b) => {
          if (b.id !== editingItem.id) return b;
          return {
            ...b,
            customerName: formCustomerName.trim(),
            productName: formProductName,
            category: formCategory,
            openingQty: Number(formOpeningQty) || 0,
            currentFullBalance: Number(formFullQty) || 0,
            currentEmptyBalance: Number(formEmptyQty) || 0,
            defectiveQty: Number(formDefectiveQty) || 0,
            inTransitRefillQty: Number(formInTransitQty) || 0,
            location: formLocation,
            lastUpdated: today,
          };
        })
      );
      alert('✅ Cylinder Inventory Record Updated Successfully!');
    } else {
      // Add new
      const newItem: CylinderInventoryItem = {
        id: `cyl_inv_${Date.now()}`,
        customerName: formCustomerName.trim(),
        productName: formProductName,
        category: formCategory,
        openingQty: Number(formOpeningQty) || 0,
        currentFullBalance: Number(formFullQty) || 0,
        currentEmptyBalance: Number(formEmptyQty) || 0,
        defectiveQty: Number(formDefectiveQty) || 0,
        inTransitRefillQty: Number(formInTransitQty) || 0,
        location: formLocation,
        lastUpdated: today,
      };
      setBalances((prev) => [newItem, ...prev]);
      alert('✅ New Cylinder Inventory Entry Added Successfully!');
    }

    setSaving(false);
    setIsModalOpen(false);
    setEditingItem(null);
  };

  // Open Ledger Modal
  const handleOpenLedger = (cust: CylinderInventoryItem) => {
    setIsLedgerModalOpen(true);
    setLedgerLoading(true);
    
    setTimeout(() => {
      setLedgerData({
        customerName: cust.customerName,
        productName: cust.productName,
        kpis: {
          openingBalance: cust.openingQty || 10,
          deliveredFull: cust.currentFullBalance || 15,
          emptyReceived: cust.currentEmptyBalance || 10,
          adjustments: 0,
          currentBalance: (cust.openingQty || 10) + (cust.currentFullBalance || 15) - (cust.currentEmptyBalance || 10),
        },
        transactions: [
          {
            id: 'tx_1',
            date: '2026-08-25',
            reference: 'CYL-DEL-0089',
            transactionType: 'DRIVER_TO_CUSTOMER',
            productName: cust.productName,
            fullQty: cust.currentFullBalance || 8,
            emptyQty: 0,
            runningBalance: (cust.openingQty || 10) + (cust.currentFullBalance || 8),
            performedBy: 'Ramesh Kumar (Fleet Boy)',
            reason: 'Scheduled refill delivery',
          },
          {
            id: 'tx_2',
            date: '2026-08-28',
            reference: 'CYL-RET-0042',
            transactionType: 'CUSTOMER_EMPTY_RETURN',
            productName: cust.productName,
            fullQty: 0,
            emptyQty: cust.currentEmptyBalance || 4,
            runningBalance: (cust.openingQty || 10) + (cust.currentFullBalance || 8) - (cust.currentEmptyBalance || 4),
            performedBy: 'Ramesh Kumar (Fleet Boy)',
            reason: 'Empty cylinder pickup for refill',
          },
        ],
      });
      setLedgerLoading(false);
    }, 200);
  };

  // Open Adjustment Modal
  const handleOpenAdjustment = (cust: CylinderInventoryItem) => {
    setAdjCustomerName(cust.customerName);
    setAdjFullQty(String(cust.currentFullBalance || 0));
    setAdjEmptyQty(String(cust.currentEmptyBalance || 0));
    setAdjReason('');
    setIsAdjustmentModalOpen(true);
  };

  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjReason.trim()) {
      alert('⚠️ Please enter mandatory reason for audit adjustment.');
      return;
    }
    setAdjSubmitting(true);
    setTimeout(() => {
      alert(`✅ Stock Adjustment Request for "${adjCustomerName}" submitted to Manager Approval Queue!`);
      setAdjSubmitting(false);
      setIsAdjustmentModalOpen(false);
    }, 400);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferSubmitting(true);
    setTimeout(() => {
      alert('✅ Stock Transfer Request submitted to Manager Approval Queue!');
      setTransferSubmitting(false);
      setIsTransferModalOpen(false);
    }, 400);
  };

  // Calculate Totals & Stats
  const totalEmpty = useMemo(() => balances.reduce((sum, b) => sum + (b.currentEmptyBalance || 0), 0), [balances]);
  const totalFull = useMemo(() => balances.reduce((sum, b) => sum + (b.currentFullBalance || 0), 0), [balances]);
  const totalDefective = useMemo(() => balances.reduce((sum, b) => sum + (b.defectiveQty || 0), 0), [balances]);
  const totalInTransit = useMemo(() => balances.reduce((sum, b) => sum + (b.inTransitRefillQty || 0), 0), [balances]);
  const totalDepositAmount = useMemo(() => vouchers.reduce((sum, v) => sum + (v.depositAmount || 0), 0), [vouchers]);

  // Filtered Inventory Items
  const filteredBalances = useMemo(() => {
    return balances.filter((b) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        b.customerName.toLowerCase().includes(searchLower) ||
        b.productName.toLowerCase().includes(searchLower) ||
        b.location.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      if (categoryFilter === 'Commercial 19KG') return b.category === 'Commercial 19KG';
      if (categoryFilter === 'Industrial 47.5KG') return b.category === 'Industrial 47.5KG';
      if (categoryFilter === 'Domestic 14.2KG') return b.category === 'Domestic 14.2KG';
      if (categoryFilter === 'LOW_STOCK') return (b.currentFullBalance || 0) < 5;

      return true;
    });
  }, [balances, searchQuery, categoryFilter]);

  return (
    <div className="space-y-6">
      
      {/* Modern Banner Header */}
      <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-100">
              Cylinder Inventory & Three-Tier Tracking ERP
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
            <span>🏭 Central Warehouse Godowns</span>
            <span>•</span>
            <span>🚚 Delivery Fleet Trucks</span>
            <span>•</span>
            <span>🏢 Customer Site Inventory Ledger</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-extrabold shadow-lg shadow-sky-600/20 transition active:scale-95 text-xs cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" /> Stock Transfer
          </button>
          
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold shadow-lg shadow-emerald-600/20 transition active:scale-95 text-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> + Add Stock Entry
          </button>

          <button
            onClick={fetchBalances}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs border border-slate-700 transition cursor-pointer"
            title="Refresh Stock Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 5 Sleek KPI Scorecard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Godown Stock</span>
            <Building2 className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">150 <span className="text-xs font-bold text-slate-400">Pcs</span></div>
          <div className="text-[10px] font-semibold text-slate-400">Central Storage</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Fleet Stock</span>
            <Truck className="h-3.5 w-3.5 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400">35 <span className="text-xs font-bold text-slate-400">Pcs</span></div>
          <div className="text-[10px] font-semibold text-slate-400">Delivery Vehicles</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Full Stock</span>
            <Flame className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalFull} <span className="text-xs font-bold text-slate-400">Pcs</span></div>
          <div className="text-[10px] font-semibold text-emerald-600">Available at Sites</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Empty Returned</span>
            <Package className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{totalEmpty} <span className="text-xs font-bold text-slate-400">Pcs</span></div>
          <div className="text-[10px] font-semibold text-amber-600">Pending Refill</div>
        </div>

        <div className="col-span-2 md:col-span-1 p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-sm space-y-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Deposit Vouchers</span>
            <Layers className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">₹{(totalDepositAmount / 1000).toFixed(0)}k</div>
          <div className="text-[10px] font-semibold text-purple-300">Active SV / TV Deposits</div>
        </div>
      </div>

      {/* Main Inventory Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4">
        
        {/* Navigation Sub-Tabs & Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Main Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/70 text-xs font-extrabold w-full md:w-auto">
              <button
                onClick={() => setActiveSubTab('customer')}
                className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${
                  activeSubTab === 'customer' 
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm font-black' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                📦 Customer Stock ({balances.length})
              </button>
              
              <button
                onClick={() => setActiveSubTab('plant')}
                className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${
                  activeSubTab === 'plant' 
                    ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-sm font-black' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                🏭 Plant Refills ({totalInTransit} Pcs)
              </button>
              
              <button
                onClick={() => setActiveSubTab('defective')}
                className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${
                  activeSubTab === 'defective' 
                    ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-sm font-black' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                ⚠️ Defective ({totalDefective} Pcs)
              </button>

              <button
                onClick={() => setActiveSubTab('voucher')}
                className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${
                  activeSubTab === 'voucher' 
                    ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm font-black' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                📜 Deposit Vouchers ({vouchers.length})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Customer or Product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

          </div>

          {/* Category Filter Badges */}
          {activeSubTab === 'customer' && (
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Product Type:
              </span>
              <button
                onClick={() => setCategoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  categoryFilter === 'ALL'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                All Products
              </button>
              <button
                onClick={() => setCategoryFilter('Commercial 19KG')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  categoryFilter === 'Commercial 19KG'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                }`}
              >
                19 KG Commercial
              </button>
              <button
                onClick={() => setCategoryFilter('Industrial 47.5KG')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  categoryFilter === 'Industrial 47.5KG'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 hover:bg-sky-100'
                }`}
              >
                47.5 KG Industrial
              </button>
              <button
                onClick={() => setCategoryFilter('Domestic 14.2KG')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  categoryFilter === 'Domestic 14.2KG'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 hover:bg-purple-100'
                }`}
              >
                14.2 KG Domestic
              </button>
              <button
                onClick={() => setCategoryFilter('LOW_STOCK')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  categoryFilter === 'LOW_STOCK'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
                }`}
              >
                ⚠️ Low Stock Alert (&lt;5 Pcs)
              </button>
            </div>
          )}

        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {activeSubTab === 'voucher' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Voucher #</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Customer Details</th>
                  <th className="px-4 py-3">Assigned Staff (RM & Fleet)</th>
                  <th className="px-4 py-3 text-center">Cylinders (SV/TV)</th>
                  <th className="px-4 py-3 text-center">Regulators</th>
                  <th className="px-4 py-3 text-right">Security Deposit</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                {vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      <div>{v.voucherNumber}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{v.voucherReference || 'REF-SV-8921'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${v.voucherType === 'SV' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'}`}>
                        {v.voucherType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-extrabold text-slate-900 dark:text-slate-100">{v.customerName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">ID: {v.customerId || 'cust_demo_1'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5 text-[11px]">
                        <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                          <span>👔 RM:</span>
                          <span>{v.relationshipManagerName || 'Vikram Sharma'}</span>
                        </div>
                        <div className="text-amber-700 dark:text-amber-300 flex items-center gap-1 font-semibold">
                          <span>🚚 Fleet:</span>
                          <span>{v.defaultDeliveryBoyName || 'Ramesh Kumar'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-slate-200">{v.cylinderQty} Pcs</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-slate-200">{v.regulatorQty} Pcs</td>
                    <td className="px-4 py-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">₹{v.depositAmount.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-500">{v.issueDate}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        🟢 {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3">Customer / Location Name</th>
                  <th className="px-4 py-3">Cylinder Product</th>
                  <th className="px-4 py-3 text-center">Opening Stock</th>
                  <th className="px-4 py-3 text-center">Full Stock 🟢</th>
                  <th className="px-4 py-3 text-center">Empty Stock 🟡</th>
                  <th className="px-4 py-3 text-center">Net Balance 🔵</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredBalances.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                      No cylinder stock entries found matching filter query.
                    </td>
                  </tr>
                ) : (
                  filteredBalances.map((b, idx) => {
                    const opening = b.openingQty || 0;
                    const full = b.currentFullBalance || 0;
                    const empty = b.currentEmptyBalance || 0;
                    const currentBalance = opening + full - empty;

                    return (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="px-4 py-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        
                        <td className="px-4 py-3.5">
                          <div className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                            {b.customerName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            <span>{b.location || 'Central Warehouse'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 text-[11px] border border-slate-200 dark:border-slate-700 inline-block">
                            {b.productName}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-500">
                          {opening} Pcs
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-mono font-black">
                            {full} Pcs
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-mono font-black">
                            {empty} Pcs
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <span className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-mono font-black text-xs">
                            {currentBalance} Pcs
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Movement Ledger */}
                            <button
                              onClick={() => handleOpenLedger(b)}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold text-[11px] rounded-lg border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1 cursor-pointer"
                              title="View Movement Ledger"
                            >
                              <FileText className="w-3.5 h-3.5" /> Ledger
                            </button>

                            {/* Edit Stock */}
                            <button
                              onClick={() => handleOpenEditModal(b)}
                              className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                              title="Edit Stock Entry"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Adjust Audit */}
                            <button
                              onClick={() => handleOpenAdjustment(b)}
                              className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 hover:bg-amber-100 transition cursor-pointer"
                              title="Stock Adjustment Request"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Entry */}
                            <button
                              onClick={() => handleDeleteItem(b.id, b.customerName)}
                              className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* CUSTOMER CYLINDER MOVEMENT LEDGER FULL-PAGE LEFT SLIDE-OVER DRAWER */}
      {isLedgerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-start overflow-hidden animate-in fade-in duration-200">
          <div className="w-full max-w-4xl h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-left duration-300">
            {/* Header Bar */}
            <div className="p-5 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Customer Cylinder Movement Statement
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{ledgerData?.customerName || 'Account Statement Ledger'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-400" /> Print Statement
                </button>

                <button 
                  onClick={() => setIsLedgerModalOpen(false)} 
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {ledgerLoading ? (
                <div className="p-12 text-center text-slate-400 italic">Loading Customer Cylinder Movement Ledger...</div>
              ) : ledgerData ? (
                <div className="space-y-6">
                  {/* Summary KPI Bar */}
                  <div className="grid grid-cols-5 gap-3 text-center text-xs bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Opening</div>
                      <div className="font-black text-slate-700 dark:text-slate-200 text-sm mt-1">{ledgerData.kpis.openingBalance} Pcs</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Delivered Full</div>
                      <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm mt-1">+{ledgerData.kpis.deliveredFull} Pcs</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Empty Recd</div>
                      <div className="font-black text-amber-600 dark:text-amber-400 text-sm mt-1">-{ledgerData.kpis.emptyReceived} Pcs</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Adjustments</div>
                      <div className="font-black text-purple-600 dark:text-purple-400 text-sm mt-1">{ledgerData.kpis.adjustments} Pcs</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Current Balance</div>
                      <div className="font-black text-indigo-600 dark:text-indigo-400 text-base mt-1">{ledgerData.kpis.currentBalance} Pcs</div>
                    </div>
                  </div>

                  {/* Chronological Transaction Table */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-sm">
                    <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                      <h4 className="font-black text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider">
                        Chronological Stock Movement Ledger ({ledgerData.transactions.length} Records)
                      </h4>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-900/60 font-extrabold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Reference #</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3 text-center">Full Qty</th>
                            <th className="px-4 py-3 text-center">Empty Qty</th>
                            <th className="px-4 py-3 text-center">Running Balance</th>
                            <th className="px-4 py-3">Performed By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {ledgerData.transactions.map((t: any) => (
                            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                              <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">{t.date}</td>
                              <td className="px-4 py-3.5 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{t.reference}</td>
                              <td className="px-4 py-3.5 font-extrabold uppercase text-[10px]">
                                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                  {t.transactionType}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center font-mono font-black text-emerald-600">+{t.fullQty}</td>
                              <td className="px-4 py-3.5 text-center font-mono font-black text-amber-600">-{t.emptyQty}</td>
                              <td className="px-4 py-3.5 text-center font-mono font-black text-indigo-600 dark:text-indigo-400 text-xs">{t.runningBalance} Pcs</td>
                              <td className="px-4 py-3.5 text-slate-500 font-medium">{t.performedBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* MANUAL ADJUSTMENT FULL-PAGE LEFT SLIDE-OVER DRAWER */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-start overflow-hidden animate-in fade-in duration-200">
          <div className="w-full max-w-xl h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-left duration-300">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Request Manual Stock Adjustment
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Submit audit corrections for Manager approval</p>
                </div>
              </div>

              <button 
                onClick={() => setIsAdjustmentModalOpen(false)} 
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleAdjustmentSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1.5">Customer Account</label>
                  <input type="text" value={adjCustomerName} disabled className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-sm text-slate-800 dark:text-slate-200" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1.5">Adjusted Full Stock</label>
                    <input
                      type="number"
                      value={adjFullQty}
                      onChange={(e) => setAdjFullQty(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-black text-emerald-600 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1.5">Adjusted Empty Stock</label>
                    <input
                      type="number"
                      value={adjEmptyQty}
                      onChange={(e) => setAdjEmptyQty(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-black text-amber-600 text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mandatory Reason / Audit Note *</label>
                  <textarea
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder="e.g. Physical stock count audit correction after seal inspection..."
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-semibold"
                    rows={4}
                    required
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <button type="button" onClick={() => setIsAdjustmentModalOpen(false)} className="px-5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl font-bold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjSubmitting}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl shadow-lg shadow-amber-600/20 cursor-pointer text-sm"
                >
                  {adjSubmitting ? 'Submitting...' : 'Submit to Manager Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK TRANSFER FULL-PAGE LEFT SLIDE-OVER DRAWER */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-start overflow-hidden animate-in fade-in duration-200">
          <div className="w-full max-w-xl h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-left duration-300">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                    Stock Transfer Request
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Transfer cylinders between Godowns & Fleet Trucks</p>
                </div>
              </div>

              <button 
                onClick={() => setIsTransferModalOpen(false)} 
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleTransferSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1.5">Transfer Route Type</label>
                  <select
                    value={transferType}
                    onChange={(e) => setTransferType(e.target.value as any)}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 text-sm"
                  >
                    <option value="WAREHOUSE_TO_DRIVER">Warehouse → Delivery Fleet</option>
                    <option value="DRIVER_TO_DRIVER">Fleet Boy → Fleet Boy</option>
                    <option value="DRIVER_TO_WAREHOUSE">Delivery Fleet → Warehouse</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1.5">From Location</label>
                    <input
                      type="text"
                      value={fromLocation}
                      onChange={(e) => setFromLocation(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1.5">To Location</label>
                    <input
                      type="text"
                      value={toLocation}
                      onChange={(e) => setToLocation(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Cylinders Qty</label>
                    <input
                      type="number"
                      value={transferFullQty}
                      onChange={(e) => setTransferFullQty(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-black text-emerald-600 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1.5">Empty Cylinders Qty</label>
                    <input
                      type="number"
                      value={transferEmptyQty}
                      onChange={(e) => setTransferEmptyQty(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-black text-amber-600 text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1.5">Transfer Notes</label>
                  <textarea
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="Notes for Manager approval..."
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-semibold"
                    rows={3}
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <button type="button" onClick={() => setIsTransferModalOpen(false)} className="px-5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl font-bold cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-xl shadow-lg shadow-sky-600/20 cursor-pointer text-sm"
                >
                  {transferSubmitting ? 'Submitting...' : 'Submit to Manager Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT CYLINDER STOCK ENTRY FULL-PAGE LEFT SLIDE-OVER DRAWER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-start overflow-hidden animate-in fade-in duration-200">
          <div className="w-full max-w-xl h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-left duration-300">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                    {editingItem ? 'Edit Cylinder Stock Entry' : 'Add New Cylinder Stock Entry'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Configure Party & Product Cylinder Stock Balances</p>
                </div>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveStock} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1.5">Customer / Site Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Hotel Rajdhani / Central Warehouse"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1.5">Cylinder Product</label>
                    <select
                      value={formProductName}
                      onChange={(e) => setFormProductName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100"
                    >
                      <option value="19 KG Commercial LPG Cylinder">19 KG Commercial LPG</option>
                      <option value="47.5 KG Industrial LPG Cylinder">47.5 KG Industrial LPG</option>
                      <option value="14.2 KG Domestic LPG Cylinder">14.2 KG Domestic LPG</option>
                      <option value="Medical Oxygen Cylinder">Medical Oxygen Cylinder</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category Type</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100"
                    >
                      <option value="Commercial 19KG">Commercial 19KG</option>
                      <option value="Industrial 47.5KG">Industrial 47.5KG</option>
                      <option value="Domestic 14.2KG">Domestic 14.2KG</option>
                      <option value="Other">Other Category</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1.5">Storage / Godown Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Indore Central Warehouse"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 text-center pt-2">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="block font-bold uppercase text-[10px] text-slate-500 mb-1">Opening Stock</label>
                    <input
                      type="number"
                      value={formOpeningQty}
                      onChange={(e) => setFormOpeningQty(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 font-black text-center text-sm"
                      required
                    />
                  </div>
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                    <label className="block font-bold uppercase text-[10px] text-emerald-600 mb-1">Full Stock 🟢</label>
                    <input
                      type="number"
                      value={formFullQty}
                      onChange={(e) => setFormFullQty(e.target.value)}
                      className="w-full px-2 py-1.5 border border-emerald-300 dark:border-emerald-700 rounded-lg bg-white dark:bg-slate-900 font-black text-emerald-600 text-center text-sm"
                      required
                    />
                  </div>
                  <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/40">
                    <label className="block font-bold uppercase text-[10px] text-amber-600 mb-1">Empty Stock 🟡</label>
                    <input
                      type="number"
                      value={formEmptyQty}
                      onChange={(e) => setFormEmptyQty(e.target.value)}
                      className="w-full px-2 py-1.5 border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-slate-900 font-black text-amber-600 text-center text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black shadow-lg shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer active:scale-95 text-sm"
                >
                  <Check className="w-4 h-4" /> {saving ? 'Saving...' : editingItem ? 'Update Record' : 'Save New Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
