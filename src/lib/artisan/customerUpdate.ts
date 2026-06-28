import { confidenceStateFor } from './review';
import type { SheetLineItem } from './types';

function recipientName(client: string) {
	const first = client.split(/[-,]/)[0]?.trim().split(/\s+/)[0];
	return first && first.length > 1 ? first : 'there';
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
	const finishes = Array.from(new Set(lineItems.map((item) => item.finish).filter(Boolean))).join(', ');
	const reviewLine =
		unresolvedCount > 0
			? `${unresolvedCount} production detail${unresolvedCount === 1 ? '' : 's'} still need confirmation before the production sheets are final.`
			: 'Production details are reviewed and ready for the Bali handoff.';
	const reviewItems = lineItems.filter((item) => confidenceStateFor(item) !== 'resolved').length;
	const notes = lineItems
		.map((item) => item.notes?.trim())
		.filter((note) => note && !/^awaiting/i.test(note))
		.slice(0, 3);

	return `Hi ${recipientName(client)},

Thank you for your order. We reviewed the purchase order and prepared the production notes.

Order summary
- ${lineItems.length} items
- Total quantity: ${totalQty}
- Finishes: ${finishes || 'to confirm'}

Review status
- ${reviewLine}
${reviewItems > 0 ? `- ${reviewItems} item${reviewItems === 1 ? '' : 's'} marked for review.` : '- No unresolved production blockers remain.'}
${notes.length > 0 ? `\nNotes\n${notes.map((note) => `- ${note}`).join('\n')}` : ''}

We will confirm production timing after final review.

Thank you,
Heather Benjamin Jewelry`;
}
