# Artisan

**AI order-to-production assistant for Heather Benjamin Jewelry**

Artisan helps a handmade jewelry business turn inconsistent wholesale purchase orders into clear production, packing, and customer update workflows.

## Problem

Wholesale orders arrive as PDFs, spreadsheets, emails, forms, and messages. Product details are scattered across documents, customer-specific SKU codes, and founder knowledge. Manual processing creates risk: wrong variants, unclear instructions reaching the workshop, packing mistakes, and delayed customer updates.

## What Artisan Does

1. Paste or upload a purchase order.
2. AI extracts line items, quantities, variants, prices, and notes.
3. Missing or ambiguous fields are flagged, never invented.
4. User reviews and resolves blockers before production.
5. Production sheet, packing checklist, and Bali handoff are generated.
6. Customer update draft is created from current order status.

## Core Principle

AI creates a draft; the user reviews and resolves blockers before production. Confidence states: `resolved`, `needs_review`, `unresolved`.

## Demo Login

Email: `admin@artisan.hbj`  
Password: `pass123`

## Running Locally

```bash
bun install
bun run dev
```

Build and check:

```bash
bun run check
bun run build
bun test
```

## AI Setup

The app works through fixture data if no API key is present.

```env
AI_PROVIDER=fixture
```

For live AI mode:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
```

## Stack

- Bun
- SvelteKit 5
- TypeScript
- Turso SQLite
- Tailwind CSS 4
- Vercel

## Repository

https://github.com/justhenix/artisan-maua

## Created By

Gamma Assyafi Fadhillah Ar Rasyad  
X: [@heni0x](https://twitter.com/heni0x)  
Discord: [@heni0x](https://discord.com/users/heni0x)
