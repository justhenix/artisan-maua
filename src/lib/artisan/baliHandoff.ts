import { unresolvedWarnings, allRequiredFieldsResolved, getBlockingMessage } from './review';
import type { ReviewBlocker, SheetLineItem, TableCell } from './types';

type BaliHandoffInput = {
	orderId: string;
	client: string;
	items: SheetLineItem[];
	blockers: ReviewBlocker[];
	packedItems: Record<string, boolean>;
	sourceText: string;
	getTechnicalInstructions?: (item: SheetLineItem) => string;
	getPackagingSpecifics: (styleCode: string) => string;
	isBackordered: (styleCode: string) => boolean;
};

function safeValue(value: unknown, fallback = 'pending') {
	const text = String(value ?? '').trim();
	return text || fallback;
}

function rpad(str: string, length: number): string {
	if (str.length >= length) return str.substring(0, length - 3) + '...';
	return str + ' '.repeat(length - str.length);
}

function isItemReady(item: SheetLineItem): boolean {
	const warnings = unresolvedWarnings(item);
	return !warnings.includes('style code') && 
	       !warnings.includes('quantity') && 
	       !warnings.includes('finish/material') && 
	       !warnings.includes('finish') && 
	       !warnings.includes('material/finish') &&
	       !warnings.includes('size');
}

export function canCreateBaliHandoff(blockers: ReviewBlocker[], items: SheetLineItem[]) {
	return allRequiredFieldsResolved(items, blockers);
}

export function buildBaliHandoffText({
	orderId,
	client,
	items,
	blockers,
	packedItems,
	sourceText,
	getTechnicalInstructions,
	getPackagingSpecifics,
	isBackordered
}: BaliHandoffInput) {
	const allResolved = allRequiredFieldsResolved(items, blockers);
	const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
	const statusLabel = allResolved ? 'Ready' : 'Needs answer';

	const lines = [
		'Bali handoff packet',
		'',
		'Summary',
		`* Order: ${safeValue(orderId, 'pending')}`,
		`* Customer: ${safeValue(client, 'pending')}`,
		`* Line items: ${items.length}`,
		`* Total quantity: ${totalQty}`,
		`* Handoff status: ${statusLabel}`,
		''
	];

	// Warning box if unresolved required fields remain
	if (!allResolved) {
		lines.push('==================================================');
		lines.push('Review needed before sharing with Bali');
		lines.push('==================================================');
		for (const item of items) {
			const msg = getBlockingMessage(item);
			if (msg) {
				lines.push(`* ${msg}`);
			}
		}
		lines.push('==================================================');
		lines.push('');
	}

	// Production Section
	lines.push('Production');
	const prodWidths = { item: 30, qty: 4, style: 12, finish: 15, note: 25, status: 12 };
	const prodHeader = `${rpad('Item', prodWidths.item)}  ${rpad('Qty', prodWidths.qty)}  ${rpad('Style', prodWidths.style)}  ${rpad('Finish', prodWidths.finish)}  ${rpad('Bali note', prodWidths.note)}  ${rpad('Status', prodWidths.status)}`;
	lines.push(prodHeader);
	lines.push('-'.repeat(prodHeader.length));

	for (const item of items) {
		const isReady = isItemReady(item);
		const status = isReady ? 'Ready' : 'Needs answer';
		const style = item.styleCode ? item.styleCode : 'pending';
		const finish = item.finish ? item.finish : 'pending';
		const note = item.notes ? item.notes : '';

		lines.push(
			`${rpad(item.item, prodWidths.item)}  ${rpad(String(item.qty), prodWidths.qty)}  ${rpad(style, prodWidths.style)}  ${rpad(finish, prodWidths.finish)}  ${rpad(note, prodWidths.note)}  ${rpad(status, prodWidths.status)}`
		);
	}
	lines.push('');

	// Production Notes Section (for long notes and catalog instructions)
	const notesWithContent = items.filter(item => item.notes || getTechnicalInstructions?.(item));
	if (notesWithContent.length > 0) {
		lines.push('Production notes');
		for (const item of items) {
			const technical = getTechnicalInstructions?.(item);
			if (item.notes || technical) {
				const styleLabel = item.styleCode ? ` (${item.styleCode})` : '';
				lines.push(`* ${item.item}${styleLabel}`);
				if (item.notes) {
					lines.push(`  - Production note: ${item.notes}`);
				}
				if (technical && !technical.toLowerCase().includes('pending resolution') && !technical.toLowerCase().includes('no instructions')) {
					lines.push(`  - Production note: ${technical}`);
				}
			}
		}
		lines.push('');
	}

	// Packing Section
	lines.push('Packing');
	const packWidths = { done: 4, item: 30, qty: 4, packing: 25, shipHold: 12 };
	const packHeader = `${rpad('Done', packWidths.done)}  ${rpad('Item', packWidths.item)}  ${rpad('Qty', packWidths.qty)}  ${rpad('Packing', packWidths.packing)}  ${rpad('Ship / hold', packWidths.shipHold)}`;
	lines.push(packHeader);
	lines.push('-'.repeat(packHeader.length));

	for (const item of items) {
		const done = packedItems[item.id] ? '[x]' : '[ ]';
		const packaging = item.styleCode ? getPackagingSpecifics(item.styleCode) : 'pending style';
		const shipHold = item.styleCode && isBackordered(item.styleCode) ? 'hold' : 'Ready';

		lines.push(
			`${rpad(done, packWidths.done)}  ${rpad(item.item, packWidths.item)}  ${rpad(String(item.qty), packWidths.qty)}  ${rpad(packaging, packWidths.packing)}  ${rpad(shipHold, packWidths.shipHold)}`
		);
	}
	lines.push('');

	// Outstanding Section
	const outstandingItems = items.filter(item => !isItemReady(item) || item.notes?.toLowerCase().includes('hold'));
	if (outstandingItems.length > 0) {
		lines.push('Outstanding');
		for (const item of outstandingItems) {
			const msg = getBlockingMessage(item);
			if (msg) {
				lines.push(`* ${msg}`);
			}
		}
		lines.push('');
	}

	// Source evidence section
	const globalNotes = sourceText.split(/\r?\n/).map(l => l.trim());
	const prodNotes = globalNotes.filter(l => /production note/i.test(l)).map(l => l.replace(/^production note( for bali)?:?/i, '').trim());
	const packNotes = globalNotes.filter(l => /packing note/i.test(l)).map(l => l.replace(/^packing note:?/i, '').trim());
	const itemNotes = items.filter(item => item.notes && !item.notes.toLowerCase().includes('resolved') && !item.notes.toLowerCase().includes('hold')).map(item => {
		const label = item.source === 'Buyer note' ? 'Buyer note' : 'PO line';
		return `${label}: ${item.notes}`;
	});

	const uniqueSourceNotes = Array.from(new Set([
		...prodNotes.map(n => `Production note: ${n}`),
		...packNotes.map(n => `Packing note: ${n}`),
		...itemNotes
	]));

	if (uniqueSourceNotes.length > 0) {
		lines.push('Source notes used');
		for (const note of uniqueSourceNotes) {
			lines.push(`* ${note}`);
		}
	}

	return lines.join('\n').trim();
}

export function buildBaliHandoffPdfRows(text: string): TableCell[][] {
	return text.split(/\r?\n/).map((line) => [line]);
}
