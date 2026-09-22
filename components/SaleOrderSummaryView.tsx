'use client';

import React, { useState, useMemo } from 'react';
import {
  Truck,
  Search,
  Plus,
  Filter,
  CheckSquare,
  Square,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Edit3,
  Trash2,
  ChevronDown,
  X,
  Phone,
  Car,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react';
import { SaleOrder, Customer, EmployeeMaster } from '../lib/types';

interface SaleOrderSummaryViewProps {
  saleOrders: SaleOrder[];
  customers: Customer[];
  staff: EmployeeMaster[];
  onAddSO: () => void;
  onEditSO: (so: SaleOrder) => void;
  onDeleteSO: (id: string) => void;
  onPrintSO: (so: SaleOrder) => void;
  onUpdateSO: (so: SaleOrder) => void;
  onClose: () => void;
}

export const SaleOrderSummaryView: React.FC<SaleOrderSummaryViewProps> = ({
  saleOrders,
  customers,
  staff = [],
  onAddSO,
  onEditSO,
  onDeleteSO,
  onPrintSO,
  onUpdateSO,
  onClose,
}) => {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [driverFilter, setDriverFilter] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED' | string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Converted to Bill'>('ALL');
  const [partyFilter, setPartyFilter] = useState<string>('ALL');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDriverId, setBulkDriverId] = useState<string>('');
  const [bulkVehicleNumber, setBulkVehicleNumber] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Single Order Quick Assign Modal State
  const [quickAssignSO, setQuickAssignSO] = useState<SaleOrder | null>(null);
  const [singleDriverId, setSingleDriverId] = useState<string>('');
  const [singleVehicleNumber, setSingleVehicleNumber] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Drivers / Delivery Staff List
  const deliveryStaffList = useMemo(() => {
    return staff.filter((s) => s.active !== false);
  }, [staff]);

  // Filtered Sale Orders
  const filteredOrders = useMemo(() => {
    return saleOrders.filter((so) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        so.soNumber.toLowerCase().includes(q) ||
        so.customerName.toLowerCase().includes(q) ||
        (so.customerGstin && so.customerGstin.toLowerCase().includes(q)) ||
        (so.customerPhone && so.customerPhone.includes(q)) ||
        (so.deliveryBoyName && so.deliveryBoyName.toLowerCase().includes(q)) ||
        (so.vehicleNumber && so.vehicleNumber.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (statusFilter !== 'ALL' && so.status !== statusFilter) return false;

      if (partyFilter !== 'ALL' && so.customerName !== partyFilter) return false;

      if (driverFilter === 'UNASSIGNED') {
        if (so.deliveryBoyName || so.deliveryBoyId) return false;
      } else if (driverFilter === 'ASSIGNED') {
        if (!so.deliveryBoyName && !so.deliveryBoyId) return false;
      } else if (driverFilter !== 'ALL') {
        // Specific driver ID or Name
        if (so.deliveryBoyId !== driverFilter && so.deliveryBoyName !== driverFilter) return false;
      }

      return true;
    });
  }, [saleOrders, searchTerm, driverFilter, statusFilter, partyFilter]);

  // Selection helpers
  const allFilteredSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((so) => selectedIds.includes(so.id));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      // Unselect all visible
      const visibleIds = new Set(filteredOrders.map((so) => so.id));
      setSelectedIds(selectedIds.filter((id) => !visibleIds.has(id)));
    } else {
      // Select all visible
      const newSelected = new Set([...selectedIds, ...filteredOrders.map((so) => so.id)]);
      setSelectedIds(Array.from(newSelected));
    }
  };

  const handleToggleRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Bulk Driver Assignment Action
  const handleBulkAssign = () => {
    if (selectedIds.length === 0) {
      alert('Please select at least one Sale Order to assign a driver.');
      return;
    }
    if (!bulkDriverId) {
      alert('Please select a Delivery Boy / Driver from the dropdown.');
      return;
    }

    const selectedEmp = staff.find((s) => s.id === bulkDriverId);
    const driverName = selectedEmp?.name || 'Assigned Driver';
    const driverPhone = selectedEmp?.phone || '';

    let updatedCount = 0;
    selectedIds.forEach((soId) => {
      const order = saleOrders.find((so) => so.id === soId);
      if (order) {
        const updatedOrder: SaleOrder = {
          ...order,
          deliveryBoyId: bulkDriverId,
          deliveryBoyName: driverName,
          driverPhone: driverPhone,
          vehicleNumber: bulkVehicleNumber || order.vehicleNumber || undefined,
          deliveryStatus: 'Assigned',
          assignedAt: new Date().toISOString(),
        };
        onUpdateSO(updatedOrder);
        updatedCount++;
      }
    });

    showToast(`✅ Successfully assigned driver "${driverName}" to ${updatedCount} Sale Orders!`);
    setSelectedIds([]);
    setBulkDriverId('');
    setBulkVehicleNumber('');
  };

  // Bulk Unassign Driver Action
  const handleBulkUnassign = () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Unassign driver from ${selectedIds.length} selected orders?`)) return;

    let updatedCount = 0;
    selectedIds.forEach((soId) => {
      const order = saleOrders.find((so) => so.id === soId);
      if (order) {
        const updatedOrder: SaleOrder = {
          ...order,
          deliveryBoyId: undefined,
          deliveryBoyName: undefined,
          driverPhone: undefined,
          vehicleNumber: undefined,
          deliveryStatus: 'Unassigned',
          assignedAt: undefined,
        };
        onUpdateSO(updatedOrder);
        updatedCount++;
      }
    });

    showToast(`⚠️ Driver unassigned from ${updatedCount} Sale Orders.`);
    setSelectedIds([]);
  };

  // Single Quick Assign Save
  const handleSaveQuickAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAssignSO) return;

    if (!singleDriverId) {
      // Unassign
      const updated: SaleOrder = {
        ...quickAssignSO,
        deliveryBoyId: undefined,
        deliveryBoyName: undefined,
        driverPhone: undefined,
        vehicleNumber: undefined,
        deliveryStatus: 'Unassigned',
      };
      onUpdateSO(updated);
      showToast(`Driver unassigned from Order ${quickAssignSO.soNumber}.`);
    } else {
      const emp = staff.find((s) => s.id === singleDriverId);
      const updated: SaleOrder = {
        ...quickAssignSO,
        deliveryBoyId: singleDriverId,
        deliveryBoyName: emp?.name || 'Driver',
        driverPhone: emp?.phone || '',
        vehicleNumber: singleVehicleNumber || quickAssignSO.vehicleNumber || undefined,
        deliveryStatus: 'Assigned',
        assignedAt: new Date().toISOString(),
      };
      onUpdateSO(updated);
      showToast(`✅ Driver "${emp?.name}" assigned to Order ${quickAssignSO.soNumber}!`);
    }

    setQuickAssignSO(null);
  };

  // Summary KPI Calculations
  const stats = useMemo(() => {
    const totalOrders = saleOrders.length;
    const totalValue = saleOrders.reduce((sum, so) => sum + (so.totalAmount || 0), 0);
    const assignedOrders = saleOrders.filter((so) => so.deliveryBoyName || so.deliveryBoyId).length;
    const unassignedOrders = totalOrders - assignedOrders;
    const convertedValue = saleOrders
      .filter((so) => so.status === 'Converted to Bill')
      .reduce((sum, so) => sum + (so.totalAmount || 0), 0);

    return { totalOrders, totalValue, assignedOrders, unassignedOrders, convertedValue };
  }, [saleOrders]);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 flex flex-col min-h-screen text-slate-800 dark:text-slate-100 font-sans -mx-4 -mt-4 md:-mx-6 md:-mt-6 -mb-24 md:-mb-24 transition-colors">
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

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-4 md:px-6 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 via-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Sale Order & Delivery Dispatch
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {stats.totalOrders} Orders
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage commercial customer orders, driver assignments & bulk delivery dispatch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onAddSO}
            className="flex items-center gap-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Sale Order</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="Close to Inventory Hub"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="p-4 md:p-6 space-y-4 max-w-[1700px] mx-auto w-full flex-1">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Total Orders Value
              </span>
              <span className="text-lg md:text-xl font-black font-mono text-slate-900 dark:text-slate-100">
                ₹{stats.totalValue.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                {stats.totalOrders} total sales orders
              </span>
            </div>
            <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                🚚 Driver Assigned
              </span>
              <span className="text-lg md:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {stats.assignedOrders} Orders
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                Ready for dispatch / route delivery
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Truck className="h-5 w-5" />
            </div>
          </div>

          <div
            onClick={() => setDriverFilter('UNASSIGNED')}
            className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs flex items-center justify-between cursor-pointer transition-all ${
              driverFilter === 'UNASSIGNED'
                ? 'ring-2 ring-amber-500 border-amber-300 dark:border-amber-700 bg-amber-50/20'
                : 'border-slate-200/90 dark:border-slate-800 hover:border-amber-300'
            }`}
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                ⚠️ Awaiting Driver Assignment
              </span>
              <span className="text-lg md:text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                {stats.unassignedOrders} Orders
              </span>
              <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80 block mt-0.5 font-bold">
                Click to filter unassigned orders
              </span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Billed / Converted Value
              </span>
              <span className="text-lg md:text-xl font-black font-mono text-sky-600 dark:text-sky-400">
                ₹{stats.convertedValue.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                Sale Invoices generated
              </span>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Search, Filter Bar & Bulk Actions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by SO#, Customer Name, Driver Name, or Vehicle No..."
                className="w-full py-2 px-3 pl-9 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>

            {/* Driver Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 hidden sm:inline">Driver:</span>
              <select
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className="py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
              >
                <option value="ALL">All Drivers (All Orders)</option>
                <option value="UNASSIGNED">⚠️ Unassigned Only</option>
                <option value="ASSIGNED">🚚 Assigned Only</option>
                <optgroup label="Filter by Driver Name">
                  {deliveryStaffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.role})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 hidden sm:inline">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Converted to Bill">Converted to Bill</option>
              </select>
            </div>

            {/* Reset Filters */}
            {(searchTerm || driverFilter !== 'ALL' || statusFilter !== 'ALL' || partyFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDriverFilter('ALL');
                  setStatusFilter('ALL');
                  setPartyFilter('ALL');
                }}
                className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-900 transition flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>

          {/* BULK ACTIONS TOOLBAR (Appears when >= 1 order is selected) */}
          {selectedIds.length > 0 && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 dark:from-teal-950/40 dark:via-emerald-950/40 dark:to-teal-950/40 border-2 border-teal-500/50 shadow-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-600 text-white font-black text-xs">
                  {selectedIds.length}
                </span>
                <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                  Sale Orders Selected for Bulk Driver Assignment
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Driver Selector */}
                <div className="relative">
                  <select
                    value={bulkDriverId}
                    onChange={(e) => {
                      const dId = e.target.value;
                      setBulkDriverId(dId);
                      const emp = staff.find((s) => s.id === dId);
                      if (emp && emp.designation && emp.designation.includes('(') && emp.designation.includes(')')) {
                        const vMatch = emp.designation.match(/\((.*?)\)/);
                        if (vMatch) setBulkVehicleNumber(vMatch[1]);
                      }
                    }}
                    className="py-2 px-3 pr-8 rounded-xl bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-xs"
                  >
                    <option value="">-- Choose Driver / Delivery Boy --</option>
                    {deliveryStaffList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.role === 'Delivery Boy' || emp.role === 'Driver' ? '🚚 ' : '👤 '}
                        {emp.name} ({emp.role}) {emp.phone ? `- ${emp.phone}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Optional Vehicle input */}
                <input
                  type="text"
                  value={bulkVehicleNumber}
                  onChange={(e) => setBulkVehicleNumber(e.target.value)}
                  placeholder="Vehicle No. (e.g. MP-09-GF-4432)"
                  className="py-2 px-3 w-48 rounded-xl bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
                />

                {/* Bulk Assign Button */}
                <button
                  type="button"
                  onClick={handleBulkAssign}
                  className="flex items-center gap-1.5 py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition cursor-pointer"
                >
                  <Truck className="h-3.5 w-3.5" />
                  <span>Assign to {selectedIds.length} Orders</span>
                </button>

                {/* Bulk Unassign Button */}
                <button
                  type="button"
                  onClick={handleBulkUnassign}
                  className="py-2 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold text-xs transition cursor-pointer"
                  title="Remove assigned driver from selected orders"
                >
                  Unassign Driver
                </button>

                {/* Deselect All */}
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition"
                  title="Clear Selection"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sale Orders Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[1000px]">
              <thead className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-700 select-none">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400"
                      title={allFilteredSelected ? 'Deselect all' : 'Select all visible'}
                    >
                      {allFilteredSelected ? (
                        <CheckSquare className="h-4 w-4 text-teal-600" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-3 w-28">Date</th>
                  <th className="px-3 py-3 w-32">SO Number</th>
                  <th className="px-3 py-3">Customer Name</th>
                  <th className="px-3 py-3 w-64">Assigned Driver / Delivery</th>
                  <th className="px-3 py-3 w-32 text-right">Amount (₹)</th>
                  <th className="px-3 py-3 w-28 text-center">Status</th>
                  <th className="px-3 py-3 w-32 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Truck className="h-10 w-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                      <p className="font-bold text-sm text-slate-600 dark:text-slate-300">
                        No Sale Orders found
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try changing the driver filter, status, or search query.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((so) => {
                    const isSelected = selectedIds.includes(so.id);
                    const hasDriver = Boolean(so.deliveryBoyName || so.deliveryBoyId);

                    return (
                      <tr
                        key={so.id}
                        className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                          isSelected ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRow(so.id)}
                            className="text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-teal-600" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-300 dark:text-slate-700" />
                            )}
                          </button>
                        </td>

                        {/* Date */}
                        <td className="px-3 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400 font-medium">
                          {so.date}
                        </td>

                        {/* SO Number */}
                        <td className="px-3 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {so.soNumber}
                        </td>

                        {/* Customer */}
                        <td className="px-3 py-3">
                          <div className="font-extrabold text-slate-900 dark:text-slate-100">
                            {so.customerName}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            {so.customerGstin && (
                              <span className="font-mono">GSTIN: {so.customerGstin}</span>
                            )}
                            {so.customerPhone && (
                              <span>📞 {so.customerPhone}</span>
                            )}
                          </div>
                        </td>

                        {/* Driver / Delivery Person */}
                        <td className="px-3 py-3">
                          {hasDriver ? (
                            <div
                              onClick={() => {
                                setQuickAssignSO(so);
                                setSingleDriverId(so.deliveryBoyId || '');
                                setSingleVehicleNumber(so.vehicleNumber || '');
                              }}
                              className="group inline-flex flex-col p-1.5 px-2.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 hover:border-teal-400 cursor-pointer transition"
                              title="Click to re-assign or change driver"
                            >
                              <div className="flex items-center gap-1.5">
                                <Truck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                                <span className="font-extrabold text-teal-900 dark:text-teal-200">
                                  {so.deliveryBoyName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-teal-700 dark:text-teal-300 font-mono">
                                {so.vehicleNumber && (
                                  <span className="font-bold bg-teal-100 dark:bg-teal-900/60 px-1 py-0.2 rounded">
                                    {so.vehicleNumber}
                                  </span>
                                )}
                                {so.driverPhone && <span>{so.driverPhone}</span>}
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setQuickAssignSO(so);
                                setSingleDriverId('');
                                setSingleVehicleNumber('');
                              }}
                              className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-extrabold text-[11px] hover:bg-amber-100 dark:hover:bg-amber-900/50 transition cursor-pointer"
                              title="Assign driver to this sale order"
                            >
                              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                              <span>+ Assign Driver</span>
                            </button>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-3 py-3 font-mono font-black text-right text-slate-900 dark:text-slate-100">
                          ₹{so.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase inline-block ${
                              so.status === 'Converted to Bill'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                            }`}
                          >
                            {so.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setQuickAssignSO(so);
                                setSingleDriverId(so.deliveryBoyId || '');
                                setSingleVehicleNumber(so.vehicleNumber || '');
                              }}
                              className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 transition"
                              title="Assign / Change Driver"
                            >
                              <Truck className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onPrintSO(so)}
                              className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white shadow-xs transition"
                              title="Print Sale Order"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditSO(so)}
                              className="p-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition"
                              title="Edit Sale Order"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete Sale Order ${so.soNumber}?`)) {
                                  onDeleteSO(so.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition"
                              title="Delete Sale Order"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* QUICK DRIVER ASSIGNMENT MODAL (Single Order) */}
      {quickAssignSO && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Assign Driver & Delivery Person</h3>
                  <p className="text-[11px] text-teal-100 font-mono">
                    Order: {quickAssignSO.soNumber} | {quickAssignSO.customerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickAssignSO(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveQuickAssign} className="p-5 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  Select Driver / Delivery Boy
                </label>
                <select
                  value={singleDriverId}
                  onChange={(e) => {
                    const dId = e.target.value;
                    setSingleDriverId(dId);
                    const emp = staff.find((s) => s.id === dId);
                    if (emp && emp.designation && emp.designation.includes('(') && emp.designation.includes(')')) {
                      const vMatch = emp.designation.match(/\((.*?)\)/);
                      if (vMatch) setSingleVehicleNumber(vMatch[1]);
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Remove Driver (Unassign) --</option>
                  {deliveryStaffList.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.role === 'Delivery Boy' || emp.role === 'Driver' ? '🚚 ' : '👤 '}
                      {emp.name} ({emp.role}) {emp.phone ? `- ${emp.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  Vehicle Number / Delivery Route
                </label>
                <input
                  type="text"
                  value={singleVehicleNumber}
                  onChange={(e) => setSingleVehicleNumber(e.target.value)}
                  placeholder="e.g. MP-09-GF-4432"
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickAssignSO(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold shadow-md shadow-teal-600/20 transition"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
