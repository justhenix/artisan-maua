# Artisan AI Workflow

Artisan is an AI order-to-production assistant for Heather Benjamin Jewelry.

It helps turn messy wholesale purchase orders into structured order data, blocker review, production sheets, packing checklists, Bali workshop handoff, and customer updates.

## Problem

Wholesale orders can arrive as PDFs, spreadsheets, emails, pasted text, or order forms.

These orders often contain ambiguous product names, missing style details, incomplete material or finish information, and notes that are not ready for production.

Artisan helps catch those issues before they reach the workshop.

## Workflow Overview

Artisan follows this flow:

1. Order intake
2. AI/file extraction
3. Structured order draft
4. Blocker review
5. Human resolution
6. Production sheet
7. Packing checklist
8. Bali workshop handoff
9. Customer update

## Demo Order

The live demo uses a sample wholesale purchase order:

- Client: North Shore Studio
- PO Number: HB-260314
- Order type: Wholesale jewelry purchase order

## AI/File Extraction

Artisan reads the source order and extracts structured fields such as:

- Client name
- PO number
- Line items
- Quantities
- Product names
- Materials or finishes when available
- Notes or special instructions

The goal is not to blindly automate production. The goal is to create a structured draft that is easy for a human to review.

## Blocker Detection

When Artisan finds missing or ambiguous information, it creates blockers instead of guessing.

In the demo order, Artisan flags:

- Missing exact style for `HB1 hat stud / mini star`
- Missing finish/material for `Mountain Pendant`

This keeps unclear information from reaching production.

## Human Review

The user resolves blockers directly in the workflow.

Example resolutions:

- `HB1 Hat Stud — Mini Star`
- `Sterling silver, polished finish`

After review, the order becomes ready for production outputs.

## Production Outputs

Once the order is reviewed, Artisan generates:

### Production Sheet

A clean internal sheet for making the order, including item details, quantities, style, material, finish, and notes.

### Packing Checklist

A fulfillment checklist generated from the reviewed order.

### Bali Workshop Handoff

A focused handoff for the workshop so production receives clear instructions.

### Customer Update

A customer-facing update draft based on the resolved order.

## Why Human-in-the-Loop Matters

Jewelry production depends on exact style, material, finish, and workshop instructions.

Artisan uses AI to speed up extraction and organization, but keeps humans responsible for resolving ambiguity before production.

Artisan flags uncertainty before production, instead of hiding it.

## Demo Flow

```text
Messy PO → Structured Order → Blockers → Human Review → Production Sheet → Packing Checklist → Bali Handoff → Customer Update
```

## Demo Login

- Email: admin@artisan.hbj
- Password: pass123

## Repository

https://github.com/justhenix/artisan-maua

## Created By

Gamma Assyafi Fadhillah Ar Rasyad

- X: @heni0x
- Discord: @heni0x
