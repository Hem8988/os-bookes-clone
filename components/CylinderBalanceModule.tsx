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
  Printer,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  UserCheck,
  Phone,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import { Customer, Product, EmployeeMaster } from '../lib/types';

interface CylinderInventoryItem {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  productName: string;
  category: 'Commercial 19KG' | 'Industrial 47.5KG' | 'Domestic 14.2KG' | '5KG FTL' | 'Other';
  openingQty: number;
  currentFullBalance: number;
  currentEmptyBalance: number;
  defectiveQty: number;
  inTransitRefillQty: number;
  location: string;
  svNumber?: string;
  depositAmount?: number;
  lastUpdated: string;
}

interface DriverVehicleStock {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  route: string;
  morningLoadedFull: number;
  deliveredFull: number;
  collectedEmpty: number;
  currentFullOnVehicle: number;
  currentEmptyOnVehicle: number;
  cashCollected: number;
  status: 'ON_ROUTE' | 'RECONCILED' | 'IDLE';
  lastUpdated: string;
}

interface StockTransferRecord {
  id: string;
  transferNumber: string;
  date: string;
  transferType: 'GODOWN_TO_DRIVER' | 'DRIVER_TO_GODOWN' | 'DRIVER_TO_DRIVER' | 'PLANT_REFILL_GATEPASS';
  fromLocation: string;
  toLocation: string;
  productName: string;
  fullQty: number;
  emptyQty: number;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  notes?: string;
  status: 'COMPLETED' | 'PENDING_APPROVAL';
}

const DEFAULT_INVENTORY_ITEMS: CylinderInventoryItem[] = [
  {
    id: 'cyl_inv_1',
    customerId: 'cust_1',
    customerName: 'Sharma Electronics & Superstore',
    customerPhone: '+91 98260 12345',
    productName: '19 KG Commercial LPG Cylinder',
    category: 'Commercial 19KG',
    openingQty: 15,
    currentFullBalance: 10,
    currentEmptyBalance: 5,
    defectiveQty: 0,
    inTransitRefillQty: 2,
    location: 'Indore Central Warehouse',
    svNumber: 'SV-2026-0089',
    depositAmount: 25000,
    lastUpdated: '2026-09-22',
  },
  {
    id: 'cyl_inv_2',
    customerId: 'cust_2',
    customerName: 'Rajput Wholesale Traders',
    customerPhone: '+91 98930 67890',
    productName: '19 KG Commercial LPG Cylinder',
    category: 'Commercial 19KG',
    openingQty: 25,
    currentFullBalance: 18,
    currentEmptyBalance: 7,
    defectiveQty: 1,
    inTransitRefillQty: 4,
    location: 'Vijay Nagar Godown',
    svNumber: 'SV-2026-0104',
    depositAmount: 50000,
    lastUpdated: '2026-09-22',
  },
  {
    id: 'cyl_inv_3',
    customerId: 'cust_3',
    customerName: 'Indore Grand Hotel & Banquet',
    customerPhone: '+91 94250 99887',
    productName: '19 KG Commercial LPG Cylinder',
    category: 'Commercial 19KG',
    openingQty: 20,
    currentFullBalance: 14,
    currentEmptyBalance: 6,
    defectiveQty: 0,
    inTransitRefillQty: 0,
    location: 'Indore Central Warehouse',
    svNumber: 'SV-2026-0112',
    depositAmount: 40000,
    lastUpdated: '2026-09-21',
  },
  {
    id: 'cyl_inv_4',
    customerId: 'cust_4',
    customerName: 'Pithampur Heavy Forgings Pvt Ltd',
    customerPhone: '+91 98260 44556',
    productName: '47.5 KG Industrial LPG Cylinder',
    category: 'Industrial 47.5KG',
    openingQty: 12,
    currentFullBalance: 8,
    currentEmptyBalance: 4,
    defectiveQty: 0,
    inTransitRefillQty: 3,
    location: 'Pithampur Industrial Godown',
    svNumber: 'SV-2026-0078',
    depositAmount: 60000,
    lastUpdated: '2026-09-20',
  },
  {
    id: 'cyl_inv_5',
    customerId: 'cust_5',
    customerName: 'National Caterers & Events',
    customerPhone: '+91 98930 11223',
    productName: '19 KG Commercial LPG Cylinder',
    category: 'Commercial 19KG',
    openingQty: 10,
    currentFullBalance: 7,
    currentEmptyBalance: 3,
    defectiveQty: 0,
    inTransitRefillQty: 0,
    location: 'Main Plant Storage',
    svNumber: 'SV-2026-0130',
    depositAmount: 20000,
    lastUpdated: '2026-09-21',
  },
];

const DEFAULT_DRIVER_STOCKS: DriverVehicleStock[] = [
  {
    id: 'dvs_1',
    driverId: 'staff-5',
    driverName: 'Ramesh Kumar',
    driverPhone: '+91 98260 11223',
    vehicleNumber: 'MP-09-GF-4432',
    route: 'Route 1: Vijay Nagar & AB Road Commercial Hub',
    morningLoadedFull: 30,
    deliveredFull: 22,
    collectedEmpty: 20,
    currentFullOnVehicle: 8,
    currentEmptyOnVehicle: 20,
    cashCollected: 42900,
    status: 'ON_ROUTE',
    lastUpdated: '2026-09-23 09:30 AM',
  },
  {
    id: 'dvs_2',
    driverId: 'staff-6',
    driverName: 'Suresh Verma',
    driverPhone: '+91 98930 22334',
    vehicleNumber: 'MP-09-AB-1234',
    route: 'Route 2: Pithampur Industrial Belt (Bulk 47.5KG & 19KG)',
    morningLoadedFull: 20,
    deliveredFull: 16,
    collectedEmpty: 16,
    currentFullOnVehicle: 4,
    currentEmptyOnVehicle: 16,
    cashCollected: 64500,
    status: 'ON_ROUTE',
    lastUpdated: '2026-09-23 10:15 AM',
  },
  {
    id: 'dvs_3',
    driverId: 'staff-7',
    driverName: 'Mukesh Yadav',
    driverPhone: '+91 94250 33445',
    vehicleNumber: 'MP-09-TR-7890',
    route: 'Route 3: Palasia & MG Road Hotel Corridor',
    morningLoadedFull: 25,
    deliveredFull: 25,
    collectedEmpty: 25,
    currentFullOnVehicle: 0,
    currentEmptyOnVehicle: 25,
    cashCollected: 48750,
    status: 'RECONCILED',
    lastUpdated: '2026-09-22 06:45 PM',
  },
];

const DEFAULT_TRANSFER_LOGS: StockTransferRecord[] = [
  {
    id: 'tr_1',
    transferNumber: 'TR-2026-0441',
    date: '2026-09-23',
    transferType: 'GODOWN_TO_DRIVER',
    fromLocation: 'Indore Central Godown',
    toLocation: 'Ramesh Kumar (MP-09-GF-4432)',
    productName: '19 KG Commercial LPG Cylinder',
    fullQty: 30,
    emptyQty: 0,
    vehicleNumber: 'MP-09-GF-4432',
    driverName: 'Ramesh Kumar',
    driverPhone: '+91 98260 11223',
    notes: 'Morning commercial route loading',
    status: 'COMPLETED',
  },
  {
    id: 'tr_2',
    transferNumber: 'TR-2026-0440',
    date: '2026-09-23',
    transferType: 'GODOWN_TO_DRIVER',
    fromLocation: 'Pithampur Godown',
    toLocation: 'Suresh Verma (MP-09-AB-1234)',
    productName: '47.5 KG Industrial LPG Cylinder',
    fullQty: 15,
    emptyQty: 0,
    vehicleNumber: 'MP-09-AB-1234',
    driverName: 'Suresh Verma',
    driverPhone: '+91 98930 22334',
    notes: 'Industrial delivery dispatch',
    status: 'COMPLETED',
  },
  {
    id: 'tr_3',
    transferNumber: 'GP-2026-0092',
    date: '2026-09-22',
    transferType: 'PLANT_REFILL_GATEPASS',
    fromLocation: 'Indore Central Godown',
    toLocation: 'IOCL Manglia LPG Bottling Plant',
    productName: '19 KG Commercial LPG Cylinder',
    fullQty: 0,
    emptyQty: 100,
    vehicleNumber: 'MP-09-TR-9999 (Truck)',
    driverName: 'Kailash Singh',
    notes: 'Empty cylinder truck sent for refilling',
    status: 'COMPLETED',
  },
];

interface CylinderBalanceModuleProps {
  initialSubTab?: string;
  onSubTabChange?: (subTab: string) => void;
  customers?: Customer[];
  products?: Product[];
  staff?: EmployeeMaster[];
}

export const CylinderBalanceModule: React.FC<CylinderBalanceModuleProps> = ({
  initialSubTab = 'godown',
  onSubTabChange,
  customers = [],
  products = [],
  staff = [],
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'godown' | 'driver' | 'customer' | 'transfer' | 'voucher' | 'adjustment'>(
    (initialSubTab as any) || 'godown'
  );

  useEffect(() => {
    if (initialSubTab && ['godown', 'driver', 'customer', 'transfer', 'voucher', 'adjustment'].includes(initialSubTab)) {
      setActiveSubTab(initialSubTab as any);
    }
  }, [initialSubTab]);

  const handleTabSelect = (tabKey: 'godown' | 'driver' | 'customer' | 'transfer' | 'voucher' | 'adjustment') => {
    setActiveSubTab(tabKey);
    onSubTabChange?.(tabKey);
  };

  const [balances, setBalances] = useState<CylinderInventoryItem[]>(DEFAULT_INVENTORY_ITEMS);
  const [driverStocks, setDriverStocks] = useState<DriverVehicleStock[]>(DEFAULT_DRIVER_STOCKS);
  const [transferLogs, setTransferLogs] = useState<StockTransferRecord[]>(DEFAULT_TRANSFER_LOGS);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Commercial 19KG' | 'Industrial 47.5KG' | 'Domestic 14.2KG' | '5KG FTL'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Modals State
  const [isPlantRefillModalOpen, setIsPlantRefillModalOpen] = useState(false);
  const [isDriverLoadModalOpen, setIsDriverLoadModalOpen] = useState(false);
  const [isCustomerStockModalOpen, setIsCustomerStockModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Plant Refill Form
  const [plantCategory, setPlantCategory] = useState('Commercial 19KG');
  const [plantFullInward, setPlantFullInward] = useState('100');
  const [plantEmptyOutward, setPlantEmptyOutward] = useState('100');
  const [plantChallanNo, setPlantChallanNo] = useState('IOCL-REC-2026-992');
  const [plantGodown, setPlantGodown] = useState('Indore Central Godown');

  // Driver Loading Form
  const [selectedDriverId, setSelectedDriverId] = useState('staff-5');
  const [driverLoadQty, setDriverLoadQty] = useState('30');
  const [driverLoadCategory, setDriverLoadCategory] = useState('19 KG Commercial LPG Cylinder');
  const [driverLoadVehicle, setDriverLoadVehicle] = useState('MP-09-GF-4432');

  // Customer Holding Form
  const [custHoldingName, setCustHoldingName] = useState('');
  const [custHoldingCategory, setCustHoldingCategory] = useState<'Commercial 19KG' | 'Industrial 47.5KG' | 'Domestic 14.2KG' | '5KG FTL'>('Commercial 19KG');
  const [custHoldingFull, setCustHoldingFull] = useState('10');
  const [custHoldingEmpty, setCustHoldingEmpty] = useState('5');
  const [custHoldingDeposit, setCustHoldingDeposit] = useState('25000');
  const [custHoldingSvNo, setCustHoldingSvNo] = useState('SV-2026-0155');

  // Godown Stock Calculated Totals
  const godownStock = useMemo(() => {
    return {
      comm19: { full: 140, empty: 45, defective: 2, inTransit: 20, total: 207 },
      ind47: { full: 42, empty: 18, defective: 0, inTransit: 10, total: 70 },
      dom14: { full: 85, empty: 30, defective: 1, inTransit: 0, total: 116 },
      ftl5: { full: 25, empty: 8, defective: 0, inTransit: 0, total: 33 },
    };
  }, []);

  const totalFullInGodown = godownStock.comm19.full + godownStock.ind47.full + godownStock.dom14.full + godownStock.ftl5.full;
  const totalEmptyInGodown = godownStock.comm19.empty + godownStock.ind47.empty + godownStock.dom14.empty + godownStock.ftl5.empty;
  const totalDefectiveInGodown = godownStock.comm19.defective + godownStock.ind47.defective + godownStock.dom14.defective + godownStock.ftl5.defective;
  const totalInTransitToPlant = godownStock.comm19.inTransit + godownStock.ind47.inTransit + godownStock.dom14.inTransit;

  const totalFullOnFleet = driverStocks.reduce((sum, d) => sum + d.currentFullOnVehicle, 0);
  const totalEmptyOnFleet = driverStocks.reduce((sum, d) => sum + d.currentEmptyOnVehicle, 0);

  const totalCustomerFull = balances.reduce((sum, b) => sum + b.currentFullBalance, 0);
  const totalCustomerEmpty = balances.reduce((sum, b) => sum + b.currentEmptyBalance, 0);
  const totalCustomerHolding = totalCustomerFull + totalCustomerEmpty;

  const grandTotalAgencyCylinders =
    totalFullInGodown +
    totalEmptyInGodown +
    totalDefectiveInGodown +
    totalInTransitToPlant +
    totalFullOnFleet +
    totalEmptyOnFleet +
    totalCustomerHolding;

  // Handlers
  const handlePlantRefillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullIn = Number(plantFullInward) || 0;
    const emptyOut = Number(plantEmptyOutward) || 0;

    const newTransfer: StockTransferRecord = {
      id: `tr-${Date.now()}`,
      transferNumber: plantChallanNo || `PLANT-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      transferType: 'PLANT_REFILL_GATEPASS',
      fromLocation: 'IOCL/BPCL Bottling Plant',
      toLocation: plantGodown,
      productName: plantCategory,
      fullQty: fullIn,
      emptyQty: emptyOut,
      notes: `Plant refilling receipt: +${fullIn} Full Received, -${emptyOut} Empty Dispatched`,
      status: 'COMPLETED',
    };

    setTransferLogs([newTransfer, ...transferLogs]);
    showToast(`✅ Plant Refill Inward (+${fullIn} Full / -${emptyOut} Empty) recorded successfully!`);
    setIsPlantRefillModalOpen(false);
  };

  const handleDriverLoadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(driverLoadQty) || 0;
    const driver = staff.find((s) => s.id === selectedDriverId) || { name: 'Driver', phone: '' };

    const newTransfer: StockTransferRecord = {
      id: `tr-${Date.now()}`,
      transferNumber: `TR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      transferType: 'GODOWN_TO_DRIVER',
      fromLocation: 'Indore Central Godown',
      toLocation: `${driver.name} (${driverLoadVehicle})`,
      productName: driverLoadCategory,
      fullQty: qty,
      emptyQty: 0,
      vehicleNumber: driverLoadVehicle,
      driverName: driver.name,
      driverPhone: driver.phone,
      notes: `Vehicle loaded with ${qty} Full cylinders for morning delivery route`,
      status: 'COMPLETED',
    };

    setTransferLogs([newTransfer, ...transferLogs]);
    setDriverStocks(
      driverStocks.map((ds) =>
        ds.driverId === selectedDriverId
          ? {
              ...ds,
              morningLoadedFull: ds.morningLoadedFull + qty,
              currentFullOnVehicle: ds.currentFullOnVehicle + qty,
              status: 'ON_ROUTE',
            }
          : ds
      )
    );

    showToast(`🚚 ${qty} Full Cylinders successfully issued to ${driver.name} (${driverLoadVehicle})!`);
    setIsDriverLoadModalOpen(false);
  };

  const handleCustomerHoldingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const full = Number(custHoldingFull) || 0;
    const empty = Number(custHoldingEmpty) || 0;
    const deposit = Number(custHoldingDeposit) || 0;

    const newItem: CylinderInventoryItem = {
      id: `cyl_inv_${Date.now()}`,
      customerName: custHoldingName,
      productName: custHoldingCategory === 'Industrial 47.5KG' ? '47.5 KG Industrial LPG Cylinder' : '19 KG Commercial LPG Cylinder',
      category: custHoldingCategory,
      openingQty: full + empty,
      currentFullBalance: full,
      currentEmptyBalance: empty,
      defectiveQty: 0,
      inTransitRefillQty: 0,
      location: 'Customer Commercial Site',
      svNumber: custHoldingSvNo,
      depositAmount: deposit,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    setBalances([newItem, ...balances]);
    showToast(`✅ Customer Cylinder Holding for "${custHoldingName}" added successfully!`);
    setIsCustomerStockModalOpen(false);
  };

  // Gas Accessories / Spares Catalog
  const gasAccessories = useMemo(() => {
    return [
      { name: 'Commercial High-Pressure LPG Regulator', sku: 'ACC-REG-HP-01', stock: 24, unit: 'Pcs', mrp: 2100, costPrice: 1450, category: 'Regulator' },
      { name: 'Industrial Wire-Braided Hose Pipe (2 Meter)', sku: 'ACC-PIPE-2M-02', stock: 45, unit: 'Pcs', mrp: 1200, costPrice: 780, category: 'Safety Pipe' },
      { name: 'Commercial Single / Double Burner Stove Adapter', sku: 'ACC-ADAPT-03', stock: 18, unit: 'Pcs', mrp: 850, costPrice: 520, category: 'Burner Parts' },
      { name: 'Heavy-Duty Brass Cylinder Valve (Pin Type)', sku: 'ACC-VALVE-04', stock: 35, unit: 'Pcs', mrp: 650, costPrice: 380, category: 'Valve Parts' },
      { name: 'LPG Cylinder Safety Cap with Rubber Strap', sku: 'ACC-CAP-05', stock: 150, unit: 'Pcs', mrp: 50, costPrice: 20, category: 'Safety Caps' },
    ];
  }, []);

  return (
    <div className="space-y-5 text-slate-800 dark:text-slate-100 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-teal-500/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="h-5 w-5 text-teal-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main ERP Banner Header */}
      <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white border border-teal-800/60 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-inner">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                  LPG Gas & Cylinder 3-Tier Inventory ERP
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-300 border border-teal-500/40 uppercase">
                  Live Stock
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-2 font-medium">
                <span>🏭 Central Godown Stock</span>
                <span>•</span>
                <span>🚚 Delivery Fleet Mobile Stock</span>
                <span>•</span>
                <span>👥 Customer Cylinder Holdings</span>
                <span>•</span>
                <span>🔄 Plant Refill Inward</span>
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsPlantRefillModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs shadow-md shadow-sky-600/20 active:scale-95 transition cursor-pointer"
            title="Record receipt of filled cylinders from IOCL/BPCL plant"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Plant Refill Inward</span>
          </button>

          <button
            onClick={() => setIsDriverLoadModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-600/20 active:scale-95 transition cursor-pointer"
            title="Issue filled cylinders to delivery driver for vehicle loading"
          >
            <Truck className="w-4 h-4" />
            <span>+ Load Vehicle Stock</span>
          </button>

          <button
            onClick={() => setIsCustomerStockModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
            title="Add customer cylinder holding balance"
          >
            <Plus className="w-4 h-4" />
            <span>+ Customer Holding</span>
          </button>
        </div>
      </div>

      {/* 5 Realtime KPI Summary Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* 1. Full Cylinders in Godown */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Godown Full (Gas)</span>
            <Flame className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {totalFullInGodown} <span className="text-xs font-bold text-slate-400">Pcs</span>
          </div>
          <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
            🟢 Ready for Sale / Delivery
          </div>
        </div>

        {/* 2. Empty Cylinders in Godown */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Godown Empty (Khali)</span>
            <Package className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {totalEmptyInGodown} <span className="text-xs font-bold text-slate-400">Pcs</span>
          </div>
          <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
            ⚪ Awaiting Bottling Refill
          </div>
        </div>

        {/* 3. Driver Vehicle Stock */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>On Delivery Vehicles</span>
            <Truck className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400">
            {totalFullOnFleet}F / {totalEmptyOnFleet}E
          </div>
          <div className="text-[10px] font-bold text-sky-700 dark:text-sky-300">
            🚚 Live on Route Trucks
          </div>
        </div>

        {/* 4. Customer Holdings */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Customer Holdings</span>
            <Building2 className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
            {totalCustomerHolding} <span className="text-xs font-bold text-slate-400">Pcs</span>
          </div>
          <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
            🏢 Commercial Site Deposits
          </div>
        </div>

        {/* 5. Total Agency Cylinders */}
        <div className="col-span-2 md:col-span-1 p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700 shadow-xs space-y-1">
          <div className="text-[10px] font-black uppercase tracking-wider text-teal-300 flex items-center justify-between">
            <span>Total Agency Asset</span>
            <ShieldCheck className="h-4 w-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">
            {grandTotalAgencyCylinders} <span className="text-xs font-bold text-slate-300">Pcs</span>
          </div>
          <div className="text-[10px] font-semibold text-teal-200">
            Entire Cylinder Pool
          </div>
        </div>
      </div>

      {/* Main 6 Sub-Tab Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
          <button
            onClick={() => handleTabSelect('godown')}
            className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'godown'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>🏢 Godown & Plant Gas Stock</span>
          </button>

          <button
            onClick={() => handleTabSelect('driver')}
            className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'driver'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>🚚 Delivery Boy & Vehicle Live Stock</span>
          </button>

          <button
            onClick={() => handleTabSelect('customer')}
            className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'customer'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>👥 Customer Cylinder Holdings ({balances.length})</span>
          </button>

          <button
            onClick={() => handleTabSelect('transfer')}
            className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'transfer'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>🔄 Stock Transfer & Plant Gate Pass</span>
          </button>

          <button
            onClick={() => handleTabSelect('voucher')}
            className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'voucher'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>📜 SV Subscription Vouchers</span>
          </button>

          <button
            onClick={() => handleTabSelect('adjustment')}
            className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'adjustment'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>⚡ Physical Stock Audit</span>
          </button>
        </div>
      </div>

      {/* TAB 1: GODOWN & PLANT GAS INVENTORY */}
      {activeSubTab === 'godown' && (
        <div className="space-y-5">
          {/* Cylinder Type Inventory Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Commercial 19 KG Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  🔥 19 KG Commercial
                </span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                  Total: {godownStock.comm19.total}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                  <span className="text-[10px] text-emerald-700 font-bold block">Full Gas Cylinders</span>
                  <span className="text-xl font-black font-mono text-emerald-600">{godownStock.comm19.full}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40">
                  <span className="text-[10px] text-amber-700 font-bold block">Empty (Khali)</span>
                  <span className="text-xl font-black font-mono text-amber-600">{godownStock.comm19.empty}</span>
                </div>
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40">
                  <span className="text-[10px] text-rose-700 font-bold block">Defective / Leak</span>
                  <span className="text-base font-black font-mono text-rose-600">{godownStock.comm19.defective}</span>
                </div>
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40">
                  <span className="text-[10px] text-sky-700 font-bold block">At Plant (Refill)</span>
                  <span className="text-base font-black font-mono text-sky-600">{godownStock.comm19.inTransit}</span>
                </div>
              </div>
            </div>

            {/* Industrial 47.5 KG Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  🏭 47.5 KG Industrial Jumbo
                </span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                  Total: {godownStock.ind47.total}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                  <span className="text-[10px] text-emerald-700 font-bold block">Full Gas Cylinders</span>
                  <span className="text-xl font-black font-mono text-emerald-600">{godownStock.ind47.full}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40">
                  <span className="text-[10px] text-amber-700 font-bold block">Empty (Khali)</span>
                  <span className="text-xl font-black font-mono text-amber-600">{godownStock.ind47.empty}</span>
                </div>
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40">
                  <span className="text-[10px] text-rose-700 font-bold block">Defective / Leak</span>
                  <span className="text-base font-black font-mono text-rose-600">{godownStock.ind47.defective}</span>
                </div>
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40">
                  <span className="text-[10px] text-sky-700 font-bold block">At Plant (Refill)</span>
                  <span className="text-base font-black font-mono text-sky-600">{godownStock.ind47.inTransit}</span>
                </div>
              </div>
            </div>

            {/* Domestic 14.2 KG Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  🏠 14.2 KG Domestic
                </span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                  Total: {godownStock.dom14.total}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                  <span className="text-[10px] text-emerald-700 font-bold block">Full Gas Cylinders</span>
                  <span className="text-xl font-black font-mono text-emerald-600">{godownStock.dom14.full}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40">
                  <span className="text-[10px] text-amber-700 font-bold block">Empty (Khali)</span>
                  <span className="text-xl font-black font-mono text-amber-600">{godownStock.dom14.empty}</span>
                </div>
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40">
                  <span className="text-[10px] text-rose-700 font-bold block">Defective / Leak</span>
                  <span className="text-base font-black font-mono text-rose-600">{godownStock.dom14.defective}</span>
                </div>
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40">
                  <span className="text-[10px] text-sky-700 font-bold block">At Plant (Refill)</span>
                  <span className="text-base font-black font-mono text-sky-600">{godownStock.dom14.inTransit}</span>
                </div>
              </div>
            </div>

            {/* 5 KG FTL Mini Cylinder Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  ⚡ 5 KG FTL Mini
                </span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                  Total: {godownStock.ftl5.total}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                  <span className="text-[10px] text-emerald-700 font-bold block">Full Gas Cylinders</span>
                  <span className="text-xl font-black font-mono text-emerald-600">{godownStock.ftl5.full}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40">
                  <span className="text-[10px] text-amber-700 font-bold block">Empty (Khali)</span>
                  <span className="text-xl font-black font-mono text-amber-600">{godownStock.ftl5.empty}</span>
                </div>
                <div className="col-span-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Retail Counter Instant Refill Stock
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Gas Accessories & Hardware Spares Section */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  Gas Accessories, Regulators & Spares Inventory
                </h3>
                <p className="text-xs text-slate-500">
                  Live physical hardware stock available in Central Godown & Workshop
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {gasAccessories.length} Hardware SKUs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[700px]">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">SKU Code</th>
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Available Stock</th>
                    <th className="px-4 py-3 text-right">Cost Price (₹)</th>
                    <th className="px-4 py-3 text-right">MRP (₹)</th>
                    <th className="px-4 py-3 text-right">Stock Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {gasAccessories.map((acc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono text-slate-500">{acc.sku}</td>
                      <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-100">{acc.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {acc.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-black text-right text-emerald-600">
                        {acc.stock} {acc.unit}
                      </td>
                      <td className="px-4 py-3 font-mono text-right">₹{acc.costPrice}</td>
                      <td className="px-4 py-3 font-mono text-right">₹{acc.mrp}</td>
                      <td className="px-4 py-3 font-mono font-black text-right text-slate-900 dark:text-slate-100">
                        ₹{(acc.stock * acc.costPrice).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DRIVER & VEHICLE LIVE MOBILE STOCK */}
      {activeSubTab === 'driver' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-600" />
                Delivery Boy & Vehicle Mobile Stock
              </h3>
              <p className="text-xs text-slate-500">
                Track full & empty cylinders loaded on each delivery truck in real-time
              </p>
            </div>
            <button
              onClick={() => setIsDriverLoadModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-600/20 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Issue Cylinders to Vehicle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {driverStocks.map((driver) => (
              <div
                key={driver.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Truck className="h-4 w-4 text-amber-500" />
                        {driver.driverName}
                      </h4>
                      <span className="inline-block mt-0.5 font-mono text-xs font-extrabold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-lg">
                        {driver.vehicleNumber}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        driver.status === 'ON_ROUTE'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {driver.status === 'ON_ROUTE' ? '🚚 On Route' : '✅ Reconciled'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-2">
                    📍 {driver.route}
                  </p>

                  {/* Stock Counters */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-center">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block">Full on Vehicle</span>
                      <span className="text-2xl font-black font-mono text-emerald-600">{driver.currentFullOnVehicle}</span>
                      <span className="text-[10px] text-slate-500 block">Loaded: {driver.morningLoadedFull}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-center">
                      <span className="text-[10px] font-bold text-amber-700 uppercase block">Empties on Vehicle</span>
                      <span className="text-2xl font-black font-mono text-amber-600">{driver.currentEmptyOnVehicle}</span>
                      <span className="text-[10px] text-slate-500 block">Delivered: {driver.deliveredFull}</span>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500">Day Cash / UPI Collected:</span>
                    <span className="font-mono text-emerald-600 text-sm">₹{driver.cashCollected.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">Updated: {driver.lastUpdated}</span>
                  <button
                    onClick={() => {
                      alert(`✅ Vehicle reconciliation initiated for ${driver.driverName} (${driver.vehicleNumber}). Return ${driver.currentFullOnVehicle} Full & ${driver.currentEmptyOnVehicle} Empty to Godown.`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs shadow-xs hover:opacity-90 transition"
                  >
                    Evening Reconcile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMER CYLINDER HOLDING LEDGER */}
      {activeSubTab === 'customer' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Commercial Customer Cylinder Holdings & Deposits
              </h3>
              <p className="text-xs text-slate-500">
                Track how many agency cylinders each customer holds on site
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <button
                onClick={() => setIsCustomerStockModalOpen(true)}
                className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Holding</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[850px]">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Total Held</th>
                  <th className="px-4 py-3 text-center">Full Cylinders</th>
                  <th className="px-4 py-3 text-center">Empty Cylinders</th>
                  <th className="px-4 py-3">SV Voucher No.</th>
                  <th className="px-4 py-3 text-right">Security Deposit</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {balances
                  .filter((b) => !searchQuery || b.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100">{item.customerName}</div>
                        {item.customerPhone && <div className="text-[11px] text-slate-500">📞 {item.customerPhone}</div>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{item.category}</td>
                      <td className="px-4 py-3 font-black text-center text-sm font-mono text-indigo-600">
                        {item.currentFullBalance + item.currentEmptyBalance} Pcs
                      </td>
                      <td className="px-4 py-3 font-bold text-center font-mono text-emerald-600">
                        {item.currentFullBalance}
                      </td>
                      <td className="px-4 py-3 font-bold text-center font-mono text-amber-600">
                        {item.currentEmptyBalance}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-600 dark:text-slate-300">
                        {item.svNumber || 'SV-ACTIVE'}
                      </td>
                      <td className="px-4 py-3 font-mono font-black text-right text-slate-900 dark:text-slate-100">
                        ₹{(item.depositAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => alert(`Showing 360 Cylinder Ledger for ${item.customerName}`)}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: STOCK TRANSFER & PLANT GATE PASS */}
      {activeSubTab === 'transfer' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-teal-600" />
                Stock Transfers, Vehicle Loadings & Plant Gate Passes
              </h3>
              <p className="text-xs text-slate-500">
                Log of cylinder movements between Godowns, Drivers, and Bottling Refill Plant
              </p>
            </div>
            <button
              onClick={() => setIsDriverLoadModalOpen(true)}
              className="flex items-center gap-1 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Transfer</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[850px]">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Pass No.</th>
                  <th className="px-4 py-3">Transfer Type</th>
                  <th className="px-4 py-3">From Location</th>
                  <th className="px-4 py-3">To Location</th>
                  <th className="px-4 py-3 text-center">Full Qty</th>
                  <th className="px-4 py-3 text-center">Empty Qty</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transferLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-slate-500 font-medium">{log.date}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">{log.transferNumber}</td>
                    <td className="px-4 py-3 font-semibold">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        {log.transferType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{log.fromLocation}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{log.toLocation}</td>
                    <td className="px-4 py-3 font-mono font-black text-center text-emerald-600">
                      {log.fullQty > 0 ? `+${log.fullQty}` : '-'}
                    </td>
                    <td className="px-4 py-3 font-mono font-black text-center text-amber-600">
                      {log.emptyQty > 0 ? `${log.emptyQty}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SV / TV SUBSCRIPTION VOUCHERS */}
      {activeSubTab === 'voucher' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Subscription Vouchers (SV) & Caution Money Deposits
              </h3>
              <p className="text-xs text-slate-500">
                Official cylinder allotment vouchers & refundable security deposit records
              </p>
            </div>
            <button
              onClick={() => setIsCustomerStockModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Issue New SV Voucher</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {balances.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-slate-900 border border-purple-200 dark:border-purple-900 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-xs text-purple-700 dark:text-purple-300">
                    {item.svNumber || 'SV-2026-0089'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 uppercase">
                    ACTIVE SV
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">{item.customerName}</h4>
                  <p className="text-xs text-slate-500">{item.productName}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-100 dark:border-purple-900 text-xs font-bold">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Allotted Cylinders</span>
                    <span className="font-mono text-base text-slate-900 dark:text-slate-100">
                      {item.currentFullBalance + item.currentEmptyBalance} Pcs
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Security Deposit</span>
                    <span className="font-mono text-base text-purple-600">
                      ₹{(item.depositAmount || 25000).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: PHYSICAL STOCK AUDIT & RECONCILIATION */}
      {activeSubTab === 'adjustment' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-teal-600" />
                Physical Godown Count vs System Book Stock Audit
              </h3>
              <p className="text-xs text-slate-500">
                Perform daily/weekly physical cylinder audit and reconcile discrepancies with 1 click
              </p>
            </div>
            <button
              onClick={() => showToast('✅ Physical Godown Stock Audit reconciled and logged in Audit Trail!')}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Reconcile System Stock</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[800px]">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Cylinder Category</th>
                  <th className="px-4 py-3 text-center">System Book Full</th>
                  <th className="px-4 py-3 text-center">Physical Godown Full</th>
                  <th className="px-4 py-3 text-center">Full Diff</th>
                  <th className="px-4 py-3 text-center">System Book Empty</th>
                  <th className="px-4 py-3 text-center">Physical Godown Empty</th>
                  <th className="px-4 py-3 text-center">Empty Diff</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-100">19 KG Commercial LPG</td>
                  <td className="px-4 py-3 font-mono text-center font-bold">{godownStock.comm19.full}</td>
                  <td className="px-4 py-3 font-mono text-center font-bold text-emerald-600">{godownStock.comm19.full}</td>
                  <td className="px-4 py-3 font-mono text-center font-black text-emerald-600">0 (Matched)</td>
                  <td className="px-4 py-3 font-mono text-center font-bold">{godownStock.comm19.empty}</td>
                  <td className="px-4 py-3 font-mono text-center font-bold text-amber-600">{godownStock.comm19.empty}</td>
                  <td className="px-4 py-3 font-mono text-center font-black text-emerald-600">0 (Matched)</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                      MATCHED
                    </span>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-slate-100">47.5 KG Industrial LPG</td>
                  <td className="px-4 py-3 font-mono text-center font-bold">{godownStock.ind47.full}</td>
                  <td className="px-4 py-3 font-mono text-center font-bold text-emerald-600">{godownStock.ind47.full}</td>
                  <td className="px-4 py-3 font-mono text-center font-black text-emerald-600">0 (Matched)</td>
                  <td className="px-4 py-3 font-mono text-center font-bold">{godownStock.ind47.empty}</td>
                  <td className="px-4 py-3 font-mono text-center font-bold text-amber-600">{godownStock.ind47.empty}</td>
                  <td className="px-4 py-3 font-mono text-center font-black text-emerald-600">0 (Matched)</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                      MATCHED
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: PLANT REFILL INWARD */}
      {isPlantRefillModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-gradient-to-r from-teal-600 to-sky-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Plant Bottling Refill Inward</h3>
                  <p className="text-[11px] text-teal-100">Receive filled cylinders from IOCL / BPCL plant</p>
                </div>
              </div>
              <button onClick={() => setIsPlantRefillModalOpen(false)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePlantRefillSubmit} className="p-5 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Plant Delivery Challan / Invoice No *</label>
                  <input
                    type="text"
                    required
                    value={plantChallanNo}
                    onChange={(e) => setPlantChallanNo(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Cylinder Category</label>
                  <select
                    value={plantCategory}
                    onChange={(e) => setPlantCategory(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  >
                    <option value="19 KG Commercial LPG Cylinder">19 KG Commercial LPG</option>
                    <option value="47.5 KG Industrial LPG Cylinder">47.5 KG Industrial LPG</option>
                    <option value="14.2 KG Domestic LPG Cylinder">14.2 KG Domestic LPG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Target Godown</label>
                  <select
                    value={plantGodown}
                    onChange={(e) => setPlantGodown(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  >
                    <option value="Indore Central Godown">Indore Central Godown</option>
                    <option value="Pithampur Industrial Godown">Pithampur Industrial Godown</option>
                    <option value="Vijay Nagar Godown">Vijay Nagar Godown</option>
                  </select>
                </div>

                <div>
                  <label className="block text-emerald-600 font-bold mb-1">Full Cylinders Received (+)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={plantFullInward}
                    onChange={(e) => setPlantFullInward(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 font-mono font-black text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-amber-600 font-bold mb-1">Empty Cylinders Dispatched (-)</label>
                  <input
                    type="number"
                    min={0}
                    value={plantEmptyOutward}
                    onChange={(e) => setPlantEmptyOutward(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 font-mono font-black text-amber-700"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlantRefillModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black shadow-md shadow-teal-600/20"
                >
                  Confirm Inward & Post Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ISSUE TO DELIVERY DRIVER */}
      {isDriverLoadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Issue Cylinders to Delivery Vehicle</h3>
                  <p className="text-[11px] text-amber-100">Load stock onto driver vehicle for morning delivery route</p>
                </div>
              </div>
              <button onClick={() => setIsDriverLoadModalOpen(false)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDriverLoadSubmit} className="p-5 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Select Delivery Driver *</label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => {
                      const dId = e.target.value;
                      setSelectedDriverId(dId);
                      const emp = staff.find((s) => s.id === dId);
                      if (emp && emp.designation && emp.designation.includes('(') && emp.designation.includes(')')) {
                        const vMatch = emp.designation.match(/\((.*?)\)/);
                        if (vMatch) setDriverLoadVehicle(vMatch[1]);
                      }
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  >
                    {staff
                      .filter((s) => s.active !== false)
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.role === 'Delivery Boy' || emp.role === 'Driver' ? '🚚 ' : '👤 '}
                          {emp.name} ({emp.role}) {emp.phone ? `- ${emp.phone}` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Vehicle No.</label>
                  <input
                    type="text"
                    value={driverLoadVehicle}
                    onChange={(e) => setDriverLoadVehicle(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Cylinder Type</label>
                  <select
                    value={driverLoadCategory}
                    onChange={(e) => setDriverLoadCategory(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  >
                    <option value="19 KG Commercial LPG Cylinder">19 KG Commercial LPG</option>
                    <option value="47.5 KG Industrial LPG Cylinder">47.5 KG Industrial LPG</option>
                    <option value="14.2 KG Domestic LPG Cylinder">14.2 KG Domestic LPG</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-emerald-600 font-bold mb-1">Full Cylinders to Load on Vehicle (Pcs) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={driverLoadQty}
                    onChange={(e) => setDriverLoadQty(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 font-mono font-black text-emerald-700 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDriverLoadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black shadow-md shadow-amber-600/20"
                >
                  Issue & Dispatch Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CUSTOMER HOLDING */}
      {isCustomerStockModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Add Customer Cylinder Holding</h3>
                  <p className="text-[11px] text-indigo-100">Record agency cylinders held at commercial customer site</p>
                </div>
              </div>
              <button onClick={() => setIsCustomerStockModalOpen(false)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCustomerHoldingSubmit} className="p-5 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Customer / Hotel / Factory Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hotel Sayaji / Fortune Landmark"
                    value={custHoldingName}
                    onChange={(e) => setCustHoldingName(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Category</label>
                  <select
                    value={custHoldingCategory}
                    onChange={(e) => setCustHoldingCategory(e.target.value as any)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold"
                  >
                    <option value="Commercial 19KG">19 KG Commercial LPG</option>
                    <option value="Industrial 47.5KG">47.5 KG Industrial LPG</option>
                    <option value="Domestic 14.2KG">14.2 KG Domestic LPG</option>
                    <option value="5KG FTL">5 KG FTL Mini</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">SV Voucher No.</label>
                  <input
                    type="text"
                    value={custHoldingSvNo}
                    onChange={(e) => setCustHoldingSvNo(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-emerald-600 font-bold mb-1">Full Cylinders on Site</label>
                  <input
                    type="number"
                    min={0}
                    value={custHoldingFull}
                    onChange={(e) => setCustHoldingFull(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 font-mono font-black"
                  />
                </div>

                <div>
                  <label className="block text-amber-600 font-bold mb-1">Empty Cylinders on Site</label>
                  <input
                    type="number"
                    min={0}
                    value={custHoldingEmpty}
                    onChange={(e) => setCustHoldingEmpty(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 font-mono font-black"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-purple-600 font-bold mb-1">Security Deposit Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={custHoldingDeposit}
                    onChange={(e) => setCustHoldingDeposit(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-700 font-mono font-black"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerStockModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-md shadow-indigo-600/20"
                >
                  Save Customer Holding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default CylinderBalanceModule;
