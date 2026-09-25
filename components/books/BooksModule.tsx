'use client';

import React from 'react';
import BankRecPanel from './BankRecPanel';
import BooksOverview from './BooksOverview';
import CaPackPanel from './CaPackPanel';
import CashBankPanel from './CashBankPanel';
import ChequesPanel from './ChequesPanel';
import EinvoicePanel from './EinvoicePanel';
import ExpensesPanel from './ExpensesPanel';
import FinalAccountsPanel from './FinalAccountsPanel';
import GstPanel from './GstPanel';
import Gstr2bPanel from './Gstr2bPanel';
import LedgersPanel from './LedgersPanel';
import PayrollPanel from './PayrollPanel';
import PurchasesPanel from './PurchasesPanel';
import ReportsHub from './ReportsHub';
import ReturnsPanel from './ReturnsPanel';
import TdsPanel from './TdsPanel';
import VouchersPanel from './VouchersPanel';

// Books of accounts (Tally-style). One screen per sidebar entry under "Books".

export default function BooksModule({ sub, onNavigate }: { sub?: string; onNavigate: (sub: string) => void }) {
  switch (sub) {
    case 'vouchers':
      return <VouchersPanel />;
    case 'purchases':
      return <PurchasesPanel />;
    case 'expenses':
      return <ExpensesPanel />;
    case 'ledgers':
      return <LedgersPanel />;
    case 'cash-bank':
      return <CashBankPanel />;
    case 'gst':
      return <GstPanel />;
    case 'final':
      return <FinalAccountsPanel />;
    case 'ca-pack':
      return <CaPackPanel />;
    case 'reports':
      return <ReportsHub />;
    case 'returns':
      return <ReturnsPanel />;
    case 'bank-rec':
      return <BankRecPanel />;
    case 'payroll':
      return <PayrollPanel />;
    case 'cheques':
      return <ChequesPanel />;
    case 'tds':
      return <TdsPanel />;
    case 'gstr2b':
      return <Gstr2bPanel />;
    case 'einvoice':
      return <EinvoicePanel />;
    default:
      return <BooksOverview onNavigate={onNavigate} />;
  }
}
