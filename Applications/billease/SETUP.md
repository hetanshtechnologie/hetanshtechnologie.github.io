# BillEase - GST Billing, POS & Restaurant Suite

A self-contained multi-tenant billing platform (inspired by the feature set of
myBillBook, with **100% original code, copy and design**): GST invoicing, a
restaurant point-of-sale with kitchen display, recipes & inventory, customers
and vendors with ledgers, bookkeeping, marketing & loyalty, e-Way/e-invoice
compliance, reports & analytics, and a dark/light theme.

## Structure

```
Applications/billease/
├── index.html           # Web app (SPA): dashboard, POS, KDS, invoices, reports
├── css/style.css        # Design system, light/dark theme, responsive
├── js/
│   ├── config.js        # Supabase URL + anon key
│   ├── app.js           # Auth, business switcher, dashboard, settings, team
│   ├── pos.js           # Restaurant POS: cart, holds, kitchen send, quick pay
│   ├── kds.js           # Kitchen display: order tickets, status progression
│   ├── products.js      # Menu, inventory, ingredients & recipes
│   ├── parties.js       # Customers/vendors + ledger history + loyalty
│   ├── invoices.js      # GST invoice editor, payments, print/PDF/share
│   ├── bookkeeping.js   # Expenses, monthly income/expense/net
│   ├── marketing.js     # Campaigns (WhatsApp/email/SMS) + loyalty board
│   ├── compliance.js    # e-Way bills + e-invoice IRN/QR (demo)
│   └── reports.js       # Charts (Chart.js) + PDF export (jsPDF)
├── supabase/
│   ├── schema.sql       # 14 tables, RLS, triggers, member RPCs (run first)
│   ├── seed-users.sql   # Role-based test logins (owner/admin/staff)
│   └── seed.sql         # Optional cafe demo data (Spice & Sip)
├── android/             # Kotlin app scaffold: offline-first sync
└── SETUP.md
```

## 1. Supabase setup (database)

1. Create a project at [supabase.com](https://supabase.com) (or reuse one).
2. Open **SQL Editor** and run `supabase/schema.sql`. This creates the
   multi-tenant schema (`be_businesses` + `be_members`, plus all domain tables
   scoped by `business_id`) with Row Level Security and the
   `be_invite_member` / `be_list_members` helper RPCs.
3. Enable auth methods: **Authentication > Providers > Email** (and Google if
   wanted).
4. (Optional) Load demo data. Run in this order:
   1. `supabase/seed-users.sql` – creates confirmed test logins
      (`owner@billease.test`/`Owner@123`, `admin@billease.test`/`Admin@123`,
      `staff@billease.test`/`Staff@123`) so every role can be tested.
   2. `supabase/seed.sql` – seeds the "Spice & Sip Cafe" demo (menu, recipes,
      tables, parties, POS orders, invoices, payments, expenses, campaign,
      loyalty, e-way, notifications) for the owner account and attaches the
      admin/staff accounts as members.

The schema uses RLS on every table so each member only sees data of the
businesses they belong to.

## 2. Web app

1. Point `js/config.js` at your project (Settings > API > URL + anon key).
   It is pre-filled with the shared site project already.
2. Serve the folder with any static server:

   ```bash
   npx serve Applications/billease/
   ```

3. Open the URL, sign up, and you are ready to bill. The first account
   creates a business automatically; add teammates from **Settings > Team**.

### Modules
- **Dashboard** – today's sales, open tables, open orders, month expenses,
  low-stock alerts; 6-month sales trend and top-product charts; recent
  invoices and notifications.
- **POS Billing** – item-first restaurant POS with category chips, dish
  search (`/`), dine-in/takeaway/delivery/online, table selection, waiter and
  platform; cart quantity controls; Save & Hold (multi-bill), Send to Kitchen,
  quick charge with balance-return and loyalty redemption; thermal-style
  receipt printing. Shortcuts: `F4` hold, `F8` charge, `F9` kitchen,
  `F10` receipt, `Esc` new bill.
- **Kitchen Display** – live kitchen tickets for sent/ready orders with
  20-second auto-refresh, "Mark Ready" / "Mark Served" progression. Ideal on a
  kitchen tablet.
- **Create Invoice** – GST/non-GST sale, quotation and purchase bills; dynamic
  line items with HSN/SAC, GST auto-calculation, discount, shipping, place of
  supply, dine/table/waiter/platform; auto numbering (`BE-0001`); stock is
  adjusted through dish recipes automatically.
- **Invoices** – list with type/status search filters; view, edit, delete;
  record payments (auto-updates paid amount + status); quotation-to-invoice
  conversion; print and save as PDF; share (Web Share API / copy link).
- **Products & Menu** – product catalogue with SKU, HSN, GST %, unit,
  purchase/selling price, stock and low-stock threshold; menu availability
  (sold out); raw **ingredients**; **recipes** (dish = ingredient bill of
  materials) with auto-calculated cost and margin.
- **Customers & Vendors** – parties with GSTIN, credit limit, opening balance,
  loyalty points and a full transaction ledger (opening balance + invoices +
  payments).
- **Bookkeeping** – monthly income (payments received), expenses with category
  breakdown, net cash flow; full expense ledger.
- **Marketing** – campaign drafts (WhatsApp / email / SMS) with audience
  targeting (customers / loyalty / vendors) and send tracking; customer
  loyalty points board and points ledger.
- **e-Way & e-Invoice** – e-Way bill tracking linked to invoices; demo-mode
  e-invoice generation with GSTN IRP-style IRN, acknowledgement and scannable
  QR payload. Wire `generateEInvoice()` to the real IRP API for production.
- **Reports & Analytics** – monthly sales/tax/paid/outstanding/expenses,
  daily sales, peak hours, tax (GST rate) breakdown, top products, outstanding
  by party, top dishes & margins, day reconciliation (per-method cash in/out
  vs expected closing) and GST summary (CGST+SGST); one-click PDF export.
- **Settings** – business profile (name, GSTIN, FSSAI, address), currency,
  invoice/POS numbering prefixes, opening cash, GST & loyalty toggles; team
  member management with owner/admin/staff roles.

## 3. Android app (offline-first)

Folder `android/` is a Kotlin + Room + WorkManager scaffold:

- Writes go to the **local Room database first**, then a `sync_queue` outbox
  is flushed by `SyncManager` when the network is available.
- Client-generated UUIDs make offline retries idempotent.
- Daily due-invoice reminders via local worker + FCM for server pushes.

Build steps in `android/README.md`. Set your Supabase credentials in
`network/SupabaseApi.kt` and add `google-services.json` for FCM.

## Key API patterns (web)

```javascript
// Auth
await sb.auth.signUp({ email, password });
await sb.auth.signInWithPassword({ email, password });

// Multi-tenant bootstrap
const { data } = await sb.from('be_members')
  .select('id, role, can_bill, business:be_businesses(*)')
  .eq('user_id', currentUser.id);

// Invoices
await sb.from('be_invoices').insert([{ ...invoice }]);
await sb.from('be_invoice_items').insert([ ...items ]);

// Payments (trigger updates invoice.paid_amount + status)
await sb.from('be_payments').insert([{ invoice_id, amount, method }]);

// Team members
await sb.rpc('be_invite_member', { biz, email, role });
await sb.rpc('be_list_members', { biz });

// Low stock
products.filter(p => p.low_stock_at > 0 && p.stock <= p.low_stock_at);
```

## Roadmap
- WhatsApp/email invoice delivery via Supabase Edge Functions
- Barcode scanning on Android (ML Kit)
- GST export files (GSTR-1) for CA filing
- Real GSTN IRP / e-Way API integration (replaces the demo generator)
