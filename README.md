# DeskShark — B2B Cylinder Distribution ERP

Orders (WhatsApp bot + manual), approval queue, delivery-boy PWA, 3-tier
cylinder inventory, payments with accountant verification, customer ledger,
cash wallets, day closing and reports for LPG / industrial-gas distributors.

Stack: Next.js 16 (App Router) · React 19 · Prisma 7 + PostgreSQL · Tailwind 4.

## Setup

```bash
cp .env.example .env          # set DATABASE_URL and SESSION_SECRET at minimum
npm install                   # also runs `prisma generate`
npm run db:push               # create the tables
npm run db:seed               # users for every role, godown, 19 / 47.5 KG cylinders, sample customers
npm run dev
```

The seed prints the login email and password of each role. Delivery boys'
phones must be approved once in **Admin → Devices** (device binding).

## Portals

| Role | URL | Purpose |
|---|---|---|
| Super Admin, Manager | `/admin` | Orders, approvals, inventory, masters, settings |
| Accountant | `/accountant` | Verification queue, payments, ledgers, cash, day closing |
| Delivery boy | `/delivery` | Mobile PWA: start day, deliveries (works offline), cash, stock |
| Customer | `/customer` | Balance, cylinders, orders, invoices |

## Order to ledger flow

1. Order arrives (WhatsApp bot, manual, customer portal) → **Approval queue**
   (credit-limit breach → credit override).
2. Approval auto-assigns the customer's default delivery boy (reassign / bulk assign in Orders).
3. Delivery boy accepts → out for delivery (customer notified) → enters delivered qty,
   empties, payment and proof photo. Stock and his cash wallet change immediately.
4. Accountant verifies (or sends back with a reason). Approval creates the GST invoice,
   posts invoice + payment to the customer ledger and notifies the customer.
5. Cash is handed over (submission → approval), the accountant locks the day;
   only the Super Admin can re-open it (audit-flagged).

## Android delivery app

The delivery PWA can be packaged as an Android app (Trusted Web Activity) for
reliable camera, GPS and fingerprint login — see [android/README.md](android/README.md).
The interface has an English / हिंदी switch on the delivery app, customer portal and login.

## Books of accounts & CA pack

Sidebar → **Books (Tally)**: double-entry books kept automatically from invoices,
payments, cash handovers, purchase bills and expenses — day book, ledgers, cash &
bank book, GSTR-1 / GSTR-3B, trial balance, P&L and balance sheet. **CA pack** gives
the month as one Excel workbook plus Tally files (import *Masters* first, then
*Transactions*) and emails it to the CA; set a day of the month to send it
automatically. `npm run books:check [YYYY-MM]` prints the books for a month.

Also under Books: purchase / sales returns (debit & credit notes), bank
reconciliation (upload the bank statement), cheque register (PDC, deposit, clear,
bounce with charges), salary & payroll, **GSTR-2B match** (upload the portal JSON /
Excel), **E-invoice & e-way bill** (JSON for the IRP / EWB bulk upload; the IRN, Ack
and signed QR entered back print on the invoice), **TDS** (deducted by customers /
from suppliers, challans, Form 16A) and 37 reports, each downloadable as Excel.

## Operations extras

Sidebar → Operations: **Owner dashboard** (phone-friendly day summary), **Refill due**
(each customer's refill cycle learnt from past orders; per customer: suggest,
WhatsApp reminder or auto-create the order for approval), **Route plan** (open
orders in shortest order from past delivery GPS, opens in Google Maps),
**Complaints** (customers can raise them from the portal too), **Cylinder register &
testing** (serial numbers, hydro-test due dates, CSV import) and **Vehicles**
(document expiry alerts, fuel / service log booked as expenses, cost per km).

Scheduled jobs (in-app scheduler or `/api/cron/*`): CA pack (monthly), outstanding
reminders (weekly), owner report (daily), refill reminders / auto-orders (daily,
8 AM) and monthly customer statements (Settings → Operations → statement day).

## Deploying an update (VPS)

```bash
git pull
npm run deploy      # npm ci → prisma db push (adds new tables, stops on data loss) → build
pm2 restart deskshark   # or however the app is started
```

Make sure `.env` has a real `SESSION_SECRET` (32+ random characters): it signs
logins and encrypts the SMTP password saved in Settings → Email.

## Backups

Schedule `npm run db:backup` daily (needs `pg_dump`). It keeps 7 daily, 4 weekly and
12 monthly dumps in `BACKUP_DIR` and copies each to `BACKUP_S3_BUCKET` when set.

## Integrations

Configure in `.env` (see `.env.example`): WhatsApp Cloud API webhook
`/api/whatsapp/webhook`, SMS fallback, web push (VAPID), S3 storage. Email is set in Admin → Settings → Email
(or SMTP_* in `.env`). Monthly CA pack and weekly reminders run from the built-in
scheduler; `/api/cron/*` with `Authorization: Bearer $CRON_SECRET` also works.
Without them the app still runs; messages are logged as SIMULATED.
