'use client';

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  Shield, 
  FileText, 
  Filter, 
  CheckCircle2, 
  XCircle,
  LayoutList,
  LayoutGrid
} from 'lucide-react';
import { Customer } from '../lib/types';
import { AddEditVendorModal } from './AddEditVendorModal';

interface CustomersModuleProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (id: string) => void;
}

export const CustomersModule: React.FC<CustomersModuleProps> = ({ 
  customers, 
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'Customer' | 'Vendor' | 'RECEIVABLE' | 'PAYABLE'>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Filtered Customers Calculation
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.tradeName && c.tradeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.area && c.area.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === 'Customer') return c.type === 'Customer';
      if (filterType === 'Vendor') return c.type === 'Vendor';
      if (filterType === 'RECEIVABLE') return c.balance > 0;
      if (filterType === 'PAYABLE') return c.balance < 0;

      return true;
    });
  }, [customers, searchTerm, filterType]);

  // Handle Add Click
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  // Handle Edit Click
  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  // Handle Save (Add or Update)
  const handleSaveCustomer = (savedCustomer: Customer) => {
    if (editingCustomer) {
      if (onUpdateCustomer) {
        onUpdateCustomer(savedCustomer);
      } else {
        onAddCustomer(savedCustomer);
      }
    } else {
      onAddCustomer(savedCustomer);
    }
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  // Handle Delete Click
  const handleDeleteClick = (c: Customer) => {
    if (!onDeleteCustomer) return;
    if (window.confirm(`Are you sure you want to delete party "${c.name}"? This action cannot be undone.`)) {
      onDeleteCustomer(c.id);
    }
  };

  const customerCount = customers.filter(c => c.type === 'Customer').length;
  const vendorCount = customers.filter(c => c.type === 'Vendor').length;
  const receivableCount = customers.filter(c => c.balance > 0).length;
  const payableCount = customers.filter(c => c.balance < 0).length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-500" />
            Party Master & Ledger Directory ({customers.length} Accounts)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage B2B LPG Customers, Vendors, GSTIN Registrations, Credit Limits & Balances in List View
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="List View"
            >
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>

          {/* Add New Party Button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Customer / Vendor</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Name, GSTIN, Phone, City..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Quick Filter Badges */}
          <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All ({customers.length})
            </button>
            <button
              onClick={() => setFilterType('Customer')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterType === 'Customer'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
              }`}
            >
              Customers ({customerCount})
            </button>
            <button
              onClick={() => setFilterType('Vendor')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterType === 'Vendor'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
              }`}
            >
              Vendors ({vendorCount})
            </button>
            <button
              onClick={() => setFilterType('RECEIVABLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterType === 'RECEIVABLE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 hover:bg-blue-100'
              }`}
            >
              Receivables ({receivableCount})
            </button>
            <button
              onClick={() => setFilterType('PAYABLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterType === 'PAYABLE'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
              }`}
            >
              Payables ({payableCount})
            </button>
          </div>

        </div>

      </div>

      {/* Main Content Display: List View (Table) vs Grid View */}
      {viewMode === 'list' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              
              {/* Table Header */}
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Party Details</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">City / Area</th>
                  <th className="py-3 px-4">GSTIN Number</th>
                  <th className="py-3 px-4 text-right">Account Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                        <p className="font-bold">No matching customer or vendor accounts found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c, index) => {
                    const isReceivable = c.balance > 0;
                    const isPayable = c.balance < 0;

                    return (
                      <tr 
                        key={c.id} 
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Index */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-400">
                          {index + 1}
                        </td>

                        {/* Party Details */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                                {c.name}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  c.type === 'Customer'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                }`}
                              >
                                {c.type}
                              </span>
                            </div>
                            
                            {c.tradeName && (
                              <div className="text-[11px] text-slate-500 font-semibold">
                                Trade: {c.tradeName}
                              </div>
                            )}

                            {Array.isArray(c.tags) && c.tags.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap mt-1">
                                {c.tags.map((tag, i) => (
                                  <span 
                                    key={i} 
                                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100 font-semibold">
                              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>{c.phone || 'N/A'}</span>
                            </div>
                            {c.email && (
                              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[140px]">{c.email}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* City / Area */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                              <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                              <span>{c.city || 'Indore'}</span>
                            </div>
                            {(c.area || c.route) && (
                              <div className="text-[11px] text-slate-500 font-medium">
                                {c.area || c.route}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* GSTIN */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            {c.gstin ? (
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                {c.gstin}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                Unregistered
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Account Balance */}
                        <td className="py-3 px-4 text-right">
                          <div className="space-y-0.5">
                            <div
                              className={`text-sm font-black font-mono ${
                                isReceivable 
                                  ? 'text-emerald-600 dark:text-emerald-400' 
                                  : isPayable 
                                  ? 'text-rose-600 dark:text-rose-400' 
                                  : 'text-slate-500'
                              }`}
                            >
                              ₹{Math.abs(c.balance || 0).toLocaleString('en-IN')}
                            </div>
                            <div className="text-[10px] font-extrabold uppercase">
                              {isReceivable ? (
                                <span className="text-emerald-600 dark:text-emerald-400">Dr (Receivable)</span>
                              ) : isPayable ? (
                                <span className="text-rose-600 dark:text-rose-400">Cr (Payable)</span>
                              ) : (
                                <span className="text-slate-400">Balanced (₹0)</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          {c.active !== false ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                              <XCircle className="h-3 w-3 text-slate-400" />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Actions: Edit & Delete */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEditModal(c)}
                              className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 transition cursor-pointer"
                              title="Edit Party Master"
                            >
                              <Edit className="h-4 w-4" />
                            </button>

                            {/* Delete Button */}
                            {onDeleteCustomer && (
                              <button
                                onClick={() => handleDeleteClick(c)}
                                className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                                title="Delete Party"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
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
      ) : (
        /* Grid View Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((c) => {
            const isReceivable = c.balance > 0;
            const isPayable = c.balance < 0;

            return (
              <div 
                key={c.id} 
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                        {c.name}
                      </h3>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {c.address || c.city}, {c.state || 'Indore'}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                        c.type === 'Customer'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {c.type}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2 font-mono">
                      <Shield className="h-4 w-4 text-emerald-500" />
                      <span>GSTIN:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {c.gstin || 'Unregistered'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{c.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Balance</div>
                    <div
                      className={`text-base font-black font-mono ${
                        isReceivable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      ₹{Math.abs(c.balance || 0).toLocaleString('en-IN')}{' '}
                      <span className="text-xs font-bold">
                        {isReceivable ? '(Dr)' : isPayable ? '(Cr)' : '(0)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(c)}
                      className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {onDeleteCustomer && (
                      <button
                        onClick={() => handleDeleteClick(c)}
                        className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold text-xs"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-Over Drawer / Modal for Add & Edit Party */}
      <AddEditVendorModal
        isOpen={isModalOpen}
        customerToEdit={editingCustomer}
        defaultType="Customer"
        onClose={() => {
          setIsModalOpen(false);
          setEditingCustomer(null);
        }}
        onSave={handleSaveCustomer}
      />

    </div>
  );
};
