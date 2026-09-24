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

## Backups

Schedule `npm run db:backup` daily (needs `pg_dump`). It keeps 7 daily, 4 weekly and
12 monthly dumps in `BACKUP_DIR` and copies each to `BACKUP_S3_BUCKET` when set.

## Integrations

Configure in `.env` (see `.env.example`): WhatsApp Cloud API webhook
`/api/whatsapp/webhook`, SMTP email, SMS fallback, web push (VAPID), S3 storage,
daily cron `POST /api/cron/outstanding-reminders` with `Authorization: Bearer $CRON_SECRET`.
Without them the app still runs; messages are logged as SIMULATED.
