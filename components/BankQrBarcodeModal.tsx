'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  QrCode, 
  Barcode, 
  Copy, 
  Check, 
  Printer, 
  Download, 
  CreditCard, 
  Building2, 
  Landmark, 
  Sparkles, 
  ShieldCheck,
  Share2,
  Send,
  MessageSquare
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { BankMaster } from '../lib/types';

interface BankQrBarcodeModalProps {
  bank: BankMaster | null;
  onClose: () => void;
}

export const BankQrBarcodeModal: React.FC<BankQrBarcodeModalProps> = ({ bank, onClose }) => {
  const [customAmount, setCustomAmount] = useState<string>('');
  const [liveUpiId, setLiveUpiId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'qr' | 'barcode'>('all');
  
  const barcodeSvgRef = useRef<SVGSVGElement>(null);
  const qrWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bank?.upiId) {
      setLiveUpiId(bank.upiId);
    } else if (bank?.accountNumber && bank.accountNumber !== 'N/A') {
      setLiveUpiId(`${bank.accountNumber}@upi`);
    } else {
      setLiveUpiId('merchant@upi');
    }
    setCustomAmount('');
  }, [bank]);

  const barcodeValue = bank?.accountNumber && bank.accountNumber !== 'N/A' 
    ? bank.accountNumber 
    : (bank?.ifscCode && bank.ifscCode !== 'N/A' ? bank.ifscCode : bank?.id || 'BANK-001');

  // NPCI Standard UPI Deep Linking URL Format
  const upiPaymentUrl = `upi://pay?pa=${encodeURIComponent(liveUpiId.trim())}&pn=${encodeURIComponent(bank?.accountName || 'OS-BOOKS Merchant')}${customAmount ? `&am=${encodeURIComponent(customAmount.trim())}` : ''}&cu=INR&tn=${encodeURIComponent('Payment to ' + (bank?.accountName || 'Store'))}`;

  useEffect(() => {
    if (bank && barcodeSvgRef.current && barcodeValue) {
      try {
        JsBarcode(barcodeSvgRef.current, barcodeValue, {
          format: 'CODE128',
          width: 2,
          height: 65,
          displayValue: true,
          fontSize: 13,
          fontOptions: 'bold',
          font: 'monospace',
          textMargin: 4,
          margin: 10,
          background: '#ffffff',
          lineColor: '#0f172a',
        });
      } catch (err) {
        console.error('Barcode render error:', err);
      }
    }
  }, [bank, barcodeValue, activeTab]);

  if (!bank) return null;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(liveUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFormattedShareMessage = () => {
    const amountStr = customAmount ? `\n💰 *Payment Amount:* ₹${Number(customAmount).toLocaleString('en-IN')}` : '';
    return `🏦 *Bank & UPI Payment Details*
━━━━━━━━━━━━━━━━━━━━
📌 *Account Name:* ${bank.accountName}
🏦 *Bank:* ${bank.bankName}
📍 *Branch:* ${bank.branch}
🔢 *Account No:* ${bank.accountNumber}
🔤 *IFSC Code:* ${bank.ifscCode}
📲 *UPI VPA ID:* ${liveUpiId}${amountStr}

🔗 *Direct UPI Payment Link:*
${upiPaymentUrl}

Scan QR code or click link above to pay directly via PhonePe, Google Pay, Paytm, or BHIM.
Thank you! - OS-BOOKS GST ERP`;
  };

  const handleShareWhatsApp = () => {
    const message = getFormattedShareMessage();
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleCopyShareMessage = () => {
    const message = getFormattedShareMessage();
    navigator.clipboard.writeText(message);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleDownloadQrPng = () => {
    if (!qrWrapperRef.current) return;
    const svgEl = qrWrapperRef.current.querySelector('svg');
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = (img.width || 200) + 40;
      canvas.height = (img.height || 200) + 40;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
      }
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${bank.accountName.replace(/[^a-zA-Z0-9]/g, '_')}_UPI_QR.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleDownloadBarcodePng = () => {
    if (!barcodeSvgRef.current) return;
    const svgEl = barcodeSvgRef.current;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = (img.width || 300) + 40;
      canvas.height = (img.height || 100) + 40;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
      }
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${bank.accountName.replace(/[^a-zA-Z0-9]/g, '_')}_Barcode.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-sm border border-white/20">
              <Landmark className="h-7 w-7 text-emerald-200" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold text-emerald-100 uppercase tracking-wider mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-200" /> 100% Real NPCI-Compliant Scannable QR
              </div>
              <h2 className="text-xl font-black">{bank.accountName}</h2>
              <p className="text-xs text-emerald-100/90 font-mono">
                {bank.bankName} • {bank.branch}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation Tabs */}
        <div className="px-6 pt-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Code Views
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <QrCode className="h-3.5 w-3.5" /> UPI QR Code
            </button>
            <button
              onClick={() => setActiveTab('barcode')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'barcode'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Barcode className="h-3.5 w-3.5" /> Account Barcode
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all cursor-pointer active:scale-95"
              title="Share QR Code & Bank Details on WhatsApp"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Share on WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6">

          {/* Quick Details Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">Account Number</span>
              <span className="font-extrabold font-mono text-slate-900 dark:text-slate-100">{bank.accountNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">IFSC Code</span>
              <span className="font-extrabold font-mono text-slate-900 dark:text-slate-100">{bank.ifscCode}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">Book Type</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{bank.bookType || 'BANK BOOK'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">Current Balance</span>
              <span className="font-extrabold font-mono text-slate-900 dark:text-slate-100">
                ₹{bank.currentBalance.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Dynamic Inputs: Live UPI VPA & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Live UPI VPA Input */}
            <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60 rounded-2xl space-y-1">
              <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
                <span>Enter Real UPI VPA ID (For Instant Testing)</span>
                <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">e.g. 98260XXXXX@paytm</span>
              </label>
              <input
                type="text"
                value={liveUpiId}
                onChange={(e) => setLiveUpiId(e.target.value)}
                placeholder="e.g. yourname@paytm or ostech@sbi"
                className="w-full px-3 py-1.5 text-xs font-bold font-mono rounded-xl bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Invoice Amount Input */}
            <div className="p-3.5 bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-300 dark:border-cyan-800/60 rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-cyan-900 dark:text-cyan-300 flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                  Optional Invoice Amount (₹)
                </label>
                {customAmount && (
                  <button
                    onClick={() => setCustomAmount('')}
                    className="text-[10px] text-red-500 font-bold hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">₹</span>
                <input
                  type="number"
                  placeholder="e.g. 89900 (or leave blank for open scan)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-xs font-bold font-mono rounded-xl bg-white dark:bg-slate-900 border border-cyan-400 dark:border-cyan-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

          </div>

          {/* QR & BARCODE DISPLAY SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* 1. QR Code Card */}
            {(activeTab === 'all' || activeTab === 'qr') && (
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm text-center flex flex-col items-center justify-between space-y-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-1">
                    <QrCode className="h-3.5 w-3.5" /> Live Scannable UPI QR
                  </div>
                  <p className="text-[11px] text-slate-500">Works directly with PhonePe, Google Pay, Paytm, BHIM</p>
                </div>

                {/* QR Display Wrapper */}
                <div ref={qrWrapperRef} className="p-4 bg-white rounded-2xl border-2 border-emerald-500/30 shadow-lg inline-block">
                  <QRCodeSVG
                    value={upiPaymentUrl}
                    size={180}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                {/* QR Code Action Buttons: WhatsApp Share & Image Download */}
                <div className="flex items-center justify-center gap-2 w-full">
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" /> WhatsApp
                  </button>

                  <button
                    onClick={handleDownloadQrPng}
                    className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                    title="Download QR Image as PNG"
                  >
                    <Download className="h-3.5 w-3.5" /> PNG
                  </button>
                </div>

                {/* UPI Address & Copy Button */}
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                    <div className="truncate font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                      {liveUpiId}
                    </div>
                    <button
                      onClick={handleCopyUpi}
                      className="ml-2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all cursor-pointer"
                    >
                      {copied ? <Check className="h-3 w-3 text-white" /> : <Copy className="h-3 w-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {customAmount && (
                    <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      QR Fixed Payment Amount: ₹{Number(customAmount).toLocaleString('en-IN')}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 font-mono break-all bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded border border-slate-200 dark:border-slate-800 text-left">
                    <span className="font-bold text-emerald-600">UPI Protocol String:</span> {upiPaymentUrl}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Barcode Card */}
            {(activeTab === 'all' || activeTab === 'barcode') && (
              <div className={`p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm text-center flex flex-col items-center justify-between space-y-4 ${activeTab === 'barcode' ? 'col-span-2' : ''}`}>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-xs font-bold mb-1">
                    <Barcode className="h-3.5 w-3.5" /> Account Code-128 Barcode
                  </div>
                  <p className="text-[11px] text-slate-500">Scan with POS Barcode Scanner for instant selection</p>
                </div>

                {/* Barcode Render */}
                <div className="p-4 bg-white rounded-2xl border-2 border-cyan-500/20 shadow-md w-full flex items-center justify-center overflow-x-auto">
                  <svg ref={barcodeSvgRef} className="max-w-full"></svg>
                </div>

                {/* Download Barcode Image */}
                <button
                  onClick={handleDownloadBarcodePng}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" /> Download Barcode Image (PNG)
                </button>

                <div className="w-full text-xs text-slate-500 font-mono">
                  Bank Code: <strong className="text-slate-800 dark:text-slate-200">{barcodeValue}</strong>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Footer Actions with WhatsApp Share & Copy Message */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Send className="h-4 w-4" /> Share on WhatsApp
            </button>

            <button
              onClick={handleCopyShareMessage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              {copiedMessage ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copiedMessage ? 'Copied Full Message' : 'Copy Message'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadQrPng}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Download QR
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
            >
              Close Modal
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
