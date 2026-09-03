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
  const [active, setActive] = useState(true);
  const [dueDays, setDueDays] = useState<number | ''>(7);

  // ERP Login Credentials State
  const [loginPassword, setLoginPassword] = useState('cust123');
  const [portalAccessEnabled, setPortalAccessEnabled] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
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

  // Limits & Numbers
  const [otherMobileNo, setOtherMobileNo] = useState('');
  const [partyLimit, setPartyLimit] = useState<number | ''>(0);
  const [interestRate, setInterestRate] = useState<number | ''>(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState<number | ''>(0);
  const [joiningDate, setJoiningDate] = useState(getTodayDateString());

  useEffect(() => {
    const today = getTodayDateString();
    if (customerToEdit) {
      setPartyCategory(customerToEdit.type || defaultType);
      setPartyName(customerToEdit.name || '');
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
      setPinCode(customerToEdit.pincode || '');
      setGstin(customerToEdit.gstin || '');
      setGstApplicable(customerToEdit.gstApplicable || 'GST');
      setStateName(customerToEdit.state || 'Madhya Pradesh');
      setEmailAddress(customerToEdit.email || '');
      setLoginPassword(customerToEdit.password || 'cust123');
      setPortalAccessEnabled(customerToEdit.portalAccessEnabled !== false);
      setPartyType(customerToEdit.partyType || (customerToEdit.type === 'Vendor' ? 'vendor' : 'customer'));
      setOtherMobileNo(customerToEdit.otherMobile || '');
      setPartyLimit(customerToEdit.creditLimit !== undefined ? customerToEdit.creditLimit : 0);
      setInterestRate(customerToEdit.interestRate !== undefined ? customerToEdit.interestRate : 0);
      setLoyaltyPoints(customerToEdit.loyaltyPoints !== undefined ? customerToEdit.loyaltyPoints : 0);
      setJoiningDate(customerToEdit.joiningDate || today);
      setDepositFeePerCylinder(customerToEdit.depositFeePerCylinder !== undefined ? customerToEdit.depositFeePerCylinder : 2000);
      setTotalDepositAmount(customerToEdit.totalDepositAmount !== undefined ? customerToEdit.totalDepositAmount : 2000);
      setDepositStatus(customerToEdit.depositStatus || 'Paid');
      setSvVoucherNo(customerToEdit.svVoucherNo || `SV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    } else {
      setPartyCategory(defaultType);
      setPartyName('');
      setTradeName('');
      setContactPerson('');
      setStatus('ACTIVE');
      setActive(true);
      setDueDays(7);
      setMobileNumber('');
      setWhatsappNumber('');
      setCity('Indore');
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
      setPinCode('452001');
      setGstin('');
      setGstApplicable('GST');
      setStateName('Madhya Pradesh');
      setEmailAddress('');
      setLoginPassword('cust123');
      setPortalAccessEnabled(true);
      setPartyType(defaultType === 'Vendor' ? 'vendor' : 'customer');
      setOtherMobileNo('');
      setPartyLimit(0);
      setInterestRate(0);
      setLoyaltyPoints(0);
      setJoiningDate(today);
      setDepositFeePerCylinder(2000);
      setTotalDepositAmount(2000);
      setDepositStatus('Paid');
      setSvVoucherNo(`SV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
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

    const savedCustomer: Customer = {
      id: customerToEdit?.id || `party-${Date.now()}`,
      name: partyName.trim(),
      tradeName: tradeName.trim() || undefined,
      contactPerson: contactPerson.trim() || undefined,
      status,
      phone: mobileNumber.trim() || '+91 98260 00000',
      whatsappNumber: whatsappNumber.trim() || mobileNumber.trim() || '+91 98260 00000',
      email: emailAddress.trim() || 'party@domain.com',
      password: loginPassword.trim() || 'cust123',
      portalAccessEnabled,
      gstin: gstin.trim().toUpperCase() || undefined,
      address: address.trim() || 'Main Commercial Area',
      city: city.trim() || 'Indore',
      area: areaName.trim() || undefined,
      route: routeName.trim() || undefined,
      defaultDeliveryBoyId: defaultDeliveryBoyId || undefined,
      openingEmptyCylinderQty: Number(openingEmptyQty) || 0,
      internalNotes: internalNotes.trim() || undefined,
      state: stateName.trim() || 'Madhya Pradesh',
      stateCode: '23',
      balance: 0,
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
      loyaltyPoints: Number(loyaltyPoints) || 0,
      joiningDate,
      depositFeePerCylinder: Number(depositFeePerCylinder) || 0,
      totalDepositAmount: Number(totalDepositAmount) || 0,
      depositStatus,
      svVoucherNo: svVoucherNo.trim() || undefined,
    };

    onSave(savedCustomer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-end overflow-hidden animate-in fade-in duration-200">
      
      {/* Right Slide-Over Drawer Container */}
      <div className="w-full max-w-4xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 border-l border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200">
        
        {/* Drawer Top Header Bar */}
        <div className="bg-[#00a8b5] px-6 py-4 flex items-center justify-between text-white shadow-md shrink-0">
          <h2 className="text-lg font-extrabold tracking-wide flex items-center gap-2">
            <span>Party Master</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/20 uppercase">
              {partyCategory === 'Vendor' ? 'Vendor / Supplier' : 'Customer / Buyer'}
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
          


          {/* Row 1: Party Name, Active Toggle, Due Days */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            
            {/* Party Name & Active Toggle */}
            <div className="md:col-span-9 space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 dark:text-slate-100">
                  {partyCategory === 'Vendor' ? 'Vendor / Party Name' : 'Customer Name'}
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
                  <span className="font-extrabold text-slate-900 dark:text-slate-100">Active</span>
                </div>
              </div>

              <input
                type="text"
                required
                placeholder="Enter Name"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400 font-bold"
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

          {/* Row 2: Mobile Number & City */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Mobile Number</label>
              <input
                type="text"
                placeholder="Hint - Better to use WhatsApp Number"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">City</label>
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

          {/* Row 3: Party Tags */}
          <div className="space-y-1">
            <label className="font-bold text-slate-900 dark:text-slate-100 block">Party Tags</label>
            <div className="relative">
              <select
                value={partyTags}
                onChange={(e) => setPartyTags(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 appearance-none focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer font-bold"
              >
                <option value="">-- Select Party Tag --</option>
                <option value="COMMERCIAL">COMMERCIAL (Hotel / Restaurant / Factory)</option>
                <option value="VIP">VIP Priority Client</option>
                <option value="REGULAR">REGULAR B2B Customer</option>
                <option value="DISTRIBUTOR">DISTRIBUTOR / Sub-Dealer</option>
                <option value="CREDIT_HOLD">CREDIT HOLD / Payment Pending</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>



          {/* Row 5: Address */}
          <div className="space-y-1">
            <label className="font-bold text-slate-900 dark:text-slate-100 block">Address</label>
            <input
              type="text"
              placeholder="Enter Full Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
            />
          </div>

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

          {/* ERP CUSTOMER PORTAL LOGIN CREDENTIALS & SECURITY */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3 shadow-lg my-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" />
                <h4 className="font-extrabold text-sm text-slate-100">
                  Customer ERP Login Credentials & Portal Access
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-slate-400 cursor-pointer">Enable Portal Login:</label>
                <input
                  type="checkbox"
                  checked={portalAccessEnabled}
                  onChange={(e) => setPortalAccessEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>Customer Login Email Address</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. customer@deskshark.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Portal Login Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Set Login Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 font-mono font-black focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Row 8: Other Mobile No, Party Limit, Interest Rate/Month, Loyalty Points */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">Loyalty Points</label>
              <input
                type="number"
                value={loyaltyPoints}
                onChange={(e) => setLoyaltyPoints(e.target.value === '' ? '' : Number(e.target.value))}
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
