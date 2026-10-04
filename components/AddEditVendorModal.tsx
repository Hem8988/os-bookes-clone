'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Image as ImageIcon, Calendar, ChevronDown, Plus, Trash2, Lock, Eye, EyeOff, Shield, Mail, Languages, Loader2 } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { Customer, Product, PartyRate } from '../lib/types';
import { CUSTOMER_SEGMENTS, PAYMENT_TERMS } from '../lib/settings';
import { CityInput, PinInput, StateSelect, stateCodeOf } from './PlaceFields';
import { AddableSelect } from './AddableSelect';
import { Combobox } from './Combobox';

interface AddEditVendorModalProps {
  isOpen: boolean;
  customerToEdit?: Customer | null;
  defaultType?: 'Vendor' | 'Customer';
  products?: Product[];
  onClose: () => void;
  onSave: (customer: Customer) => void;
}

/** Placeholder id for a new party until the server gives it one. */
const tempPartyId = () => `party-${Date.now()}`;

/** Create an area / route from just a name; its code is made from the name. */
async function saveMaster<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const base = String(body.name).toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 12) || 'NEW';
  for (let n = 0; n < 20; n++) {
    const code = n ? `${base.slice(0, 10)}${n + 1}` : base;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ ...body, code }) });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success !== false) return json.data as T;
    if (res.status !== 409 || !/code/i.test(json.error || '')) throw new Error(json.error || 'Could not save.');
  }
  throw new Error('Could not pick a free code — add it from Masters instead.');
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

  // Party master form state
  const [partyName, setPartyName] = useState('');
  const [shortName, setShortName] = useState('');
  // English text kept while the short name shows its Hindi spelling, so the button can switch back.
  const [shortNameEnglish, setShortNameEnglish] = useState<string | null>(null);
  const [hindiBusy, setHindiBusy] = useState(false);
  const [hindiError, setHindiError] = useState('');
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
  const [stateName, setStateName] = useState('');
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
  const [depositQty, setDepositQty] = useState<number | ''>(1);
  // Deposit per cylinder type: productId → rate and number of cylinders.
  type DepositStatus = 'Pending' | 'Paid' | 'Refunded' | 'Adjusted' | 'Free';
  const [depositLines, setDepositLines] = useState<Record<string, { fee: number | ''; qty: number | ''; status?: DepositStatus; voucherNo?: string }>>({});
  const [depositStatus, setDepositStatus] = useState<DepositStatus>('Pending');
  const [svVoucherNo, setSvVoucherNo] = useState('');

  // Opening Balance State
  const [openingBalance, setOpeningBalance] = useState<number | ''>(0);
  const [openingBalanceType, setOpeningBalanceType] = useState<'Dr' | 'Cr'>('Dr');

  // Staff Assignments (Delivery Boy & Relationship Manager)
  const [defaultDeliveryBoyName, setDefaultDeliveryBoyName] = useState('');
  const [deliveryBoys, setDeliveryBoys] = useState<{ id: string; name: string; mobile: string | null }[]>([]);
  const [areas, setAreas] = useState<{ id: string; name: string; route: { name: string } | null }[]>([]);
  const [routes, setRoutes] = useState<{ id: string; name: string; defaultDeliveryBoyId: string | null }[]>([]);
  const [paymentTerms, setPaymentTerms] = useState('COD');
  const [segment, setSegment] = useState('');

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
    fetch('/api/areas').then((r) => r.json()).then((j) => setAreas(j.data || [])).catch(() => {});
    fetch('/api/routes').then((r) => r.json()).then((j) => setRoutes(j.data || [])).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    const today = getTodayDateString();
    if (customerToEdit) {
      // Show exactly what is saved: old entries kept as product names are turned into ids,
      // and ids of products that no longer exist are dropped.
      setAssignedCylinderTypes(
        [...new Set(
          (customerToEdit.defaultProductIds?.length ? customerToEdit.defaultProductIds : customerToEdit.assignedCylinderTypes || [])
            // (until the product list has loaded, keep the saved values as they are)
            .map((v) => (products.length ? products.find((p) => p.id === v || p.name === v)?.id : v))
            .filter((id): id is string => !!id)
        )]
      );
      setPartyCategory(customerToEdit.type || defaultType);
      setPartyName(customerToEdit.name || '');
      setShortName(customerToEdit.shortName || '');
      setShortNameEnglish(null);
      setHindiError('');
      setTradeName(customerToEdit.tradeName || '');
      setContactPerson(customerToEdit.contactPerson || '');
      setStatus(customerToEdit.status || (customerToEdit.active === false ? 'INACTIVE' : 'ACTIVE'));
      setActive(customerToEdit.active !== undefined ? customerToEdit.active : true);
      setDueDays(customerToEdit.dueDays !== undefined ? customerToEdit.dueDays : 7);
      setMobileNumber(customerToEdit.phone || '');
      setWhatsappNumber(customerToEdit.whatsappNumber || customerToEdit.phone || '');
      setCity(customerToEdit.city || '');
      setAreaName(customerToEdit.area || '');
      setPaymentTerms(customerToEdit.paymentTerms || 'COD');
      setSegment(customerToEdit.segment || '');
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
      // Older customers have no count saved: work it out from total ÷ fee when that divides evenly.
      {
        const fee = Number(customerToEdit.depositFeePerCylinder) || 0;
        const total = Number(customerToEdit.totalDepositAmount) || 0;
        const qty = customerToEdit.depositCylinderQty ?? (fee > 0 && total > 0 && Number.isInteger(total / fee) ? total / fee : 1);
        setDepositQty(qty);
        // Saved per-type lines; older customers had one rate and count, shown on their first cylinder type.
        const saved = customerToEdit.depositLines;
        const first = (customerToEdit.defaultProductIds || [])[0];
        const oldStatus = customerToEdit.depositStatus || (total ? 'Paid' : 'Pending');
        setDepositLines(saved?.length ? Object.fromEntries(saved.map((l) => [l.productId, { fee: l.fee, qty: l.qty, status: l.status || oldStatus, voucherNo: l.voucherNo ?? (l.productId === first ? customerToEdit.svVoucherNo : undefined) }])) : first && total > 0 ? { [first]: { fee, qty, status: oldStatus, voucherNo: customerToEdit.svVoucherNo } } : {});
      }
      setDepositStatus(customerToEdit.depositStatus || (customerToEdit.totalDepositAmount ? 'Paid' : 'Pending'));
      setSvVoucherNo(customerToEdit.svVoucherNo || `SV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      
      const initOpBal = customerToEdit.openingBalance !== undefined ? customerToEdit.openingBalance : Math.abs(customerToEdit.balance || 0);
      const initOpType = customerToEdit.openingBalanceType || ((customerToEdit.balance || 0) < 0 ? 'Cr' : 'Dr');
      setOpeningBalance(initOpBal);
      setOpeningBalanceType(initOpType);
    } else {
      setPartyCategory(defaultType);
      setPartyName('');
      setShortName('');
      setShortNameEnglish(null);
      setHindiError('');
      setTradeName('');
      setContactPerson('');
      setStatus('ACTIVE');
      setActive(true);
      setDueDays(7);
      setMobileNumber('');
      setWhatsappNumber('');
      setCity('');
      setAreaName('');
      setPaymentTerms('COD');
      setSegment('');
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
      setDepositQty(1);
      setDepositLines({});
      setDepositStatus('Pending');
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

  // Short name → Hindi / Marathi spelling for the delivery app; "English" restores the typed text.
  const toggleShortNameHindi = async (lang: 'hi' | 'mr' = 'hi') => {
    setHindiError('');
    if (shortNameEnglish !== null) {
      setShortName(shortNameEnglish);
      setShortNameEnglish(null);
      return;
    }
    const english = shortName.trim();
    if (!english) return;
    setHindiBusy(true);
    try {
      const { text } = await api<{ text: string }>('/api/transliterate', { body: { text: english, lang } });
      setShortName(text);
      setShortNameEnglish(english);
    } catch (err) {
      setHindiError(errorMessage(err));
    } finally {
      setHindiBusy(false);
    }
  };

  const depositRows = products
    .filter((p) => assignedCylinderTypes.includes(p.id))
    .map((p) => {
      const line = depositLines[p.id];
      // The rate is set once per cylinder type in Masters → Products.
      const fee = Number(p.emptyDepositValue) || 0;
      const qty = line && line.qty !== '' ? Number(line.qty) : 0;
      const status: DepositStatus = line?.status || 'Pending';
      // Free = cylinders given without a deposit for this customer.
      return { product: p, fee, qty, total: status === 'Free' ? 0 : fee * qty, status, voucherNo: line?.voucherNo ?? '' };
    });
  const depositTotal = depositRows.reduce((sum, r) => sum + r.total, 0);
  const setDepositLine = (productId: string, patch: { fee?: number | ''; qty?: number | ''; status?: DepositStatus; voucherNo?: string }) =>
    setDepositLines((all) => ({ ...all, [productId]: { fee: all[productId]?.fee ?? '', qty: all[productId]?.qty ?? '', ...patch } }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) {
      alert('Please enter Party Name');
      return;
    }

    const numericOpBal = Number(openingBalance) || 0;
    const finalBalance = openingBalanceType === 'Cr' ? -Math.abs(numericOpBal) : Math.abs(numericOpBal);

    const savedCustomer: Customer = {
      id: customerToEdit?.id || tempPartyId(),
      name: partyName.trim(),
      shortName: shortName.trim() || undefined,
      tradeName: tradeName.trim() || undefined,
      contactPerson: contactPerson.trim() || undefined,
      status,
      phone: mobileNumber.trim(),
      whatsappNumber: whatsappNumber.trim() || mobileNumber.trim(),
      email: emailAddress.trim(),
      gstin: gstApplicable === 'NON-GST' ? undefined : gstin.trim().toUpperCase() || undefined,
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
      stateCode: (gstApplicable !== 'NON-GST' && gstin.trim().length >= 2 && /^\d{2}/.test(gstin.trim()) ? gstin.trim().slice(0, 2) : stateCodeOf(stateName)) || undefined,
      balance: finalBalance,
      openingBalance: numericOpBal,
      openingBalanceType,
      creditLimit: Number(partyLimit) || 0,
      paymentTerms,
      segment: segment || undefined,
      creditDays: PAYMENT_TERMS.find((p) => p.value === paymentTerms)?.days ?? (Number(dueDays) || 0),
      type: partyCategory,
      accountGroup: partyCategory === 'Vendor' ? 'Sundry Creditors' : 'Sundry Debtors',
      active: status === 'ACTIVE',
      dueDays: PAYMENT_TERMS.find((p) => p.value === paymentTerms)?.days ?? (Number(dueDays) || 0),
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
      depositLines: depositRows.filter((r) => r.qty > 0 || r.voucherNo).map((r) => ({ productId: r.product.id, fee: r.fee, qty: r.qty, status: r.status, voucherNo: r.voucherNo.trim() || undefined })),
      depositFeePerCylinder: depositRows.find((r) => r.qty > 0)?.fee ?? (Number(depositFeePerCylinder) || 0),
      totalDepositAmount: depositRows.length ? depositTotal : Number(totalDepositAmount) || 0,
      depositCylinderQty: depositRows.length ? depositRows.reduce((sum, r) => sum + r.qty, 0) : Number(depositQty) || 0,
      // Overall status for the customer list: pending if any cylinder type's deposit is pending.
      depositStatus: depositRows.length ? (depositRows.some((r) => r.qty > 0 && r.status === 'Pending') ? 'Pending' : (depositRows.find((r) => r.qty > 0 && r.status !== 'Free') || depositRows.find((r) => r.qty > 0))?.status || depositStatus) : depositStatus,
      svVoucherNo: (depositRows.find((r) => r.voucherNo.trim())?.voucherNo || svVoucherNo).trim() || undefined,
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
      <div className="w-full h-full bg-slate-50 dark:bg-slate-950 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 text-xs font-semibold text-slate-800 dark:text-slate-200">
        
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
          <div className="party-form flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 max-w-7xl mx-auto w-full">
          


          {/* Card 1: Billing & Official Details */}
          <div className="party-card p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-indigo-500 space-y-4 shadow-sm">
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
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Payment terms</label>
                <select
                  value={paymentTerms}
                  onChange={(e) => {
                    setPaymentTerms(e.target.value);
                    setDueDays(PAYMENT_TERMS.find((p) => p.value === e.target.value)?.days ?? 0);
                  }}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {PAYMENT_TERMS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
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
            
            {/* Row 3: Mobile Number, PIN code & City (the PIN fills city and state) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Billing Pin Code</label>
                <PinInput
                  value={pinCode}
                  onChange={setPinCode}
                  onFound={(info) => {
                    if (info.state) setStateName(info.state);
                    if (info.city) {
                      // The billing PIN decides the billing city; the delivery city only if it is still empty.
                      setCity(info.city);
                      setDeliveryCity((c) => c || info.city!);
                    }
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Billing City</label>
                <CityInput value={city} onChange={setCity} />
              </div>
            </div>
          </div>

          {/* Card 2: Delivery & Local Details (Customers Only) */}
          {partyCategory === 'Customer' && (
            <div className="party-card p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-teal-500 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-teal-100 dark:border-teal-800/50 pb-2">
              <h4 className="font-extrabold text-sm text-teal-700 dark:text-teal-400">
                Delivery Location & Local Details
              </h4>
            </div>

            {/* Row 1: Short Name & Contact Person */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Shop / Short Name (Delivery App) *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Burger King FC Road"
                    value={shortName}
                    onChange={(e) => {
                      setShortName(e.target.value);
                      setShortNameEnglish(null);
                      setHindiError('');
                    }}
                    className={`w-full pl-3 ${shortNameEnglish !== null ? 'pr-24' : 'pr-40'} py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400 font-bold text-sm`}
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {hindiBusy && <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />}
                    {shortNameEnglish !== null ? (
                      <button
                        type="button"
                        disabled={hindiBusy}
                        onClick={() => void toggleShortNameHindi()}
                        title="Switch back to the English name"
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white text-[11px] font-black"
                      >
                        <Languages className="h-3.5 w-3.5" /> English
                      </button>
                    ) : (
                      (['hi', 'mr'] as const).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          disabled={hindiBusy || !shortName.trim()}
                          onClick={() => void toggleShortNameHindi(lang)}
                          title={lang === 'hi' ? 'Write this name in Hindi' : 'Write this name in Marathi'}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md disabled:opacity-40 text-white text-[11px] font-black ${lang === 'hi' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-orange-500 hover:bg-orange-600'}`}
                        >
                          {lang === 'hi' && <Languages className="h-3.5 w-3.5" />}
                          {lang === 'hi' ? 'हिंदी' : 'मराठी'}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                {hindiError && <p className="text-[11px] font-semibold text-rose-600">{hindiError}</p>}
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Delivery Contact Person</label>
                <Combobox
                  placeholder="Search your delivery boys or type a name"
                  options={deliveryBoys.map((b) => ({ value: b.name, hint: b.mobile || 'Delivery boy' }))}
                  value={deliveryContactPerson}
                  onChange={(name) => {
                    setDeliveryContactPerson(name);
                    // Picking one of your delivery boys fills in his mobile (unless a different number is typed already).
                    const boy = deliveryBoys.find((b) => b.name.trim().toLowerCase() === name.trim().toLowerCase());
                    if (boy?.mobile && (!deliveryPhone.trim() || deliveryBoys.some((b) => b.mobile === deliveryPhone.trim()))) setDeliveryPhone(boy.mobile);
                  }}
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

            {/* Row 3: Delivery Mobile, PIN & City */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Delivery Pin Code</label>
                <PinInput
                  value={deliveryPincode}
                  onChange={setDeliveryPincode}
                  onFound={(info) => {
                    // A delivery PIN is specific to this address, so its city wins over the billing one.
                    if (info.city) setDeliveryCity(info.city);
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-slate-100 block">Delivery City</label>
                <CityInput value={deliveryCity} onChange={setDeliveryCity} />
              </div>
            </div>
          </div>
          )}

          {/* Card: GST, State & Contact */}
          <div className="party-card p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-sky-500 space-y-4 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">GST, State &amp; Contact</h4>
          </div>
          {/* Row 6: Gst Applicable, Gstin (hidden for non-GST parties) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {gstApplicable !== 'NON-GST' && (
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
            )}

          </div>

          {/* Row 7: State, Email Address, Party Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-900 dark:text-slate-100 block">State</label>
              <div className="relative">
                <StateSelect value={stateName} onChange={(name) => setStateName(name)} />
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
          </div>

          {/* STAFF & FLEET ASSIGNMENTS CARD */}
          <div className="party-card p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500 space-y-4 shadow-sm">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-900 dark:text-slate-100 block">Area</label>
                <AddableSelect
                  value={areaName}
                  addLabel="New area"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900"
                  options={areas.map((a) => ({ value: a.name, label: a.name }))}
                  onAdd={async (name) => {
                    const route = routes.find((r) => r.name === routeName);
                    const area = await saveMaster<{ id: string; name: string; route: { name: string } | null }>('/api/areas', { name, routeId: route?.id || null });
                    setAreas((list) => [...list, area].sort((x, y) => x.name.localeCompare(y.name)));
                    return area.name;
                  }}
                  onChange={(v) => {
                    setAreaName(v);
                    const area = areas.find((a) => a.name === v);
                    if (area?.route) {
                      setRouteName(area.route.name);
                      const route = routes.find((r) => r.name === area.route?.name);
                      if (route?.defaultDeliveryBoyId && !defaultDeliveryBoyId) {
                        setDefaultDeliveryBoyId(route.defaultDeliveryBoyId);
                        setDefaultDeliveryBoyName(deliveryBoys.find((b) => b.id === route.defaultDeliveryBoyId)?.name || '');
                      }
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="font-extrabold text-slate-900 dark:text-slate-100 block">Route</label>
                <AddableSelect
                  value={routeName}
                  onChange={setRouteName}
                  addLabel="New route"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900"
                  options={routes.map((r) => ({ value: r.name, label: r.name }))}
                  onAdd={async (name) => {
                    const route = await saveMaster<{ id: string; name: string; defaultDeliveryBoyId: string | null }>('/api/routes', { name, defaultDeliveryBoyId: defaultDeliveryBoyId || null });
                    setRoutes((list) => [...list, route].sort((x, y) => x.name.localeCompare(y.name)));
                    return route.name;
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="font-extrabold text-slate-900 dark:text-slate-100 block">Customer type</label>
                <AddableSelect
                  value={segment}
                  onChange={setSegment}
                  addLabel="New customer type"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900"
                  options={[...CUSTOMER_SEGMENTS].map((seg) => ({ value: seg, label: seg }))}
                  onAdd={async (name) => name}
                />
              </div>
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
            <div className="party-card p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-500 space-y-4 shadow-sm">
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
                    const isChecked = assignedCylinderTypes.includes(prod.id);
                    const displayName = `${prod.name} (₹${(prod.salePrice || 0).toLocaleString('en-IN')})${prod.active === false ? ' — inactive, cannot be ordered' : ''}`;

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
          <div className="party-card p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-cyan-500 space-y-4 shadow-sm">
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

            {depositRows.length === 0 ? (
              <p className="text-xs font-semibold text-slate-500">Tick the cylinder types above — each one gets its own deposit line here. The rate comes from Masters → Products (“Security deposit per cylinder ₹”).</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-teal-100 bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-teal-50/60 text-slate-600">
                    <tr><th className="p-2 text-left">Cylinder</th><th className="p-2 text-right">Deposit / cylinder (₹) <span className="font-normal text-[10px] text-slate-400">from product master</span></th><th className="p-2 text-right">No. of cylinders</th><th className="p-2 text-right">Amount (₹)</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">SV Voucher #</th></tr>
                  </thead>
                  <tbody>
                    {depositRows.map((r) => (
                      <tr key={r.product.id} className="border-t border-slate-100">
                        <td className="p-2 font-bold text-slate-800">{r.product.name}</td>
                        <td className="p-2 text-right">
                          <span className={`font-mono font-bold ${r.fee ? 'text-teal-700' : 'text-rose-600'}`} title={r.fee ? 'Set in Masters → Products' : 'No deposit set — add it in Masters → Products'}>{r.fee ? r.fee.toLocaleString('en-IN') : 'Not set'}</span>
                        </td>
                        <td className="p-2 text-right">
                          <input type="number" min={0} value={depositLines[r.product.id]?.qty ?? ''} placeholder="0" onChange={(e) => setDepositLine(r.product.id, { qty: e.target.value === '' ? '' : Math.max(0, Math.round(Number(e.target.value))) })} className="w-20 px-2 py-1.5 rounded border border-slate-300 text-right font-bold focus:outline-none focus:ring-1 focus:ring-teal-500" />
                        </td>
                        <td className="p-2 text-right font-mono font-black text-emerald-700">{r.status === 'Free' ? <span className="text-sky-700">Free</span> : r.total.toLocaleString('en-IN')}</td>
                        <td className="p-2">
                          <select value={r.status} onChange={(e) => setDepositLine(r.product.id, { status: e.target.value as DepositStatus })} className={`px-2 py-1.5 rounded border font-bold focus:outline-none focus:ring-1 focus:ring-teal-500 ${r.status === 'Pending' ? 'border-orange-300 text-orange-700' : r.status === 'Paid' ? 'border-emerald-300 text-emerald-700' : r.status === 'Free' ? 'border-sky-300 text-sky-700' : 'border-slate-300 text-slate-700'}`}>
                            <option value="Pending">🟠 Pending</option>
                            <option value="Paid">🟢 Paid</option>
                            <option value="Adjusted">🟡 Adjusted in bill</option>
                            <option value="Refunded">🔴 Refunded</option>
                            <option value="Free">🆓 Free (no deposit)</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input value={r.voucherNo} onChange={(e) => setDepositLine(r.product.id, { voucherNo: e.target.value.toUpperCase() })} placeholder="SV / TV no." className="w-36 px-2 py-1.5 rounded border border-slate-300 font-mono font-bold text-indigo-700 uppercase focus:outline-none focus:ring-1 focus:ring-teal-500" />
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-teal-100 bg-teal-50/40 font-black">
                      <td className="p-2" colSpan={2}>Total deposit</td>
                      <td className="p-2 text-right">{depositRows.reduce((sum, r) => sum + r.qty, 0)}</td>
                      <td className="p-2 text-right font-mono text-emerald-700">₹{depositTotal.toLocaleString('en-IN')}</td>
                      <td className="p-2" colSpan={2}>{depositRows.some((r) => r.qty > 0 && r.status === 'Pending') && <span className="text-[11px] font-bold text-orange-700">Pending: ₹{depositRows.filter((r) => r.status === 'Pending').reduce((sum, r) => sum + r.total, 0).toLocaleString('en-IN')}</span>}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

          </div>

          {/* ACCOUNT OPENING BALANCE SETUP CARD */}
          <div className="party-card p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-violet-500 space-y-4 shadow-sm">
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

          {/* Card: Other Details */}
          <div className="party-card p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-slate-400 space-y-4 shadow-sm">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Other Details</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div className="space-y-1 md:col-span-2">
            <label className="font-bold text-slate-900 dark:text-slate-100 block">Email (for invoices)</label>
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <p className="text-[10px] text-slate-500">Customer portal logins are created in Admin → Users.</p>
          </div>
          <div className="space-y-1">
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
