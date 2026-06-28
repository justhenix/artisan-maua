# Artisan

**AI order-to-production assistant for Heather Benjamin Jewelry**

Artisan helps a handmade jewelry business turn inconsistent wholesale purchase orders into clear production, packing, and customer update workflows. The prototype focuses on one practical outcome: reduce manual order coordination while keeping human review in control.

## Problem

Heather Benjamin Jewelry works with independent artisans and production partners in Bali. Wholesale orders arrive as PDFs, spreadsheets, emails, forms, and messages. Product details are often scattered across documents, customer-specific SKU codes, images, and founder knowledge.

Manual processing creates risk:

- wrong style codes or variants
- unclear material and sizing instructions
- packing mistakes
- delayed customer updates
- over-reliance on one person's product memory

## What Artisan Demonstrates

In the demo, a purchase order becomes a production-ready workflow:

1. Paste or upload a purchase order.
2. AI extracts customer, PO, line items, quantities, variants, prices, and notes.
3. Missing or ambiguous fields are flagged instead of invented.
4. User reviews raw source beside structured order data.
5. Production sheet is generated for artisans.
6. Packing sheet is generated for fulfillment.
7. Customer update draft is created from current order status.

For the three-minute hackathon path, use **Try sample order**, resolve the required blockers, continue to sheets, edit production or packing rows, then export XLSX/PDF/CSV or copy a spreadsheet-safe table.

## Core Principle

Artisan does not treat AI output as truth. AI creates a draft; the user reviews and resolves blockers before production.

Confidence states:

- `resolved`: source and catalog agree
- `needs_review`: likely match, human should confirm
- `unresolved`: missing, ambiguous, or no catalog match

## Demo Scope

The prototype is designed for a hackathon demo, not full production replacement.

Included:

- order intake
- structured extraction
- unresolved-field review
- production preparation
- packing support
- XLSX, PDF, CSV, and copy-table exports
- customer update drafting
- English/Indonesian localization foundation
- guided onboarding tour for first-time users
- fixture fallback when no AI key is available

Not included:

- Shopify integration
- QuickBooks integration
- ERP replacement
- real customer data
- live inventory management

## AI Setup

Default iteration can use Gemini from Google AI Studio. Final live demo can use B.AI with Claude Sonnet 4.6. The app still works through fixture data if no API key is present or a provider call fails.

For the safest demo setup, use fixture mode:

```env
AI_PROVIDER=fixture
```

Required only for live AI mode:

Required only for live AI mode:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite

BAI_API_KEY=
BAI_BASE_URL=https://api.b.ai/v1
BAI_MODEL=claude-sonnet-4-6
```

## Running Locally

```bash
bun install
bun run dev
```

Build check:

```bash
bun run check
bun run build
bun test
```

## Data Safety

Demo data should be fictional or redacted. Do not commit real customer names, addresses, payment data, private wholesale documents, API keys, database tokens, or provider dashboard screenshots.
