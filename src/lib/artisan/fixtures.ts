import type { ReviewBlocker, SheetLineItem } from './types';

export const fixtureOrderText = `Subject: Production order HB-259689 - La Jolla Artisan Boutique
Date: June 18, 2026

Hi Heather,
Please prep this for our late-summer resort delivery.

Account: La Jolla Artisan Boutique
PO: HB-259689
Shipping details: confirmed separately [redacted]

Line items:
- 12x Medium Silver Elephant Pin (HB-40523-SIL) - match approved sample card
- 24x hb1 hat stud / mini star - buyer wrote "small starburst hat stud"; finish not specified
- 8x Mountain Pendant - new request, finish/material missing
- 6x Black Lip Star with Bird of Prey Dangle - note says "star bird dangle"
- 10x Golden Bird of Prey Hat Stud - buyer wrote "new smaller golden bird of prey"

Production note for Bali: group sterling silver pieces for the next casting batch; hold unresolved variants until Heather confirms.
Packing note: pack hat studs on individual cards; pendants in cotton pouches.`;

export function fixtureBlockers(): ReviewBlocker[] {
	return [
		{
			id: 'star-bird-finish',
			impact: 'High impact',
			impactKey: 'highImpact',
			question: 'Which finish should Bali make for the Black Lip Star with Bird of Prey Dangle?',
			questionKey: 'starBirdQuestion',
			evidence: 'star bird dangle',
			source: 'PO note',
			risk: 'Finish changes the metal casting, material cost, and production scheduling.',
			riskKey: 'starBirdRisk',
			options: ['Golden', 'Recycled Sterling Silver'],
			answer: '',
			required: true,
			field: 'finish'
		},
		{
			id: 'bird-of-prey-size',
			impact: 'Medium impact',
			impactKey: 'mediumImpact',
			question: 'Which Golden Bird of Prey Hat Stud size is this?',
			questionKey: 'birdOfPreyQuestion',
			evidence: 'new smaller golden bird of prey',
			source: 'Buyer note',
			risk: 'Size changes the bone carving template, casting mold, and unit price.',
			riskKey: 'birdOfPreyRisk',
			options: ['Mini', 'Medium'],
			answer: '',
			required: true,
			field: 'size'
		}
	];
}

export function fixtureLineItems(): SheetLineItem[] {
	return [
		{
			id: 'elephant-medium',
			item: 'Medium Silver Elephant Pin',
			styleCode: 'HB-40523-SIL',
			qty: 12,
			finish: 'Sterling Silver',
			notes: 'Match approved sample card. Bali: cast with sterling batch.',
			source: 'PO line',
			unitPrice: 0,
			confidenceState: 'resolved',
			unresolvedFields: []
		},
		{
			id: 'starburst-hat-stud',
			item: 'hb1 hat stud / mini star',
			styleCode: '',
			qty: 24,
			finish: '',
			notes: 'Buyer wrote "small starburst hat stud"; confirm exact hat stud variant.',
			source: 'PO line',
			unitPrice: 0,
			confidenceState: 'needs_review',
			unresolvedFields: ['style code', 'finish']
		},
		{
			id: 'mountain-new',
			item: 'Mountain Pendant',
			styleCode: '',
			qty: 8,
			finish: '',
			notes: 'New request. Missing finish/material; hold until confirmed.',
			source: 'PO line',
			unitPrice: 0,
			confidenceState: 'unresolved',
			unresolvedFields: ['style code', 'finish']
		},
		{
			id: 'star-dangle-unclear',
			item: 'Black Lip Star with Bird of Prey Dangle',
			styleCode: '',
			qty: 8,
			finish: '',
			notes: 'Evidence: "star bird dangle". Finish required before casting.',
			source: 'PO note',
			unitPrice: 0,
			confidenceState: 'unresolved',
			unresolvedFields: ['style code', 'finish']
		},
		{
			id: 'bird-unclear',
			item: 'Golden Bird of Prey Hat Stud',
			styleCode: '',
			qty: 10,
			finish: 'Gold',
			notes: 'Evidence: "new smaller golden bird of prey". Confirm mini vs medium.',
			source: 'Buyer note',
			unitPrice: 0,
			confidenceState: 'unresolved',
			unresolvedFields: ['style code', 'size']
		}
	];
}
