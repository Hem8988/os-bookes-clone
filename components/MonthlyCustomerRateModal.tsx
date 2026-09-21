'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  Calendar,
  Tag,
  ArrowRight,
  Filter,
  Check,
  Building2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Customer, Product, PartyRate } from '../lib/types';

interface MonthlyCustomerRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  products: Product[];
  onUpdateCustomers: (updatedCustomers: Customer[]) => void;
}

interface RateRowItem {
  customerId: string;
  customerCode: string;
  customerName: string;
  customerPhone: string;
  productId: string;
  productName: string;
  standardMrp: number;
  standardRate: number;
  customRate: number;
  effectiveMonth: string;
  isModified: boolean;
}

export const MonthlyCustomerRateModal: React.FC<MonthlyCustomerRateModalProps> = ({
  isOpen,
  onClose,
  customers,
  products,
  onUpdateCustomers,
}) => {
  // Current month default: '2026-09'
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'CUSTOM_ONLY' | 'STANDARD_ONLY'>('ALL');
  const [productFilter, setProductFilter] = useState<string>('ALL');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSummary, setImportSummary] = useState<{
    parsedCount: number;
    matchedCount: number;
    previewRows: {
      customerCode: string;
      customerName: string;
      productName: string;
      oldRate: number;
      newRate: number;
      diff: number;
    }[];
  } | null>(null);

  // Local editing state for real-time changes
  const [editedRates, setEditedRates] = useState<Record<string, number>>({});

  if (!isOpen) return null;

  const commercialCustomers = customers.filter((c) => c && c.type === 'Customer');
  const validProducts = products.length > 0 ? products : [
    { id: 'prod_19com', name: '19 KG Commercial LPG Cylinder', salePrice: 1950, mrp: 2200, taxRate: 18 } as Product,
    { id: 'prod_475com', name: '47.5 KG Industrial LPG Cylinder', salePrice: 4800, mrp: 5200, taxRate: 18 } as Product,
    { id: 'prod_19vot', name: '19 KG VOT Commercial Cylinder', salePrice: 1950, mrp: 2100, taxRate: 18 } as Product,
  ];

  // Flatten matrix: Customer x Product
  const matrixRows: RateRowItem[] = [];
  commercialCustomers.forEach((cust, cIdx) => {
    const code = cust.customerCode || `CUST-${1001 + cIdx}`;
    validProducts.forEach((prod) => {
      const existingRate = cust.partyRates?.find(
        (pr) => pr.productId === prod.id && (!pr.effectiveMonth || pr.effectiveMonth === selectedMonth)
      ) || cust.partyRates?.find((pr) => pr.productId === prod.id);

      const key = `${cust.id}_${prod.id}`;
      const hasLocalEdit = key in editedRates;
      const currentRate = hasLocalEdit
        ? editedRates[key]
        : (existingRate && existingRate.price > 0 ? existingRate.price : prod.salePrice || 0);

      matrixRows.push({
        customerId: cust.id,
        customerCode: code,
        customerName: cust.name,
        customerPhone: cust.phone || '',
        productId: prod.id,
        productName: prod.name,
        standardMrp: prod.mrp || prod.salePrice || 0,
        standardRate: prod.salePrice || 0,
        customRate: currentRate,
        effectiveMonth: existingRate?.effectiveMonth || selectedMonth,
        isModified: Boolean(hasLocalEdit || (existingRate && existingRate.price !== prod.salePrice)),
      });
    });
  });

  // Filtered rows
  const filteredRows = matrixRows.filter((row) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      row.customerCode.toLowerCase().includes(q) ||
      row.customerName.toLowerCase().includes(q) ||
      row.customerPhone.includes(q) ||
      row.productName.toLowerCase().includes(q);

    if (!matchSearch) return false;

    if (productFilter !== 'ALL' && row.productId !== productFilter) return false;

    const hasCustomRate = row.customRate > 0 && row.customRate !== row.standardRate;
    if (filterMode === 'CUSTOM_ONLY' && !hasCustomRate) return false;
    if (filterMode === 'STANDARD_ONLY' && hasCustomRate) return false;

    return true;
  });

  const totalCustomRatesCount = matrixRows.filter(
    (r) => r.customRate > 0 && r.customRate !== r.standardRate
  ).length;

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Handle single cell rate change
  const handleRateChange = (customerId: string, productId: string, value: string) => {
    const num = parseFloat(value);
    const key = `${customerId}_${productId}`;
    setEditedRates((prev) => ({
      ...prev,
      [key]: isNaN(num) ? 0 : num,
    }));
  };

  // Save all in-memory edited rates to customers state
  const handleSaveAllEdited = () => {
    const updated = customers.map((c) => {
      if (c.type !== 'Customer') return c;
      const currentRates: PartyRate[] = [...(c.partyRates || [])];

      validProducts.forEach((prod) => {
        const key = `${c.id}_${prod.id}`;
        if (key in editedRates) {
          const newPrice = editedRates[key];
          const existingIdx = currentRates.findIndex((r) => r.productId === prod.id);

          if (newPrice > 0 && newPrice !== prod.salePrice) {
            const partyRateObj: PartyRate = {
              productId: prod.id,
              productName: prod.name,
              price: newPrice,
              effectiveMonth: selectedMonth,
              updatedAt: new Date().toISOString(),
            };
            if (existingIdx >= 0) {
              currentRates[existingIdx] = partyRateObj;
            } else {
              currentRates.push(partyRateObj);
            }
          } else if (newPrice === prod.salePrice || newPrice === 0) {
            // Remove special custom rate if it matches standard rate
            if (existingIdx >= 0) {
              currentRates.splice(existingIdx, 1);
            }
          }
        }
      });

      return {
        ...c,
        customerCode: c.customerCode || `CUST-${1001 + customers.indexOf(c)}`,
        partyRates: currentRates,
      };
    });

    onUpdateCustomers(updated);
    setEditedRates({});
    showToast(`✅ Successfully saved customer monthly rates for ${selectedMonth}!`);
  };

  // 1. Download Excel / CSV Template
  const handleDownloadExcel = () => {
    const headers = [
      'Customer_ID',
      'Customer_Name',
      'Phone',
      'Product_ID',
      'Product_Name',
      'Standard_MRP',
      'Standard_Rate',
      'Monthly_Custom_Rate',
      'Effective_Month',
    ];

    const rows = matrixRows.map((r) => [
      `"${r.customerCode}"`,
      `"${r.customerName.replace(/"/g, '""')}"`,
      `"${r.customerPhone}"`,
      `"${r.productId}"`,
      `"${r.productName.replace(/"/g, '""')}"`,
      r.standardMrp,
      r.standardRate,
      r.customRate,
      `"${selectedMonth}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Customer_Rates_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`📥 Downloaded Excel template: Customer_Rates_${selectedMonth}.csv`);
  };

  // 2. Upload and Parse Excel / CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          alert('CSV file is empty or missing data rows.');
          return;
        }

        const parseCsvLine = (line: string) => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim().replace(/^"|"$/g, ''));
          return result;
        };

        const headerLine = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s_-]/g, ''));
        const codeIdx = headerLine.findIndex((h) => h.includes('customerid') || h.includes('custid') || h.includes('customercode') || h === 'id');
        const nameIdx = headerLine.findIndex((h) => h.includes('customername') || h.includes('partyname') || h.includes('name'));
        const prodIdIdx = headerLine.findIndex((h) => h.includes('productid') || h.includes('prodid') || h.includes('itemid'));
        const prodNameIdx = headerLine.findIndex((h) => h.includes('productname') || h.includes('itemname') || h.includes('product'));
        const rateIdx = headerLine.findIndex((h) => h.includes('monthlycustomrate') || h.includes('customrate') || h.includes('newrate') || h.includes('rate') || h.includes('price'));

        if (rateIdx === -1) {
          alert('Could not find Rate / Monthly_Custom_Rate column in CSV.');
          return;
        }

        const previewRows: {
          customerCode: string;
          customerName: string;
          productName: string;
          oldRate: number;
          newRate: number;
          diff: number;
        }[] = [];

        const newLocalEdits: Record<string, number> = {};

        for (let i = 1; i < lines.length; i++) {
          const row = parseCsvLine(lines[i]);
          if (row.length === 0) continue;

          const rawCode = codeIdx >= 0 ? row[codeIdx] : '';
          const rawName = nameIdx >= 0 ? row[nameIdx] : '';
          const rawProdId = prodIdIdx >= 0 ? row[prodIdIdx] : '';
          const rawProdName = prodNameIdx >= 0 ? row[prodNameIdx] : '';
          const rawRate = row[rateIdx];

          const newRateNum = parseFloat(rawRate);
          if (isNaN(newRateNum) || newRateNum <= 0) continue;

          // Match customer
          const matchedCust = commercialCustomers.find(
            (c, idx) =>
              (rawCode && (c.customerCode?.toLowerCase() === rawCode.toLowerCase() || c.id.toLowerCase() === rawCode.toLowerCase() || `cust-${1001 + idx}`.toLowerCase() === rawCode.toLowerCase())) ||
              (rawName && c.name.toLowerCase() === rawName.toLowerCase())
          );

          // Match product
          const matchedProd = validProducts.find(
            (p) =>
              (rawProdId && p.id.toLowerCase() === rawProdId.toLowerCase()) ||
              (rawProdName && p.name.toLowerCase() === rawProdName.toLowerCase())
          );

          if (matchedCust && matchedProd) {
            const key = `${matchedCust.id}_${matchedProd.id}`;
            const existingCustRate = matchedCust.partyRates?.find((r) => r.productId === matchedProd.id)?.price || matchedProd.salePrice || 0;

            newLocalEdits[key] = newRateNum;
            previewRows.push({
              customerCode: matchedCust.customerCode || rawCode || matchedCust.id,
              customerName: matchedCust.name,
              productName: matchedProd.name,
              oldRate: existingCustRate,
              newRate: newRateNum,
              diff: newRateNum - existingCustRate,
            });
          }
        }

        setEditedRates((prev) => ({ ...prev, ...newLocalEdits }));
        setImportSummary({
          parsedCount: lines.length - 1,
          matchedCount: previewRows.length,
          previewRows,
        });

        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        alert(`Error parsing Excel/CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyImportedRates = () => {
    handleSaveAllEdited();
    setImportSummary(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="w-full max-w-6xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-inner">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg md:text-xl font-black tracking-tight">
                  Monthly Customer Rate Master
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                  {selectedMonth}
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Manage, update, and sync custom B2B base rates per customer via Excel sheet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSaveAllEdited}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Save className="h-4 w-4" /> Save Rates
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick KPI & Action Ribbon */}
        <div className="p-4 md:px-6 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Month Selector & Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Rate Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-black font-mono text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
                />
              </div>

              {/* Product Filter */}
              <div className="relative">
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="py-2 px-3 pr-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-xs"
                >
                  <option value="ALL">All Products / Cylinders</option>
                  {validProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Rate Type Filter */}
              <div className="flex items-center p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-xs">
                <button
                  onClick={() => setFilterMode('ALL')}
                  className={`px-3 py-1 rounded-lg transition ${
                    filterMode === 'ALL'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  All Rates
                </button>
                <button
                  onClick={() => setFilterMode('CUSTOM_ONLY')}
                  className={`px-3 py-1 rounded-lg transition ${
                    filterMode === 'CUSTOM_ONLY'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Customized ({totalCustomRatesCount})
                </button>
              </div>
            </div>

            {/* Excel Download & Upload Buttons */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, .txt"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={handleDownloadExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold text-xs border border-teal-200 dark:border-teal-800 shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Download className="h-4 w-4 text-teal-600" />
                <span>Download Excel Sheet</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Excel to Update</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Customer ID (e.g. CUST-1001), Customer Name, Phone, or Product..."
              className="w-full py-2.5 px-4 pl-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Toast Alert */}
        {successToast && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between animate-fade-in shadow-xs">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {successToast}
            </span>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-900">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Excel Import Review Modal Dialog */}
        {importSummary && (
          <div className="mx-6 my-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Excel Import Preview ({importSummary.matchedCount} Rates Matched from {importSummary.parsedCount} rows)
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyImportedRates}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  Confirm & Apply All Rates
                </button>
                <button
                  onClick={() => setImportSummary(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto border border-amber-200 dark:border-amber-800 rounded-xl bg-white dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="bg-amber-100/70 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 font-bold text-[11px]">
                  <tr>
                    <th className="p-2">Customer ID</th>
                    <th className="p-2">Customer Name</th>
                    <th className="p-2">Product</th>
                    <th className="p-2 text-right">Old Rate</th>
                    <th className="p-2 text-right">New Rate (Excel)</th>
                    <th className="p-2 text-center">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {importSummary.previewRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2 font-mono font-bold text-teal-700 dark:text-teal-400">{r.customerCode}</td>
                      <td className="p-2 font-semibold">{r.customerName}</td>
                      <td className="p-2 text-slate-600 dark:text-slate-400">{r.productName}</td>
                      <td className="p-2 text-right font-mono text-slate-500">₹{r.oldRate.toFixed(2)}</td>
                      <td className="p-2 text-right font-mono font-black text-emerald-600">₹{r.newRate.toFixed(2)}</td>
                      <td className="p-2 text-center">
                        {r.diff !== 0 ? (
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.diff < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {r.diff < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                            {r.diff > 0 ? `+₹${r.diff.toFixed(2)}` : `-₹${Math.abs(r.diff).toFixed(2)}`}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">No change</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Interactive Rate Matrix Table */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs bg-white dark:bg-slate-900">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[900px]">
              <thead className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-3 w-28 text-center">Customer ID</th>
                  <th className="py-3 px-4">Customer Name & Contact</th>
                  <th className="py-3 px-4">Product / Cylinder</th>
                  <th className="py-3 px-3 w-28 text-right">Standard Rate</th>
                  <th className="py-3 px-4 w-44 text-center">Monthly Base Rate (₹)</th>
                  <th className="py-3 px-3 w-28 text-center">Rate Status</th>
                  <th className="py-3 px-3 w-24 text-center">Month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Layers className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-sm">No customers or rates found</p>
                        <p className="text-xs text-slate-400">Try changing your search keywords or filter criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => {
                    const diff = row.customRate - row.standardRate;
                    const isCustom = row.customRate > 0 && row.customRate !== row.standardRate;

                    return (
                      <tr key={`${row.customerId}_${row.productId}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Customer ID Badge */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-mono font-black text-[11px] border border-teal-200 dark:border-teal-800">
                            {row.customerCode}
                          </span>
                        </td>

                        {/* Customer Name */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{row.customerName}</div>
                          {row.customerPhone && (
                            <div className="text-[11px] text-slate-400 font-mono">📞 {row.customerPhone}</div>
                          )}
                        </td>

                        {/* Product */}
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{row.productName}</span>
                          <span className="block text-[10px] text-slate-400">MRP: ₹{row.standardMrp.toFixed(2)}</span>
                        </td>

                        {/* Standard Base Rate */}
                        <td className="py-3 px-3 text-right font-mono text-slate-500 font-semibold">
                          ₹{row.standardRate.toFixed(2)}
                        </td>

                        {/* Editable Custom Rate Input */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-xs font-bold text-slate-400">₹</span>
                            <input
                              type="number"
                              min={0}
                              value={row.customRate || ''}
                              placeholder={row.standardRate.toString()}
                              onChange={(e) => handleRateChange(row.customerId, row.productId, e.target.value)}
                              className={`w-28 py-1.5 px-2.5 rounded-xl border text-xs font-black font-mono text-right focus:outline-none focus:ring-2 transition-all ${
                                isCustom
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 focus:ring-emerald-500'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-teal-500'
                              }`}
                            />
                          </div>
                          {isCustom && (
                            <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                              {diff < 0 ? `Special: -₹${Math.abs(diff).toFixed(2)} / unit` : `+₹${diff.toFixed(2)} / unit`}
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isCustom
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {isCustom ? <Check className="h-3 w-3" /> : null}
                            {isCustom ? 'Custom Rate' : 'Standard'}
                          </span>
                        </td>

                        {/* Effective Month */}
                        <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500">
                          {selectedMonth}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Total Commercial Customers: <strong>{commercialCustomers.length}</strong></span>
            <span>•</span>
            <span>Custom Rates Active: <strong className="text-emerald-600">{totalCustomRatesCount}</strong></span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleSaveAllEdited}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Save & Sync Customer Rates</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
