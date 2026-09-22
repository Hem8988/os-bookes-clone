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
  DollarSign,
  Users
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
  status: 'ON_ROUTE' | 'RECONCILED';
  lastUpdated: string;
}

interface StockTransferRecord {
  id: string;
  transferNumber: string;
  date: string;
  transferType: 'GODOWN_TO_DRIVER' | 'DRIVER_TO_GODOWN' | 'PLANT_REFILL_GATEPASS' | 'GODOWN_TO_GODOWN';
  fromLocation: string;
  toLocation: string;
  productName: string;
  fullQty: number;
  emptyQty: number;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  notes?: string;
  status: 'COMPLETED' | 'IN_TRANSIT' | 'CANCELLED';
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
    customerName: 'Malwa Sweets & Farsan Factory',
    customerPhone: '+91 98270 44556',
    productName: '47.5 KG Industrial LPG Cylinder',
    category: 'Industrial 47.5KG',
    openingQty: 12,
    currentFullBalance: 8,
    currentEmptyBalance: 4,
    defectiveQty: 0,
    inTransitRefillQty: 0,
    location: 'Pithampur Industrial Godown',
    svNumber: 'SV-2026-0120',
    depositAmount: 60000,
    lastUpdated: '2026-09-21',
  },
  {
    id: 'cyl_inv_5',
    customerId: 'cust_5',
    customerName: 'City Pride Catering Services',
    customerPhone: '+91 98931 11223',
    productName: '19 KG Commercial LPG Cylinder',
    category: 'Commercial 19KG',
    openingQty: 10,
    currentFullBalance: 6,
    currentEmptyBalance: 4,
    defectiveQty: 0,
    inTransitRefillQty: 0,
    location: 'Indore Central Warehouse',
    svNumber: 'SV-2026-0131',
    depositAmount: 20000,
    lastUpdated: '2026-09-20',
  },
];

const DEFAULT_DRIVER_STOCKS: DriverVehicleStock[] = [
  {
    id: 'dvs_1',
    driverId: 'staff-5',
    driverName: 'Ramesh Kumar (Delivery Captain)',
    driverPhone: '+91 98260 11223',
    vehicleNumber: 'MP-09-GF-4432',
    route: 'Route 1: Vijay Nagar & Scheme 54 Commercial Area',
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
    driverName: 'Suresh Verma (Commercial Pilot)',
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
    driverName: 'Mukesh Yadav (South City Driver)',
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
    fromLocation: 'Indore Central Godown',
    toLocation: 'Suresh Verma (MP-09-AB-1234)',
    productName: '47.5 KG Industrial LPG Cylinder',
    fullQty: 20,
    emptyQty: 0,
    vehicleNumber: 'MP-09-AB-1234',
    driverName: 'Suresh Verma',
    driverPhone: '+91 98930 22334',
    notes: 'Pithampur industrial route morning loading',
    status: 'COMPLETED',
  },
  {
    id: 'tr_3',
    transferNumber: 'TR-2026-0439',
    date: '2026-09-22',
    transferType: 'DRIVER_TO_GODOWN',
    fromLocation: 'Mukesh Yadav (MP-09-TR-7890)',
    toLocation: 'Indore Central Godown',
    productName: '19 KG Commercial LPG Cylinder',
    fullQty: 0,
    emptyQty: 25,
    vehicleNumber: 'MP-09-TR-7890',
    driverName: 'Mukesh Yadav',
    notes: 'Evening empty return from Palasia hotel route',
    status: 'COMPLETED',
  },
  {
    id: 'tr_4',
    transferNumber: 'PLANT-IOCL-9921',
    date: '2026-09-22',
    transferType: 'PLANT_REFILL_GATEPASS',
    fromLocation: 'Indore Central Godown',
    toLocation: 'IOCL Manglia Bottling Plant',
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
  const activeSubTab = (initialSubTab as 'godown' | 'driver' | 'customer' | 'transfer' | 'voucher' | 'adjustment') || 'godown';

  const [balances, setBalances] = useState<CylinderInventoryItem[]>(DEFAULT_INVENTORY_ITEMS);
  const [driverStocks, setDriverStocks] = useState<DriverVehicleStock[]>(DEFAULT_DRIVER_STOCKS);
  const [transferLogs, setTransferLogs] = useState<StockTransferRecord[]>(DEFAULT_TRANSFER_LOGS);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [transferTypeFilter, setTransferTypeFilter] = useState<'ALL' | 'GODOWN_TO_DRIVER' | 'DRIVER_TO_GODOWN' | 'PLANT_REFILL_GATEPASS'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Modals State
  const [isPlantRefillModalOpen, setIsPlantRefillModalOpen] = useState(false);
  const [isDriverLoadModalOpen, setIsDriverLoadModalOpen] = useState(false);
  const [isCustomerStockModalOpen, setIsCustomerStockModalOpen] = useState(false);

  // Plant Refill Form
  const [plantCategory, setPlantCategory] = useState('19 KG Commercial LPG Cylinder');
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
  const totalCashOnFleet = driverStocks.reduce((sum, d) => sum + d.cashCollected, 0);

  const totalCustomerFull = balances.reduce((sum, b) => sum + b.currentFullBalance, 0);
  const totalCustomerEmpty = balances.reduce((sum, b) => sum + b.currentEmptyBalance, 0);
  const totalCustomerHolding = totalCustomerFull + totalCustomerEmpty;
  const totalCustomerDeposit = balances.reduce((sum, b) => sum + (b.depositAmount || 0), 0);

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
      driverStocks.map((d) =>
        d.driverId === selectedDriverId
          ? {
              ...d,
              morningLoadedFull: d.morningLoadedFull + qty,
              currentFullOnVehicle: d.currentFullOnVehicle + qty,
              status: 'ON_ROUTE',
              lastUpdated: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            }
          : d
      )
    );

    showToast(`✅ ${qty} Full cylinders issued to ${driver.name} (${driverLoadVehicle})`);
    setIsDriverLoadModalOpen(false);
  };

  const handleAddCustomerHoldingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custHoldingName.trim()) {
      alert('Please enter customer name');
      return;
    }

    const newItem: CylinderInventoryItem = {
      id: `cyl_inv_${Date.now()}`,
      customerName: custHoldingName.trim(),
      productName: `${custHoldingCategory} Cylinder`,
      category: custHoldingCategory,
      openingQty: Number(custHoldingFull) + Number(custHoldingEmpty),
      currentFullBalance: Number(custHoldingFull) || 0,
      currentEmptyBalance: Number(custHoldingEmpty) || 0,
      defectiveQty: 0,
      inTransitRefillQty: 0,
      location: 'Customer Commercial Site',
      svNumber: custHoldingSvNo || `SV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      depositAmount: Number(custHoldingDeposit) || 0,
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
    <div className="space-y-6 text-slate-800 font-sans pb-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 1: GODOWN & WAREHOUSE GAS STOCK */}
      {/* ========================================================================= */}
      {activeSubTab === 'godown' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-slate-900">🏢 Central Godown & Warehouse LPG Stock</h1>
                  <p className="text-xs text-slate-500 font-medium">Real-time Godown Full vs Empty vs Defective Cylinders & Hardware Spares</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsPlantRefillModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>+ Record Plant Refill Inward / Dispatch</span>
            </button>
          </div>

          {/* Godown KPI Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Godown Full (Gas)</span>
                <Flame className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600">
                {totalFullInGodown} <span className="text-xs font-bold text-slate-400">Pcs</span>
              </div>
              <div className="text-[10px] font-bold text-emerald-700">🟢 Ready for Sale / Delivery</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Godown Empty (Khali)</span>
                <Package className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black font-mono text-amber-600">
                {totalEmptyInGodown} <span className="text-xs font-bold text-slate-400">Pcs</span>
              </div>
              <div className="text-[10px] font-bold text-amber-700">⚪ To Dispatch to Plant</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Defective / Leak Cylinders</span>
                <ShieldAlert className="h-4 w-4 text-rose-500" />
              </div>
              <div className="text-2xl font-black font-mono text-rose-600">
                {totalDefectiveInGodown} <span className="text-xs font-bold text-slate-400">Pcs</span>
              </div>
              <div className="text-[10px] font-bold text-rose-700">🔴 Quarantined Valve/O-Ring</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>At Bottling Plant (Refill)</span>
                <Truck className="h-4 w-4 text-sky-500" />
              </div>
              <div className="text-2xl font-black font-mono text-sky-600">
                {totalInTransitToPlant} <span className="text-xs font-bold text-slate-400">Pcs</span>
              </div>
              <div className="text-[10px] font-bold text-sky-700">🔵 Awaiting Refilled Inward</div>
            </div>
          </div>

          {/* Cylinder Type Inventory Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Commercial 19 KG Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                  🔥 19 KG Commercial
                </span>
                <span className="font-mono font-black text-sm text-slate-900">
                  Total: {godownStock.comm19.total}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50">
                  <span className="text-[10px] text-emerald-700 font-bold block">Full Gas Cylinders</span>
                  <span className="text-xl font-black font-mono text-emerald-600">{godownStock.comm19.full}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50">
                  <span className="text-[10px] text-amber-700 font-bold block">Empty (Khali)</span>
                  <span className="text-xl font-black font-mono text-amber-600">{godownStock.comm19.empty}</span>
                </div>
                <div className="p-2 rounded-xl bg-rose-50">
                  <span className="text-[10px] text-rose-700 font-bold block">Defective / Leak</span>
                  <span className="text-base font-black font-mono text-rose-600">{godownStock.comm19.defective}</span>
                </div>
                <div className="p-2 rounded-xl bg-sky-50">
                  <span className="text-[10px] text-sky-700 font-bold block">At Plant (Refill)</span>
                  <span className="text-base font-black font-mono text-sky-600">{godownStock.comm19.inTransit}</span>
                </div>
              </div>
            </div>

            {/* Industrial 47.5 KG Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-800">
                  🏭 47.5 KG Industrial Jumbo
                </span>
                <span className="font-mono font-black text-sm text-slate-900">
                  Total: {godownStock.ind47.total}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50">
                  <span className="text-[10px] text-emerald-700 font-bold block">Full Gas Cylinders</span>
                  <span className="text-xl font-black font-mono text-emerald-600">{godownStock.ind47.full}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50">
                  <span className="text-[10px] text-amber-700 font-bold block">Empty (Khali)</span>
                  <span className="text-xl font-black font-mono text-amber-600">{godownStock.ind47.empty}</span>
                </div>
                <div className="p-2 rounded-xl bg-rose-50">
                  <span className="text-[10px] text-rose-700 font-bold block">Defective / Leak</span>
                  <span className="text-base font-black font-mono text-rose-600">{godownStock.ind47.defective}</span>
                </div>
                <div className="p-2 rounded-xl bg-sky-50">
                  <span className="text-[10px] text-sky-700 font-bold block">At Plant (Refill)</span>
                  <span className="text-base font-black font-mono text-sky-600">{godownStock.ind47.inTransit}</span>
                </div>
              </div>
            </div>

            {/* Domestic 14.2 KG Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800">
                  🏠 14.2 KG Domestic
                </span>
                <span className="font-mono font-black text-sm text-slate-900">
                  Total: {godownStock.dom14.total}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50">
                  <span className="text-[10px] text-emerald-700 font-bold block">Full Gas Cylinders</span>
                  <span className="text-xl font-black font-mono text-emerald-600">{godownStock.dom14.full}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50">
                  <span className="text-[10px] text-amber-700 font-bold block">Empty (Khali)</span>
                  <span className="text-xl font-black font-mono text-amber-600">{godownStock.dom14.empty}</span>
                </div>
                <div className="p-2 rounded-xl bg-rose-50">
                  <span className="text-[10px] text-rose-700 font-bold block">Defective / Leak</span>
                  <span className="text-base font-black font-mono text-rose-600">{godownStock.dom14.defective}</span>
                </div>
                <div className="p-2 rounded-xl bg-sky-50">
                  <span className="text-[10px] text-sky-700 font-bold block">At Plant (Refill)</span>
                  <span className="text-base font-black font-mono text-sky-600">{godownStock.dom14.inTransit}</span>
                </div>
              </div>
            </div>

            {/* 5 KG FTL Mini Cylinder Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                  ⚡ 5 KG FTL Mini
                </span>
                <span className="font-mono font-black text-sm text-slate-900">
                  Total: {godownStock.ftl5.total}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50">
                  <span className="text-[10px] text-emerald-700 font-bold block">Full Gas Cylinders</span>
                  <span className="text-xl font-black font-mono text-emerald-600">{godownStock.ftl5.full}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50">
                  <span className="text-[10px] text-amber-700 font-bold block">Empty (Khali)</span>
                  <span className="text-xl font-black font-mono text-amber-600">{godownStock.ftl5.empty}</span>
                </div>
                <div className="col-span-2 p-2 rounded-xl bg-slate-50 text-center">
                  <span className="text-[11px] font-bold text-slate-600">
                    Counter Instant Refill Stock
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Gas Accessories & Hardware Spares Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Gas Accessories, Regulators & Spares Inventory
                </h3>
                <p className="text-xs text-slate-500">
                  Physical hardware stock available in Central Godown & Workshop
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                {gasAccessories.length} Hardware SKUs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[700px]">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
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
                <tbody className="divide-y divide-slate-100">
                  {gasAccessories.map((acc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-500">{acc.sku}</td>
                      <td className="px-4 py-3 font-extrabold text-slate-900">{acc.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {acc.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-black text-right text-emerald-600">
                        {acc.stock} {acc.unit}
                      </td>
                      <td className="px-4 py-3 font-mono text-right">₹{acc.costPrice}</td>
                      <td className="px-4 py-3 font-mono text-right">₹{acc.mrp}</td>
                      <td className="px-4 py-3 font-mono font-black text-right text-slate-900">
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

      {/* ========================================================================= */}
      {/* PAGE 2: DELIVERY BOY & VEHICLE LIVE MOBILE STOCK */}
      {/* ========================================================================= */}
      {activeSubTab === 'driver' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-slate-900">🚚 Delivery Boy & Fleet Live Mobile Stock</h1>
                  <p className="text-xs text-slate-500 font-medium">Live tracking of cylinders loaded on delivery trucks with day cash collected</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsDriverLoadModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-600/20 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Issue Cylinders to Delivery Vehicle</span>
            </button>
          </div>

          {/* Fleet KPI Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Active Delivery Fleet</span>
                <Truck className="h-4 w-4 text-sky-500" />
              </div>
              <div className="text-2xl font-black font-mono text-sky-600">
                {driverStocks.length} <span className="text-xs font-bold text-slate-400">Vehicles</span>
              </div>
              <div className="text-[10px] font-bold text-sky-700">🚚 Real-time Mobile Units</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Full Gas on Vehicles</span>
                <Flame className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600">
                {totalFullOnFleet} <span className="text-xs font-bold text-slate-400">Pcs</span>
              </div>
              <div className="text-[10px] font-bold text-emerald-700">🟢 In-transit to Customers</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Empties Collected</span>
                <Package className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black font-mono text-amber-600">
                {totalEmptyOnFleet} <span className="text-xs font-bold text-slate-400">Pcs</span>
              </div>
              <div className="text-[10px] font-bold text-amber-700">⚪ Returning to Godown</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Fleet Cash Collected</span>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600">
                ₹{totalCashOnFleet.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] font-bold text-emerald-700">💵 Day Route Collections</div>
            </div>
          </div>

          {/* Delivery Boy Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {driverStocks.map((driver) => (
              <div
                key={driver.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                        <Truck className="h-4 w-4 text-amber-500" />
                        {driver.driverName}
                      </h4>
                      <span className="inline-block mt-0.5 font-mono text-xs font-extrabold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg">
                        {driver.vehicleNumber}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        driver.status === 'ON_ROUTE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {driver.status === 'ON_ROUTE' ? '🚚 On Route' : '✅ Reconciled'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    📍 {driver.route}
                  </p>

                  {/* Stock Counters */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50 text-center">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block">Full on Vehicle</span>
                      <span className="text-2xl font-black font-mono text-emerald-600">{driver.currentFullOnVehicle}</span>
                      <span className="text-[10px] text-slate-500 block">Loaded: {driver.morningLoadedFull}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 text-center">
                      <span className="text-[10px] font-bold text-amber-700 uppercase block">Empties on Vehicle</span>
                      <span className="text-2xl font-black font-mono text-amber-600">{driver.currentEmptyOnVehicle}</span>
                      <span className="text-[10px] text-slate-500 block">Delivered: {driver.deliveredFull}</span>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500">Day Cash / UPI Collected:</span>
                    <span className="font-mono text-emerald-600 text-sm">₹{driver.cashCollected.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">Updated: {driver.lastUpdated}</span>
                  <button
                    onClick={() => {
                      alert(`✅ Vehicle reconciliation initiated for ${driver.driverName} (${driver.vehicleNumber}). Return ${driver.currentFullOnVehicle} Full & ${driver.currentEmptyOnVehicle} Empty to Godown.`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-extrabold text-xs shadow-xs hover:bg-slate-800 transition cursor-pointer"
                  >
                    Evening Reconcile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 3: CUSTOMER CYLINDER HOLDING LEDGER */}
      {/* ========================================================================= */}
      {activeSubTab === 'customer' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-slate-900">👥 Customer Cylinder Holdings & Deposits</h1>
                  <p className="text-xs text-slate-500 font-medium">Track how many agency cylinders each customer holds on site & caution deposit balances</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsCustomerStockModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Customer Cylinder Holding</span>
            </button>
          </div>

          {/* Customer Holdings KPI Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Customers with Holding</span>
                <Users className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-black font-mono text-indigo-600">
                {balances.length} <span className="text-xs font-bold text-slate-400">Accounts</span>
              </div>
              <div className="text-[10px] font-bold text-indigo-700">🏢 Commercial Consumers</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Full Gas at Kitchens</span>
                <Flame className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600">
                {totalCustomerFull} <span className="text-xs font-bold text-slate-400">Pcs</span>
              </div>
              <div className="text-[10px] font-bold text-emerald-700">🟢 In Active Use</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Empties for Pickup</span>
                <Package className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black font-mono text-amber-600">
                {totalCustomerEmpty} <span className="text-xs font-bold text-slate-400">Pcs</span>
              </div>
              <div className="text-[10px] font-bold text-amber-700">⚪ To Collect & Replace</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Total Caution Deposits</span>
                <DollarSign className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black font-mono text-purple-600">
                ₹{totalCustomerDeposit.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] font-bold text-purple-700">🔒 Refundable SV Security</div>
            </div>
          </div>

          {/* Customer Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <span className="text-xs text-slate-500 font-bold">
                Showing {balances.filter((b) => !searchQuery || b.customerName.toLowerCase().includes(searchQuery.toLowerCase())).length} Customer Accounts
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Cylinder Category</th>
                    <th className="px-4 py-3 text-center">Total Holding</th>
                    <th className="px-4 py-3 text-center">Full Cylinders</th>
                    <th className="px-4 py-3 text-center">Empty Cylinders</th>
                    <th className="px-4 py-3">SV Voucher No.</th>
                    <th className="px-4 py-3 text-right">Security Deposit</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {balances
                    .filter((b) => !searchQuery || b.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-extrabold text-slate-900">{item.customerName}</div>
                          {item.customerPhone && <div className="text-[11px] text-slate-500 font-medium">📞 {item.customerPhone}</div>}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-600">{item.category}</td>
                        <td className="px-4 py-3 font-black text-center text-sm font-mono text-indigo-600">
                          {item.currentFullBalance + item.currentEmptyBalance} Pcs
                        </td>
                        <td className="px-4 py-3 font-bold text-center font-mono text-emerald-600">
                          {item.currentFullBalance}
                        </td>
                        <td className="px-4 py-3 font-bold text-center font-mono text-amber-600">
                          {item.currentEmptyBalance}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-600">
                          {item.svNumber || 'SV-ACTIVE'}
                        </td>
                        <td className="px-4 py-3 font-mono font-black text-right text-slate-900">
                          ₹{(item.depositAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => alert(`Showing 360 Cylinder Ledger for ${item.customerName}`)}
                            className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs cursor-pointer"
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 4: STOCK TRANSFER & PLANT GATE PASS */}
      {/* ========================================================================= */}
      {activeSubTab === 'transfer' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-slate-900">🔄 Stock Transfer & Plant Gate Pass Register</h1>
                  <p className="text-xs text-slate-500 font-medium">Official gate passes for Godown ➔ Driver, Driver ➔ Godown, and Bottling Plant refill movements</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDriverLoadModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Issue to Driver Pass</span>
              </button>
              <button
                onClick={() => setIsPlantRefillModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-md shadow-sky-600/20 active:scale-95 transition cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>+ Plant Refill Gate Pass</span>
              </button>
            </div>
          </div>

          {/* Gate Pass Filter Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setTransferTypeFilter('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                transferTypeFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              All Passes ({transferLogs.length})
            </button>
            <button
              onClick={() => setTransferTypeFilter('GODOWN_TO_DRIVER')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                transferTypeFilter === 'GODOWN_TO_DRIVER'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Godown ➔ Driver Loadings
            </button>
            <button
              onClick={() => setTransferTypeFilter('DRIVER_TO_GODOWN')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                transferTypeFilter === 'DRIVER_TO_GODOWN'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Driver ➔ Godown Returns
            </button>
            <button
              onClick={() => setTransferTypeFilter('PLANT_REFILL_GATEPASS')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                transferTypeFilter === 'PLANT_REFILL_GATEPASS'
                  ? 'bg-sky-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              IOCL/BPCL Plant Gate Passes
            </button>
          </div>

          {/* Transfers Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Gate Pass No.</th>
                    <th className="px-4 py-3">Transfer Type</th>
                    <th className="px-4 py-3">From Location</th>
                    <th className="px-4 py-3">To Location</th>
                    <th className="px-4 py-3 text-center">Full Qty</th>
                    <th className="px-4 py-3 text-center">Empty Qty</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transferLogs
                    .filter((log) => transferTypeFilter === 'ALL' || log.transferType === transferTypeFilter)
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500 font-medium">{log.date}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{log.transferNumber}</td>
                        <td className="px-4 py-3 font-semibold">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-teal-50 text-teal-700 border border-teal-200">
                            {log.transferType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700">{log.fromLocation}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{log.toLocation}</td>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 5: SV / TV SUBSCRIPTION VOUCHERS */}
      {/* ========================================================================= */}
      {activeSubTab === 'voucher' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-slate-900">📜 Subscription Vouchers (SV) & Caution Deposits</h1>
                  <p className="text-xs text-slate-500 font-medium">Official cylinder allotment vouchers & refundable security deposit records</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsCustomerStockModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-600/20 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Issue New SV Voucher</span>
            </button>
          </div>

          {/* Voucher KPI Badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Active Subscription Vouchers</span>
                <FileText className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black font-mono text-purple-600">
                {balances.length} <span className="text-xs font-bold text-slate-400">Vouchers</span>
              </div>
              <div className="text-[10px] font-bold text-purple-700">📜 Certified Allotments</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Total Allotted Cylinders</span>
                <Package className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600">
                {totalCustomerHolding} <span className="text-xs font-bold text-slate-400">Pcs</span>
              </div>
              <div className="text-[10px] font-bold text-emerald-700">🔒 Covered under SV</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Total Caution Deposits</span>
                <DollarSign className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black font-mono text-purple-600">
                ₹{totalCustomerDeposit.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] font-bold text-purple-700">💵 Refundable Deposits</div>
            </div>
          </div>

          {/* Voucher Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {balances.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-white border border-purple-200 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-xs text-purple-700">
                    {item.svNumber || 'SV-2026-0089'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 uppercase">
                    ACTIVE SV
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">{item.customerName}</h4>
                  <p className="text-xs text-slate-500">{item.productName}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-100 text-xs font-bold">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Allotted Cylinders</span>
                    <span className="font-mono text-base text-slate-900">
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
                <div className="pt-2 border-t border-purple-50 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Allotted: {item.lastUpdated}</span>
                  <button
                    onClick={() => alert(`Printing SV Voucher ${item.svNumber} for ${item.customerName}`)}
                    className="flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print SV</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 6: PHYSICAL STOCK AUDIT & RECONCILIATION */}
      {/* ========================================================================= */}
      {activeSubTab === 'adjustment' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-slate-900">⚡ Physical Godown Count vs System Book Stock Audit</h1>
                  <p className="text-xs text-slate-500 font-medium">Perform physical cylinder audit, verify variances, and reconcile book stock with 1-click</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => showToast('✅ Physical Godown Stock Audit reconciled and logged in Audit Trail!')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Reconcile System Stock</span>
            </button>
          </div>

          {/* Audit KPI Badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Audited Categories</span>
                <SlidersHorizontal className="h-4 w-4 text-teal-500" />
              </div>
              <div className="text-2xl font-black font-mono text-teal-600">
                4 <span className="text-xs font-bold text-slate-400">Types</span>
              </div>
              <div className="text-[10px] font-bold text-teal-700">19KG, 47.5KG, 14.2KG, 5KG</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Variance Status</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600">
                0 <span className="text-xs font-bold text-slate-400">Discrepancy</span>
              </div>
              <div className="text-[10px] font-bold text-emerald-700">✅ 100% Book vs Godown Match</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Total Physical Godown Pool</span>
                <ShieldCheck className="h-4 w-4 text-slate-600" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-900">
                {totalFullInGodown + totalEmptyInGodown} <span className="text-xs font-bold text-slate-400">Pcs</span>
              </div>
              <div className="text-[10px] font-bold text-slate-600">Full + Empty Inside Godown</div>
            </div>
          </div>

          {/* Audit Reconciliation Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 min-w-[800px]">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
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
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-extrabold text-slate-900">19 KG Commercial LPG</td>
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

                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-extrabold text-slate-900">47.5 KG Industrial LPG</td>
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

                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-extrabold text-slate-900">14.2 KG Domestic LPG</td>
                    <td className="px-4 py-3 font-mono text-center font-bold">{godownStock.dom14.full}</td>
                    <td className="px-4 py-3 font-mono text-center font-bold text-emerald-600">{godownStock.dom14.full}</td>
                    <td className="px-4 py-3 font-mono text-center font-black text-emerald-600">0 (Matched)</td>
                    <td className="px-4 py-3 font-mono text-center font-bold">{godownStock.dom14.empty}</td>
                    <td className="px-4 py-3 font-mono text-center font-bold text-amber-600">{godownStock.dom14.empty}</td>
                    <td className="px-4 py-3 font-mono text-center font-black text-emerald-600">0 (Matched)</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        MATCHED
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-extrabold text-slate-900">5 KG FTL Mini LPG</td>
                    <td className="px-4 py-3 font-mono text-center font-bold">{godownStock.ftl5.full}</td>
                    <td className="px-4 py-3 font-mono text-center font-bold text-emerald-600">{godownStock.ftl5.full}</td>
                    <td className="px-4 py-3 font-mono text-center font-black text-emerald-600">0 (Matched)</td>
                    <td className="px-4 py-3 font-mono text-center font-bold">{godownStock.ftl5.empty}</td>
                    <td className="px-4 py-3 font-mono text-center font-bold text-amber-600">{godownStock.ftl5.empty}</td>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* MODAL 1: PLANT REFILL INWARD */}
      {isPlantRefillModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Plant Bottling Refill Inward</h3>
                  <p className="text-[11px] text-emerald-100">Receive filled cylinders from IOCL / BPCL plant</p>
                </div>
              </div>
              <button onClick={() => setIsPlantRefillModalOpen(false)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handlePlantRefillSubmit} className="p-5 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Plant Delivery Challan / Invoice No *</label>
                  <input
                    type="text"
                    required
                    value={plantChallanNo}
                    onChange={(e) => setPlantChallanNo(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cylinder Category</label>
                  <select
                    value={plantCategory}
                    onChange={(e) => setPlantCategory(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-900"
                  >
                    <option value="19 KG Commercial LPG Cylinder">19 KG Commercial LPG</option>
                    <option value="47.5 KG Industrial LPG Cylinder">47.5 KG Industrial LPG</option>
                    <option value="14.2 KG Domestic LPG Cylinder">14.2 KG Domestic LPG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Target Godown</label>
                  <select
                    value={plantGodown}
                    onChange={(e) => setPlantGodown(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-900"
                  >
                    <option value="Indore Central Godown">Indore Central Godown</option>
                    <option value="Pithampur Industrial Godown">Pithampur Industrial Godown</option>
                    <option value="Vijay Nagar Godown">Vijay Nagar Godown</option>
                  </select>
                </div>

                <div>
                  <label className="block text-emerald-700 font-bold mb-1">Full Cylinders Received (+)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={plantFullInward}
                    onChange={(e) => setPlantFullInward(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-300 font-mono font-black text-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-amber-700 font-bold mb-1">Empty Cylinders Dispatched (-)</label>
                  <input
                    type="number"
                    min={0}
                    value={plantEmptyOutward}
                    onChange={(e) => setPlantEmptyOutward(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-amber-50 border border-amber-300 font-mono font-black text-amber-700 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlantRefillModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md shadow-emerald-600/20 cursor-pointer"
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
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Issue Cylinders to Delivery Vehicle</h3>
                  <p className="text-[11px] text-amber-100">Load stock onto driver vehicle for morning delivery route</p>
                </div>
              </div>
              <button onClick={() => setIsDriverLoadModalOpen(false)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDriverLoadSubmit} className="p-5 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Select Delivery Driver *</label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => {
                      const dId = e.target.value;
                      setSelectedDriverId(dId);
                      const staffMember = staff.find((s) => s.id === dId);
                      if (staffMember) {
                        setDriverLoadVehicle('MP-09-GF-4432');
                      }
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-900"
                  >
                    <option value="staff-5">Ramesh Kumar (MP-09-GF-4432)</option>
                    <option value="staff-6">Suresh Verma (MP-09-AB-1234)</option>
                    <option value="staff-7">Mukesh Yadav (MP-09-TR-7890)</option>
                    {staff
                      .filter((s) => !['staff-5', 'staff-6', 'staff-7'].includes(s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role || 'Driver'})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cylinder Category</label>
                  <select
                    value={driverLoadCategory}
                    onChange={(e) => setDriverLoadCategory(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-900"
                  >
                    <option value="19 KG Commercial LPG Cylinder">19 KG Commercial</option>
                    <option value="47.5 KG Industrial LPG Cylinder">47.5 KG Industrial</option>
                    <option value="14.2 KG Domestic LPG Cylinder">14.2 KG Domestic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Vehicle Registration No.</label>
                  <input
                    type="text"
                    required
                    value={driverLoadVehicle}
                    onChange={(e) => setDriverLoadVehicle(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-amber-700 font-bold mb-1">Full Cylinders to Load onto Vehicle *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={driverLoadQty}
                    onChange={(e) => setDriverLoadQty(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-amber-50 border border-amber-300 font-mono font-black text-amber-700 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDriverLoadModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black shadow-md shadow-amber-600/20 cursor-pointer"
                >
                  Confirm Issue & Generate Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CUSTOMER HOLDING ADD */}
      {isCustomerStockModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Add Customer Cylinder Holding</h3>
                  <p className="text-[11px] text-indigo-100">Set active full & empty cylinder balances held at customer site</p>
                </div>
              </div>
              <button onClick={() => setIsCustomerStockModalOpen(false)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerHoldingSubmit} className="p-5 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Radisson Blu Kitchen / Hotel Saffron"
                    value={custHoldingName}
                    onChange={(e) => setCustHoldingName(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cylinder Category</label>
                  <select
                    value={custHoldingCategory}
                    onChange={(e) => setCustHoldingCategory(e.target.value as any)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-900"
                  >
                    <option value="Commercial 19KG">Commercial 19KG</option>
                    <option value="Industrial 47.5KG">Industrial 47.5KG</option>
                    <option value="Domestic 14.2KG">Domestic 14.2KG</option>
                    <option value="5KG FTL">5KG FTL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">SV Subscription No.</label>
                  <input
                    type="text"
                    value={custHoldingSvNo}
                    onChange={(e) => setCustHoldingSvNo(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-emerald-700 font-bold mb-1">Full Cylinders at Site</label>
                  <input
                    type="number"
                    min={0}
                    value={custHoldingFull}
                    onChange={(e) => setCustHoldingFull(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-300 font-mono font-black text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-amber-700 font-bold mb-1">Empty Cylinders at Site</label>
                  <input
                    type="number"
                    min={0}
                    value={custHoldingEmpty}
                    onChange={(e) => setCustHoldingEmpty(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-amber-50 border border-amber-300 font-mono font-black text-amber-700"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-purple-700 font-bold mb-1">Caution Money / Security Deposit (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={custHoldingDeposit}
                    onChange={(e) => setCustHoldingDeposit(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-purple-50 border border-purple-300 font-mono font-black text-purple-700 text-sm"
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-md shadow-indigo-600/20 cursor-pointer"
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
