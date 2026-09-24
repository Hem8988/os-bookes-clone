'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Image as ImageIcon, Calendar, ChevronDown, Plus, Trash2, Lock, Eye, EyeOff, Shield, Mail } from 'lucide-react';
import { Customer, Product, PartyRate } from '../lib/types';

interface AddEditVendorModalProps {
  isOpen: boolean;
  customerToEdit?: Customer | null;
  defaultType?: 'Vendor' | 'Customer';
  products?: Product[];
  onClose: () => void;
  onSave: (customer: Customer) => void;
}

export const AddEditVendorModal: React.FC<AddEditVendorModalProps> = ({
  isOpen,
  customerToEdit,
  defaultType = 'Vendor',
  products = [],
  onClose,
  onSave,
}) => {
  // Party Category: Vendor (Supplier) vs Customer (Buyer)
  const [partyCategory, setPartyCategory] = useState<'Vendor' | 'Customer'>(defaultType);

  // Form State matching OS-BOOKS Party Master Screenshot exactly
  const [partyName, setPartyName] = useState('');
  const [shortName, setShortName] = useState('');
  const [active, setActive] = useState(true);
  const [dueDays, setDueDays] = useState<number | ''>(7);

  // ERP Login Credentials State
  const [mobileNumber, setMobileNumber] = useState('');
  const [city, setCity] = useState('');
  const [partyTags, setPartyTags] = useState('');
  
  // 4 Toggle Switches
  const [isMoreInfo, setIsMoreInfo] = useState(true);
  const [isWholeParty, setIsWholeParty] = useState(false);
  const [isSezParty, setIsSezParty] = useState(true);
  const [isFocParty, setIsFocParty] = useState(true);
  const [isShowPartyRate, setIsShowPartyRate] = useState(true);

  // Item-wise / Company-wise Party Rate Table
  const [rateMode, setRateMode] = useState<'item' | 'company'>('item');
  const [partyRates, setPartyRates] = useState<PartyRate[]>([]);

  // Address & GST Details
  const [address, setAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryContactPerson, setDeliveryContactPerson] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryPincode, setDeliveryPincode] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [gstApplicable, setGstApplicable] = useState('GST');

  // State, Email, Party Type
  const [stateName, setStateName] = useState('Telangana');
  const [emailAddress, setEmailAddress] = useState('');
  const [partyType, setPartyType] = useState(defaultType === 'Vendor' ? 'vendor' : 'customer');

  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  // Additional B2B LPG Cylinder ERP Foundation Fields
  const [tradeName, setTradeName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'BLOCKED'>('ACTIVE');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [areaName, setAreaName] = useState('');
  const [routeName, setRouteName] = useState('');
  const [defaultDeliveryBoyId, setDefaultDeliveryBoyId] = useState('');
  const [openingEmptyQty, setOpeningEmptyQty] = useState<number | ''>(0);
  const [internalNotes, setInternalNotes] = useState('');

  // Cylinder Security Deposit & SV Voucher State
  const [depositFeePerCylinder, setDepositFeePerCylinder] = useState<number | ''>(2000);
  const [totalDepositAmount, setTotalDepositAmount] = useState<number | ''>(2000);
  const [depositStatus, setDepositStatus] = useState<'Paid' | 'Refunded' | 'Adjusted'>('Paid');
  const [svVoucherNo, setSvVoucherNo] = useState('');

  // Opening Balance State
  const [openingBalance, setOpeningBalance] = useState<number | ''>(0);
  const [openingBalanceType, setOpeningBalanceType] = useState<'Dr' | 'Cr'>('Dr');

  // Staff Assignments (Delivery Boy & Relationship Manager)
  const [defaultDeliveryBoyName, setDefaultDeliveryBoyName] = useState('');
  const [deliveryBoys, setDeliveryBoys] = useState<{ id: string; name: string; mobile: string | null }[]>([]);

  // Limits & Numbers
  const [otherMobileNo, setOtherMobileNo] = useState('');
  const [partyLimit, setPartyLimit] = useState<number | ''>(0);
  const [interestRate, setInterestRate] = useState<number | ''>(0);
  const [joiningDate, setJoiningDate] = useState(getTodayDateString());

  // Customer Authorized / Assigned LPG Cylinder Products
  const [assignedCylinderTypes, setAssignedCylinderTypes] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/users/roles?role=DELIVERY_BOY')
      .then((r) => r.json())
      .then((j) => setDeliveryBoys(j.data || []))
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    const today = getTodayDateString();
    if (customerToEdit) {
      setAssignedCylinderTypes(
        customerToEdit.defaultProductIds?.length
          ? customerToEdit.defaultProductIds
          : customerToEdit.assignedCylinderTypes || []
      );
      setPartyCategory(customerToEdit.type || defaultType);
      setPartyName(customerToEdit.name || '');
      setShortName(customerToEdit.shortName || '');
      setTradeName(customerToEdit.tradeName || '');
      setContactPerson(customerToEdit.contactPerson || '');
      setStatus(customerToEdit.status || (customerToEdit.active === false ? 'INACTIVE' : 'ACTIVE'));
      setActive(customerToEdit.active !== undefined ? customerToEdit.active : true);
      setDueDays(customerToEdit.dueDays !== undefined ? customerToEdit.dueDays : 7);
      setMobileNumber(customerToEdit.phone || '');
      setWhatsappNumber(customerToEdit.whatsappNumber || customerToEdit.phone || '');
      setCity(customerToEdit.city || '');
      setAreaName(customerToEdit.area || '');
      setRouteName(customerToEdit.route || '');
      setDefaultDeliveryBoyId(customerToEdit.defaultDeliveryBoyId || '');
      setDefaultDeliveryBoyName(customerToEdit.defaultDeliveryBoyName || '');
      setOpeningEmptyQty(customerToEdit.openingEmptyCylinderQty || 0);
      setInternalNotes(customerToEdit.internalNotes || '');
      setPartyTags(Array.isArray(customerToEdit.tags) ? customerToEdit.tags.join(', ') : String(customerToEdit.tags || ''));
      setIsMoreInfo(customerToEdit.isMoreInfo !== undefined ? customerToEdit.isMoreInfo : true);
      setIsWholeParty(customerToEdit.isWholeParty || false);
      setIsSezParty(customerToEdit.isSezParty !== undefined ? customerToEdit.isSezParty : true);
      setIsFocParty(customerToEdit.isFocParty !== undefined ? customerToEdit.isFocParty : true);
      setIsShowPartyRate(customerToEdit.isShowPartyRate !== undefined ? customerToEdit.isShowPartyRate : true);
      setRateMode(customerToEdit.rateMode || 'item');
      setPartyRates(Array.isArray(customerToEdit.partyRates) ? customerToEdit.partyRates : []);
      setAddress(customerToEdit.address || '');
      const defaultDel = Array.isArray(customerToEdit.deliveryAddresses) && customerToEdit.deliveryAddresses.length > 0 ? customerToEdit.deliveryAddresses[0] : null;
      setDeliveryAddress(defaultDel?.address || '');
      setDeliveryContactPerson(defaultDel?.contactPerson || '');
      setDeliveryPhone(defaultDel?.phone || '');
      setDeliveryCity(defaultDel?.city || '');
      setDeliveryPincode(defaultDel?.pincode || '');
      setPinCode(customerToEdit.pincode || '');
      setGstin(customerToEdit.gstin || '');
      setGstApplicable(customerToEdit.gstApplicable || 'GST');
      setStateName(customerToEdit.state || '');
      setEmailAddress(customerToEdit.email || '');
      setPartyType(customerToEdit.partyType || (customerToEdit.type === 'Vendor' ? 'vendor' : 'customer'));
      setOtherMobileNo(customerToEdit.otherMobile || '');
      setPartyLimit(customerToEdit.creditLimit !== undefined ? customerToEdit.creditLimit : 0);
      setInterestRate(customerToEdit.interestRate !== undefined ? customerToEdit.interestRate : 0);
      setJoiningDate(customerToEdit.joiningDate || today);
      setDepositFeePerCylinder(customerToEdit.depositFeePerCylinder !== undefined ? customerToEdit.depositFeePerCylinder : 2000);
      setTotalDepositAmount(customerToEdit.totalDepositAmount !== undefined ? customerToEdit.totalDepositAmount : 2000);
      setDepositStatus(customerToEdit.depositStatus || 'Paid');
      setSvVoucherNo(customerToEdit.svVoucherNo || `SV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      
      const initOpBal = customerToEdit.openingBalance !== undefined ? customerToEdit.openingBalance : Math.abs(customerToEdit.balance || 0);
      const initOpType = customerToEdit.openingBalanceType || ((customerToEdit.balance || 0) < 0 ? 'Cr' : 'Dr');
      setOpeningBalance(initOpBal);
      setOpeningBalanceType(initOpType);
    } else {
      setPartyCategory(defaultType);
      setPartyName('');
      setShortName('');
      setTradeName('');
      setContactPerson('');
      setStatus('ACTIVE');
      setActive(true);
      setDueDays(7);
      setMobileNumber('');
      setWhatsappNumber('');
      setCity('');
      setAreaName('');
      setRouteName('');
      setDefaultDeliveryBoyId('');
      setOpeningEmptyQty(0);
      setInternalNotes('');
      setPartyTags('');
      setIsMoreInfo(true);
      setIsWholeParty(false);
      setIsSezParty(true);
      setIsFocParty(true);
      setIsShowPartyRate(true);
      setRateMode('item');
      setPartyRates([]);
      setAddress('');
      setDeliveryAddress('');
      setDeliveryContactPerson('');
      setDeliveryPhone('');
      setDeliveryCity('');
      setDeliveryPincode('');
      setPinCode('452001');
      setGstin('');
      setGstApplicable('GST');
      setStateName('');
      setEmailAddress('');
      setPartyType(defaultType === 'Vendor' ? 'vendor' : 'customer');
      setOtherMobileNo('');
      setPartyLimit(0);
      setInterestRate(0);
      setJoiningDate(today);
      setDepositFeePerCylinder(2000);
      setTotalDepositAmount(2000);
      setDepositStatus('Paid');
      setSvVoucherNo(`SV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      setOpeningBalance(0);
      setOpeningBalanceType(defaultType === 'Vendor' ? 'Cr' : 'Dr');
      setDefaultDeliveryBoyId('');
      setDefaultDeliveryBoyName('');
    }
  }, [customerToEdit, defaultType, isOpen]);

  if (!isOpen) return null;

  const handleAddRateRow = () => {
    setPartyRates([...partyRates, { productId: '', productName: '', price: 0 }]);
  };

  const handleRateRowChange = (index: number, field: 'productId' | 'price', value: string) => {
    const safeProducts = Array.isArray(products) ? products : [];
    setPartyRates((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row;
        if (field === 'productId') {
          const selected = safeProducts.find((p) => p.id === value);
          return { ...row, productId: value, productName: selected?.name || '' };
        }
        return { ...row, price: value === '' ? 0 : Number(value) };
      })
    );
  };

  const handleRemoveRateRow = (index: number) => {
    setPartyRates((rows) => rows.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) {
      alert('Please enter Party Name');
      return;
    }

    const numericOpBal = Number(openingBalance) || 0;
    const finalBalance = openingBalanceType === 'Cr' ? -Math.abs(numericOpBal) : Math.abs(numericOpBal);

    const savedCustomer: Customer = {
      id: customerToEdit?.id || `party-${Date.now()}`,
      name: partyName.trim(),
      shortName: shortName.trim() || undefined,
      tradeName: tradeName.trim() || undefined,
      contactPerson: contactPerson.trim() || undefined,
      status,
      phone: mobileNumber.trim(),
      whatsappNumber: whatsappNumber.trim() || mobileNumber.trim(),
      email: emailAddress.trim(),
      gstin: gstin.trim().toUpperCase() || undefined,
      address: address.trim(),
      deliveryAddresses: deliveryAddress.trim() || deliveryContactPerson.trim() || deliveryPhone.trim() ? [{ 
        label: 'Delivery Address', 
        address: deliveryAddress.trim(),
        contactPerson: deliveryContactPerson.trim() || undefined,
        phone: deliveryPhone.trim() || undefined,
        city: deliveryCity.trim() || undefined,
        pincode: deliveryPincode.trim() || undefined
      }] : [],
      city: city.trim(),
      area: areaName.trim() || undefined,
      route: routeName.trim() || undefined,
      defaultDeliveryBoyId: defaultDeliveryBoyId || undefined,
      defaultDeliveryBoyName: defaultDeliveryBoyName || undefined,
      openingEmptyCylinderQty: Number(openingEmptyQty) || 0,
      internalNotes: internalNotes.trim() || undefined,
      state: stateName.trim(),
      stateCode: '23',
      balance: finalBalance,
      openingBalance: numericOpBal,
      openingBalanceType,
      creditLimit: Number(partyLimit) || 0,
      creditDays: Number(dueDays) || 7,
      type: partyCategory,
      accountGroup: partyCategory === 'Vendor' ? 'Sundry Creditors' : 'Sundry Debtors',
      active: status === 'ACTIVE',
      dueDays: Number(dueDays) || 7,
      tags: partyTags ? partyTags.split(',').map((t) => t.trim()) : [],
      isMoreInfo,
      isWholeParty,
      isSezParty,
      isFocParty,
      isShowPartyRate,
      rateMode,
      partyRates: partyRates.filter((r) => r.productId),
      pincode: pinCode,
      gstApplicable,
      partyType,
      otherMobile: otherMobileNo,
      interestRate: Number(interestRate) || 0,
      joiningDate,
      depositFeePerCylinder: Number(depositFeePerCylinder) || 0,
      totalDepositAmount: Number(totalDepositAmount) || 0,
      depositStatus,
      svVoucherNo: svVoucherNo.trim() || undefined,
      assignedCylinderTypes,
      // Drives the WhatsApp quick-order menu (SRS §5.2 Default Product(s)).
      defaultProductIds: assignedCylinderTypes.filter((id) => products.some((p) => p.id === id)),
    };

    onSave(savedCustomer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-end overflow-hidden animate-in fade-in duration-200">
      
      {/* Right Slide-Over Drawer Container */}
      <div className="w-full max-w-4xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
        
        {/* Drawer Top Header Bar */}
        <div className={`${partyCategory === 'Vendor' ? 'bg-gradient-to-r from-amber-600 to-amber-700' : 'bg-[#00a8b5]'} px-6 py-4 flex items-center justify-between text-white shadow-md shrink-0`}>
          <h2 className="text-lg font-extrabold tracking-wide flex items-center gap-2">
            <span>{partyCategory === 'Vendor' ? 'Vendor Master' : 'Party Master'}</span>
            <span className="text-xs font-black px-2.5 py-0.5 rounded bg-white/20 uppercase tracking-wider">
              {partyCategory === 'Vendor' ? 'VENDOR / SUPPLIER' : 'CUSTOMER / BUYER'}
            </span>
          </h2>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-white/90 hover:text-white transition-colors cursor-pointer"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 bg-[#dc3545] hover:bg-red-700 text-white rounded transition-colors cursor-pointer"
              title="Close"
            >
              <X className="h-5 w-5 font-extrabold" />
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs font-semibold text-slate-800 dark:text-slate-200">
          
          {/* Scrollable Form Body Container (Centered & Spacious) */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 max-w-5xl mx-auto w-full">
          


          {/* Card 1: Billing & Official Details */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                Billing & Official Details
              </h4>
            </div>

            {/* Row 1: Party Name, Active Toggle, Due Days */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-9 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 dark:text-slate-100">
                    {partyCategory === 'Vendor' ? 'Vendor / Supplier Legal Name *' : 'Customer Legal Name *'}
                  </label>
                  
                  {/* Active Toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActive(!active)}
                      className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        active ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-[10px]">Active</span>
                  </div>
                </div>

                <input
                  type="text"
                  required
                  placeholder={partyCategory === 'Vendor' ? 'e.g. Indian Oil Corporation' : 'e.g. Rbrands Asia Pvt Ltd'}
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400 font-bold text-sm"
                />
              </div>

              {/* Due Days */}
              <div className="md:col-span-3 space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Due Days</label>
                <input
                  type="number"
                  value={dueDays}
                  onChange={(e) => setDueDays(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Row 2: Billing Address */}
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Billing Address</label>
              <input
                type="text"
                placeholder="Enter Official Billing Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
              />
            </div>
            
            {/* Row 3: Mobile Number & City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Billing Mobile Number</label>
                <input
                  type="text"
                  placeholder="Official / Accounts Contact Number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Billing City</label>
                <div className="relative">
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 pr-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 appearance-none focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="">Select / Search City...</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Indore">Indore</option>
                    <option value="Bhopal">Bhopal</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Chennai">Chennai</option>
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none text-slate-400">
                    {city && <X className="h-3 w-3 cursor-pointer pointer-events-auto" onClick={() => setCity('')} />}
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Delivery & Local Details (Customers Only) */}
          {partyCategory === 'Customer' && (
            <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-800/50 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-teal-100 dark:border-teal-800/50 pb-2">
              <h4 className="font-extrabold text-sm text-teal-700 dark:text-teal-400">
                Delivery Location & Local Details
              </h4>
            </div>

            {/* Row 1: Short Name & Contact Person */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Shop / Short Name (Delivery App) *</label>
                <input
                  type="text"
                  placeholder="e.g. Burger King FC Road"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400 font-bold text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Delivery Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Manager"
                  value={deliveryContactPerson}
                  onChange={(e) => setDeliveryContactPerson(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400 font-bold text-sm"
                />
              </div>
            </div>

            {/* Row 2: Delivery Address */}
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Actual Delivery Address</label>
              <input
                type="text"
                placeholder="Enter exact shop/godown address for delivery boy"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
              />
            </div>

            {/* Row 3: Delivery Mobile & City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Delivery Mobile Number</label>
                <input
                  type="text"
                  placeholder="Manager / Shop Phone Number"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Delivery City</label>
                <div className="relative">
                  <select
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    className="w-full px-3 py-2 pr-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 appearance-none focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="">Select / Search City...</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Indore">Indore</option>
                    <option value="Bhopal">Bhopal</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Chennai">Chennai</option>
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none text-slate-400">
                    {deliveryCity && <X className="h-3 w-3 cursor-pointer pointer-events-auto" onClick={() => setDeliveryCity('')} />}
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Row 6: Pin Code, Gstin, Gst Applicable */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Pin Code</label>
              <input
                type="text"
                placeholder="Enter Pin Code"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Gstin</label>
              <input
                type="text"
                placeholder="Enter Gst Number"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Gst Applicable</label>
              <div className="relative">
                <select
                  value={gstApplicable}
                  onChange={(e) => setGstApplicable(e.target.value)}
                  className="w-full px-3 py-2 pr-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 appearance-none focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="GST">GST</option>
                  <option value="IGST">IGST</option>
                  <option value="EXEMPTED">EXEMPTED</option>
                  <option value="NON-GST">NON-GST</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 7: State, Email Address, Party Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">State</label>
              <div className="relative">
                <select
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full px-3 py-2 pr-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 appearance-none focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="Telangana">Telangana</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Karnataka">Karnataka</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none text-slate-400">
                  <X className="h-3 w-3 cursor-pointer pointer-events-auto" onClick={() => setStateName('')} />
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Email Address</label>
              <input
                type="email"
                placeholder="Enter Email Address"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Party Type</label>
              <div className="relative">
                <select
                  value={partyType}
                  onChange={(e) => setPartyType(e.target.value)}
                  className="w-full px-3 py-2 pr-8 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 appearance-none focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer font-medium"
                >
                  {partyCategory === 'Vendor' ? (
                    <option value="vendor">vendor (Supplier)</option>
                  ) : (
                    <option value="customer">customer (Buyer)</option>
                  )}
                  <option value="company">company</option>
                  <option value="individual">individual</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* STAFF & FLEET ASSIGNMENTS CARD */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-slate-800/80 border border-amber-200 dark:border-amber-900/60 space-y-3 shadow-sm my-2">
            <div className="flex items-center justify-between border-b border-amber-100 dark:border-slate-700 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 font-extrabold text-sm">
                  🚚
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Staff & Fleet Assignments (Delivery Boy & Relationship Manager)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    Assign dedicated Delivery Boy for automatic dispatch and Relationship Manager for B2B key account handling
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Staff Mapping
              </span>
            </div>

            <div className="space-y-1 pt-1 max-w-md">
              <label className="font-extrabold text-slate-900 dark:text-slate-100 block">Default delivery boy</label>
              <select
                value={defaultDeliveryBoyId}
                onChange={(e) => {
                  setDefaultDeliveryBoyId(e.target.value);
                  setDefaultDeliveryBoyName(deliveryBoys.find((b) => b.id === e.target.value)?.name || '');
                }}
                className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">— Route default —</option>
                {deliveryBoys.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}{b.mobile ? ` (${b.mobile})` : ''}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">Approved orders are auto-assigned to this delivery boy.</p>
            </div>
          </div>

          {/* AUTHORIZED / ASSIGNED LPG CYLINDER PRODUCTS CARD */}
          {partyCategory === 'Customer' && (
            <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-slate-800/90 border border-emerald-200 dark:border-emerald-900/60 space-y-3 shadow-sm my-2">
              <div className="flex items-center justify-between border-b border-emerald-100 dark:border-slate-700 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-extrabold text-sm">
                    📦
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      Authorized / Assigned LPG Cylinder Products
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                      Select which cylinder sizes this customer is authorized to order in Customer Portal
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Portal Products
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {(() => {
                  const cylinderProductsOnly = (Array.isArray(products) ? products : []).filter(p => {
                    const nameLower = (p.name || '').toLowerCase();
                    const catLower = (p.category || '').toLowerCase();
                    return (
                      nameLower.includes('cylinder') ||
                      nameLower.includes('kg') ||
                      nameLower.includes('lpg') ||
                      catLower.includes('cylinder') ||
                      catLower.includes('lpg') ||
                      catLower.includes('gas')
                    );
                  });

                  const masterList = cylinderProductsOnly;

                  return masterList.map((prod) => {
                    const isChecked = assignedCylinderTypes.includes(prod.id) || assignedCylinderTypes.includes(prod.name);
                    const displayName = `${prod.name} (₹${(prod.salePrice || 0).toLocaleString('en-IN')})`;

                    return (
                      <label key={prod.id} className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${isChecked ? 'bg-white border-emerald-500 shadow-sm text-emerald-950 font-extrabold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignedCylinderTypes([...assignedCylinderTypes, prod.id]);
                            } else {
                              setAssignedCylinderTypes(assignedCylinderTypes.filter(id => id !== prod.id && id !== prod.name));
                            }
                          }}
                          className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs">{displayName}</span>
                      </label>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* CYLINDER SECURITY DEPOSIT & SUBSCRIPTION VOUCHER (SV/TV) CARD */}
          <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-slate-800/90 border border-teal-200 dark:border-teal-900/60 space-y-3 shadow-sm my-2">
            <div className="flex items-center justify-between border-b border-teal-100 dark:border-slate-700 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-700 dark:text-teal-400 font-extrabold text-sm">
                  ₹
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Cylinder Security Deposit & Subscription Voucher (SV/TV)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    Manage Refundable Cylinder Body Security Fees & SV Voucher Reference
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                Refundable Security
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Security Fee / Cylinder (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 2000"
                  value={depositFeePerCylinder}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setDepositFeePerCylinder(val);
                    if (typeof val === 'number') {
                      setTotalDepositAmount(val * (Number(openingEmptyQty) || 1));
                    }
                  }}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 font-black focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Total Deposit Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 2000"
                  value={totalDepositAmount}
                  onChange={(e) => setTotalDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-black focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Deposit Status</label>
                <select
                  value={depositStatus}
                  onChange={(e) => setDepositStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="Paid">🟢 Paid (Active Deposit)</option>
                  <option value="Adjusted">🟡 Adjusted in Bill</option>
                  <option value="Refunded">🔴 Refunded to Customer</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">SV Voucher # (Subscription)</label>
                <input
                  type="text"
                  placeholder="e.g. SV-2026-0089"
                  value={svVoucherNo}
                  onChange={(e) => setSvVoucherNo(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-teal-500 uppercase"
                />
              </div>
            </div>
          </div>

          {/* ACCOUNT OPENING BALANCE SETUP CARD */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-3 shadow-sm my-2">
            <div className="flex items-center justify-between border-b border-indigo-100 dark:border-slate-700 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-extrabold text-sm">
                  ₹
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Account Opening Balance Setup
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                    Initial Outstanding / Advance Balance (Dr = Receivable / Purana Udhaar, Cr = Advance / Payable)
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                Opening Ledger Balance
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-900 dark:text-slate-100 block">
                  Opening Balance Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-black text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-900 dark:text-slate-100 block">
                  Balance Type (Debit / Credit)
                </label>
                <select
                  value={openingBalanceType}
                  onChange={(e) => setOpeningBalanceType(e.target.value as 'Dr' | 'Cr')}
                  className="w-full px-3 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Dr">Debit (Dr) - Customer Receivable / Purana Udhaar 🟢</option>
                  <option value="Cr">Credit (Cr) - Advance Received / Vendor Payable 🔴</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact email (invoices and statements are emailed here) */}
          <div className="space-y-1 max-w-md">
            <label className="font-bold text-slate-900 dark:text-slate-100 block">Email (for invoices)</label>
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <p className="text-[10px] text-slate-500">Customer portal logins are created in Admin → Users.</p>
          </div>

          {/* Row 8: Other Mobile No, Party Limit, Interest Rate/Month, Loyalty Points */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Other Mobile No</label>
              <input
                type="text"
                placeholder="Enter Other Mobile"
                value={otherMobileNo}
                onChange={(e) => setOtherMobileNo(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Party Limit</label>
              <input
                type="number"
                value={partyLimit}
                onChange={(e) => setPartyLimit(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Interest Rate/Month</label>
              <input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

          </div>

          {/* Row 9: Joining Date */}
          <div className="space-y-1 max-w-xs">
            <label className="font-bold text-slate-900 dark:text-slate-100 block">Joining Date</label>
            <div className="relative">
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              />
            </div>
          </div>



          </div>

          {/* Fixed Bottom Footer Action Bar */}
          <div className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3 shrink-0 shadow-md">
            
            {/* Submit Button (Green) */}
            <button
              type="submit"
              className="px-8 py-2.5 rounded-xl bg-[#28a745] hover:bg-emerald-600 text-white font-black text-xs shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>Submit</span>
            </button>

            {/* Close Button (Red) */}
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-2.5 rounded-xl bg-[#dc3545] hover:bg-red-700 text-white font-black text-xs shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              Close
            </button>

          </div>

        </form>

      </div>
    </div>
  );
};
