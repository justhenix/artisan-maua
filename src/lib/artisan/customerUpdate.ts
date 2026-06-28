import { confidenceStateFor } from './review';
import type { SheetLineItem } from './types';

function cleanString(str: string | null | undefined): string {
	if (!str) return '';
	return str
		.replace(/\{?unresolved\}?/gi, '')
		.replace(/undefined/gi, '')
		.replace(/null/gi, '')
		.replace(/\bTBD\b/gi, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function recipientName(client: string) {
	const cleaned = cleanString(client);
	if (!cleaned || cleaned.toLowerCase() === 'client' || cleaned.toLowerCase() === 'order') {
		return 'team';
	}
	if (!cleaned.toLowerCase().endsWith('team')) {
		return cleaned + ' team';
	}
	return cleaned;
}

export function generateCustomerUpdate({
	client,
	lineItems,
	unresolvedCount
}: {
	client: string;
	lineItems: SheetLineItem[];
	unresolvedCount: number;
}) {
	const totalQty = lineItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);

	let finishes = Array.from(
		new Set(
			lineItems
				.map((item) => cleanString(item.finish))
				.filter((f) => f && f.toLowerCase() !== 'unresolved' && f.toLowerCase() !== 'tbd')
		)
	).join(', ');

	if (!finishes) {
		finishes = 'to confirm';
	}

	const reviewItems = lineItems.filter((item) => confidenceStateFor(item) !== 'resolved').length;

	const reviewLine =
		unresolvedCount > 0
			? `${unresolvedCount} production detail${unresolvedCount === 1 ? '' : 's'} still need confirmation before the production sheets are final.`
			: reviewItems > 0
				? "We're confirming a few production details before the sheets are finalized."
				: 'Production details are reviewed and ready for the Bali handoff.';

	const notes = lineItems
		.map((item) => cleanString(item.notes || ''))
		.filter((note) => note && !/^awaiting/i.test(note) && note.toLowerCase() !== 'unresolved' && note.toLowerCase() !== 'tbd')
		.slice(0, 3);

	const greeting = recipientName(client);

	return `Hi ${greeting},

Thank you for your order. We reviewed the purchase order and prepared the production notes.

Order summary
- ${lineItems.length} items
- Total quantity: ${totalQty}
- Finishes: ${finishes}

Review status
- ${reviewLine}
${reviewItems > 0 ? `- ${reviewItems} item${reviewItems === 1 ? '' : 's'} marked for review.` : '- No unresolved production blockers remain.'}
${notes.length > 0 ? `\nNotes\n${notes.map((note) => `- ${note}`).join('\n')}` : ''}

We will confirm production timing after final review.

Thank you,
Heather Benjamin Jewelry`;
}
