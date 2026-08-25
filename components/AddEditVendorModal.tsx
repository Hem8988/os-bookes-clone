'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Image as ImageIcon, Calendar, ChevronDown, Plus, Trash2 } from 'lucide-react';
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
      setPartyTags(customerToEdit.tags?.join(', ') || '');
      setIsMoreInfo(customerToEdit.isMoreInfo !== undefined ? customerToEdit.isMoreInfo : true);
      setIsWholeParty(customerToEdit.isWholeParty || false);
      setIsSezParty(customerToEdit.isSezParty !== undefined ? customerToEdit.isSezParty : true);
      setIsFocParty(customerToEdit.isFocParty !== undefined ? customerToEdit.isFocParty : true);
      setIsShowPartyRate(customerToEdit.isShowPartyRate !== undefined ? customerToEdit.isShowPartyRate : true);
      setRateMode(customerToEdit.rateMode || 'item');
      setPartyRates(customerToEdit.partyRates || []);
      setAddress(customerToEdit.address || '');
      setPinCode(customerToEdit.pincode || '');
      setGstin(customerToEdit.gstin || '');
      setGstApplicable(customerToEdit.gstApplicable || 'GST');
      setStateName(customerToEdit.state || 'Madhya Pradesh');
      setEmailAddress(customerToEdit.email || '');
      setPartyType(customerToEdit.partyType || (customerToEdit.type === 'Vendor' ? 'vendor' : 'customer'));
      setOtherMobileNo(customerToEdit.otherMobile || '');
      setPartyLimit(customerToEdit.creditLimit !== undefined ? customerToEdit.creditLimit : 0);
      setInterestRate(customerToEdit.interestRate !== undefined ? customerToEdit.interestRate : 0);
      setLoyaltyPoints(customerToEdit.loyaltyPoints !== undefined ? customerToEdit.loyaltyPoints : 0);
      setJoiningDate(customerToEdit.joiningDate || today);
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
      setPartyType(defaultType === 'Vendor' ? 'vendor' : 'customer');
      setOtherMobileNo('');
      setPartyLimit(0);
      setInterestRate(0);
      setLoyaltyPoints(0);
      setJoiningDate(today);
    }
  }, [customerToEdit, defaultType, isOpen]);

  if (!isOpen) return null;

  const handleAddRateRow = () => {
    setPartyRates([...partyRates, { productId: '', productName: '', price: 0 }]);
  };

  const handleRateRowChange = (index: number, field: 'productId' | 'price', value: string) => {
    setPartyRates((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row;
        if (field === 'productId') {
          const selected = products.find((p) => p.id === value);
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
    };

    onSave(savedCustomer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden my-4 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Bar matching OS-BOOKS Party Master Screenshot */}
        <div className="bg-[#00a8b5] px-5 py-3 flex items-center justify-between text-white shadow-sm">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
          
          {/* Party Category: locked to the master this modal was opened from */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 px-2 uppercase">
              Ledger Master Type:
            </span>
            <span className="flex-1 py-1.5 text-center text-xs font-black rounded shadow-sm bg-[#00a8b5] text-white">
              {partyCategory === 'Vendor'
                ? '🏭 Vendor Master (Supplier - Sundry Creditor)'
                : '👤 Customer Master (Buyer - Sundry Debtor)'}
            </span>
          </div>

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
              <input
                type="text"
                placeholder="Enter Tags"
                value={partyTags}
                onChange={(e) => setPartyTags(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
              />
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 4: Toggles Row (More Info, Whole Party, SEZ Party, FOC Party) */}
          <div className="py-2 flex items-center justify-around flex-wrap gap-4 border-y border-slate-100 dark:border-slate-800">
            
            {/* More Info */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMoreInfo(!isMoreInfo)}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isMoreInfo ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isMoreInfo ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">More Info</span>
            </div>

            {/* Whole Party */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setIsWholeParty(!isWholeParty)}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isWholeParty ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isWholeParty ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">Whole Party</span>
            </div>

            {/* SEZ Party */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setIsSezParty(!isSezParty)}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isSezParty ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isSezParty ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">SEZ Party</span>
            </div>

            {/* FOC Party */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setIsFocParty(!isFocParty)}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isFocParty ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isFocParty ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">FOC Party</span>
            </div>

            {/* Show Party Rate */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setIsShowPartyRate(!isShowPartyRate)}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isShowPartyRate ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isShowPartyRate ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200">Show Party Rate</span>
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

          {/* Party Rate: Item-wise / Company-wise Product Pricing */}
          {isShowPartyRate && (
            <div className="space-y-0">
              <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setRateMode('item')}
                  className={`px-4 py-2 text-xs font-black rounded-t-lg transition-all cursor-pointer ${
                    rateMode === 'item'
                      ? 'bg-white dark:bg-slate-900 text-[#00a8b5] border border-b-0 border-slate-200 dark:border-slate-700'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Item-wise
                </button>
                <button
                  type="button"
                  onClick={() => setRateMode('company')}
                  className={`px-4 py-2 text-xs font-black rounded-t-lg transition-all cursor-pointer ${
                    rateMode === 'company'
                      ? 'bg-white dark:bg-slate-900 text-[#00a8b5] border border-b-0 border-slate-200 dark:border-slate-700'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Company-wise
                </button>
              </div>

              <div className="rounded-b-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="px-3 py-2 w-14 text-center">S.NO #</th>
                      <th className="px-3 py-2">
                        {rateMode === 'item' ? 'Product Name' : 'Company Name'}
                      </th>
                      <th className="px-3 py-2 w-28">Price</th>
                      <th className="px-3 py-2 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {partyRates.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-slate-400 italic">
                          No rate rows added.
                        </td>
                      </tr>
                    ) : (
                      partyRates.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-1.5 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-1.5">
                            <select
                              value={row.productId}
                              onChange={(e) => handleRateRowChange(idx, 'productId', e.target.value)}
                              className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                            >
                              <option value="">select</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              value={row.price}
                              onChange={(e) => handleRateRowChange(idx, 'price', e.target.value)}
                              className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRateRow(idx)}
                              className="p-1.5 rounded bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer"
                              title="Remove Row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="p-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleAddRateRow}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Row
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Action Buttons matching OS-BOOKS Party Master Screenshot */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-800/60 -mx-6 -mb-6 p-4">
            
            {/* Image Icon Button */}
            <button
              type="button"
              className="p-2.5 rounded bg-slate-600 hover:bg-slate-700 text-white transition-colors cursor-pointer"
              title="Party Attachments / Image"
            >
              <ImageIcon className="h-4 w-4" />
            </button>

            {/* Submit Button (Green) */}
            <button
              type="submit"
              className="px-6 py-2 rounded bg-[#28a745] hover:bg-emerald-700 text-white font-extrabold text-xs shadow transition-colors cursor-pointer"
            >
              Submit
            </button>

            {/* Close Button (Red) */}
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded bg-[#dc3545] hover:bg-red-700 text-white font-extrabold text-xs shadow transition-colors cursor-pointer"
            >
              Close
            </button>

          </div>

        </form>

      </div>
    </div>
  );
};
