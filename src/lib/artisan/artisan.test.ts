import { describe, expect, test } from 'bun:test';
import { buildBaliHandoffText, canCreateBaliHandoff } from './baliHandoff';
import { fixtureBlockers, fixtureLineItems } from './fixtures';
import { generateCustomerUpdate } from './customerUpdate';
import { escapeCsvCell, rowsToCsv } from './exports';
import { createPdfDocument } from './pdf';
import { canCreateSheets } from './review';
import { buildProductionRows } from './sheets';
import { createWorkbookXlsx } from './xlsx';
import { buildFixtureExtraction, extractOrder, parsePastedOrder } from '../server/orderExtraction';

const labels = {
	item: 'Item',
	styleCode: 'Style code',
	qty: 'Qty',
	materialFinish: 'Material/Finish',
	confidence: 'Confidence',
	unresolvedWarnings: 'Unresolved warnings',
	sourceEvidence: 'Source evidence',
	technicalInstructions: 'Technical instructions',
	orderNotes: 'Order notes',
	packed: 'Packed',
	packagingSpecifics: 'Packaging specifics',
	fulfillmentFlags: 'Fulfillment flags',
	pendingResolution: 'Pending resolution',
	directShip: 'Direct ship',
	backorder: 'Backorder',
	splitShipAfterCasting: 'Split ship after Bali casting'
};

describe('Artisan demo workflow helpers', () => {
	test('missing live AI key parses pasted text instead of fixture fallback', async () => {
		const result = await extractOrder({
			text: 'hello world',
			client: 'Unresolved',
			catalog: [],
			env: { AI_PROVIDER: 'gemini' },
			fetchImpl: (() => {
				throw new Error('fetch should not run without key');
			}) as typeof fetch
		});

		expect(result.mode).toBe('failed');
		expect(result.lineItems).toHaveLength(0);
		expect(result.blockers).toHaveLength(0);
		expect(JSON.stringify(result)).not.toContain('Golden Bird');
	});

	test('sample order fixture remains explicit and complete', () => {
		const result = buildFixtureExtraction();
		expect(result.mode).toBe('fixture');
		expect(result.lineItems).toHaveLength(5);
		expect(result.blockers).toHaveLength(2);
		expect(result.lineItems.map((item) => item.item).join(' ')).toContain('Golden Bird of Prey Hat Stud');
	});

	test('unsupported image upload metadata does not create fixture blocker', async () => {
		const result = await extractOrder({
			text: '',
			client: 'Unresolved',
			catalog: [],
			env: { AI_PROVIDER: 'fixture' }
		});

		expect(result.lineItems).toHaveLength(0);
		expect(result.blockers).toHaveLength(0);
		expect(JSON.stringify(result)).not.toContain('Golden Bird');
	});

	test('empty or unparseable input returns no items and safe helper state', () => {
		const result = parsePastedOrder('Please see attached image only.', 'Unresolved');
		expect(result.mode).toBe('failed');
		expect(result.lineItems).toHaveLength(0);
		expect(result.blockers).toHaveLength(0);
		expect(result.helperMessage).toContain('Artisan could not read line items from this source.');
	});

	test('pasted PO text dynamically extracts client, PO, and items', () => {
		const result = parsePastedOrder(`From: Ocean House buyer [redacted]
PO Number: HB-260111

Item,Qty,Material/Finish,Notes
Feather Necklace,6,Sterling Silver,standard pouch
Wolf Pendant Necklace,4,Silver,18 inch chain`, '');

		expect(result.mode).toBe('deterministic');
		expect(result.client).toBe('Ocean House buyer');
		expect(result.poNumber).toBe('HB-260111');
		expect(result.lineItems).toHaveLength(2);
		expect(result.lineItems[0].item).toBe('Feather Necklace');
		expect(result.lineItems[0].qty).toBe(6);
		expect(result.lineItems[0].finish).toBe('Sterling Silver');
		expect(result.lineItems[0].source).toContain('Feather Necklace');
	});

	test('uploaded HB-260314 source binds source identity and item blockers', () => {
		const result = parsePastedOrder(`Client: North Shore Studio
PO: HB-260314

Item                                      Qty   Finish             Notes
---------------------------------------------------------------------------
Medium Silver Elephant Pin               12    Sterling Silver    Match approved sample card
hb1 hat stud / mini star                  24                       Buyer wrote "small starburst hat stud"
Mountain Pendant                          8                        handwritten note says "new mountain"
Feather Necklace                          6    Sterling Silver     standard pouch
Wave Ring                                 4    Silver              standard size`, '');

		expect(result.mode).toBe('deterministic');
		expect(result.client).toBe('North Shore Studio');
		expect(result.poNumber).toBe('HB-260314');
		expect(result.lineItems).toHaveLength(5);
		expect(result.blockers.map((blocker) => blocker.question)).toEqual([
			'Which exact hat stud / mini star style should Bali make?',
			'What finish/material should Bali use for Mountain Pendant?'
		]);
		expect(result.blockers[0].evidence).toBe('buyer wrote "small starburst hat stud" - exact hat stud variant unclear');
		expect(result.blockers[1].evidence).toBe('handwritten note says "new mountain" but no style code or finish');
		expect(result.blockers.every((blocker) => result.lineItems.some((item) => item.id === blocker.itemId))).toBe(true);
		expect(result.blockers[0].options).toEqual(['Type exact style']);
		expect(result.blockers[1].options).toEqual(['Type material/finish']);
		expect(JSON.stringify(result)).not.toContain('Which Golden Bird of Prey Hat Stud size is this?');
		expect(JSON.stringify(result)).not.toContain('HB-MOTHER-OF-PEARL');
	});

	test('blockers never exceed extracted item context', async () => {
		const result = await extractOrder({
			text: 'From: Shop\nPO HB-1\n- 2x Feather Necklace - silver',
			client: '',
			catalog: [],
			env: { AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'test' },
			fetchImpl: (async () =>
				new Response(JSON.stringify({
					candidates: [{
						content: {
							parts: [{
								text: JSON.stringify({
									lineItems: [{ id: 'feather', item: 'Feather Necklace', qty: 2, finish: 'Silver', source: 'PO line', confidenceState: 'unresolved', unresolvedFields: ['style code'] }],
									blockers: [
										{ id: 'b1', question: 'Confirm style code for Feather Necklace.', evidence: 'Feather Necklace', source: 'PO line', options: [] },
										{ id: 'b2', question: 'Confirm finish for Feather Necklace.', evidence: 'silver', source: 'PO line', options: [] }
									]
								})
							}]
						}
					}]
				}), { status: 200 })) as typeof fetch
		});

		expect(result.lineItems).toHaveLength(1);
		expect(result.blockers.length).toBeLessThanOrEqual(result.lineItems.length);
	});

	test('live extraction drops Golden Bird blocker when source has no Golden Bird item', async () => {
		const result = await extractOrder({
			text: 'Client: North Shore Studio\nPO: HB-260314\n- 24x hb1 hat stud / mini star - buyer wrote "small starburst hat stud"\n- 8x Mountain Pendant - handwritten note says "new mountain"',
			client: '',
			catalog: [],
			env: { AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'test' },
			fetchImpl: (async () =>
				new Response(JSON.stringify({
					candidates: [{
						content: {
							parts: [{
								text: JSON.stringify({
									client: 'North Shore Studio',
									poNumber: 'HB-260314',
									lineItems: [
										{ id: 'star', item: 'hb1 hat stud / mini star', qty: 24, source: 'buyer wrote "small starburst hat stud"', confidenceState: 'unresolved', unresolvedFields: ['style code'] },
										{ id: 'mountain', item: 'Mountain Pendant', qty: 8, source: 'handwritten note says "new mountain"', confidenceState: 'unresolved', unresolvedFields: ['style code', 'finish/material'] }
									],
									blockers: [
										{ id: 'bird-of-prey-size', question: 'Which Golden Bird of Prey Hat Stud size is this?', evidence: 'new smaller golden bird of prey', source: 'Buyer note', options: ['Mini', 'Medium'] }
									]
								})
							}]
						}
					}]
				}), { status: 200 })) as typeof fetch
		});

		expect(result.client).toBe('North Shore Studio');
		expect(result.poNumber).toBe('HB-260314');
		expect(result.blockers.map((blocker) => blocker.question)).toEqual([
			'Which exact hat stud / mini star style should Bali make?',
			'What finish/material should Bali use for Mountain Pendant?'
		]);
		expect(JSON.stringify(result)).not.toContain('Golden Bird');
	});

	test('unresolved required blockers block sheet creation', () => {
		const blockers = fixtureBlockers();
		expect(canCreateSheets(blockers)).toBe(false);
		blockers.forEach((blocker) => {
			blocker.answer = blocker.options[0];
		});
		expect(canCreateSheets(blockers)).toBe(true);
	});

	test('CSV cells escape spreadsheet formula prefixes', () => {
		expect(escapeCsvCell('=HYPERLINK("https://bad.example")')).toBe('"\'=HYPERLINK(""https://bad.example"")"');
		expect(rowsToCsv([['+sum', '-minus', '@cmd', '\tTabbed', '\rReturn']])).toContain('"\'@cmd"');
	});

	test('production sheet rows preserve unresolved warnings', () => {
		const rows = buildProductionRows({
			items: fixtureLineItems(),
			blockers: fixtureBlockers(),
			labels
		});
		expect(rows[1][0]).toBe('Pending resolution');
		expect(rows.flat().join(' ')).toContain('unresolved');
		expect(rows.flat().join(' ')).toContain('style code');
	});

	test('customer update generation stays lean and avoids invented dates', () => {
		const update = generateCustomerUpdate({
			client: 'La Jolla Artisan Boutique',
			lineItems: fixtureLineItems(),
			unresolvedCount: 2
		});
		expect(update).toContain('2 production details still need confirmation');
		expect(update).not.toContain('June 3');
		expect(update).not.toContain('Estimated completion');
	});

	test('XLSX export is real OOXML and escapes formulas', () => {
		const bytes = createWorkbookXlsx([['Item', 'Note'], ['Horse Pin', '=SUM(1,1)']], 'Production');
		const text = new TextDecoder().decode(bytes);
		expect(text.startsWith('PK')).toBe(true);
		expect(text).toContain('[Content_Types].xml');
		expect(text).toContain('&apos;=SUM(1,1)');
	});

	test('PDF export writes a PDF document with unresolved warning text', () => {
		const rows = buildProductionRows({
			items: fixtureLineItems(),
			blockers: fixtureBlockers(),
			labels
		});
		const bytes = createPdfDocument('Production sheet', rows);
		const text = new TextDecoder().decode(bytes);
		expect(text.startsWith('%PDF-1.4')).toBe(true);
		expect(text).toContain('Pending resolution');
		expect(text).toContain('%%EOF');
	});

	test('Bali handoff is blocked until required blockers resolve', () => {
		const blockers = fixtureBlockers();
		const items = fixtureLineItems();
		expect(canCreateBaliHandoff(blockers, items)).toBe(false);
		blockers.forEach((blocker) => {
			blocker.answer = blocker.options[0];
		});
		expect(canCreateBaliHandoff(blockers, items)).toBe(false);
		
		items.forEach((item) => {
			if (!item.styleCode) item.styleCode = 'HB-STYLE';
			if (!item.finish) item.finish = 'Gold';
		});
		expect(canCreateBaliHandoff(blockers, items)).toBe(true);
	});

	test('Bali handoff preserves optional unresolved notes without inventing data', () => {
		const blockers = fixtureBlockers();
		blockers.forEach((blocker) => {
			blocker.answer = blocker.options[0];
		});
		const text = buildBaliHandoffText({
			orderId: 'HB-259689',
			client: 'La Jolla Artisan Boutique',
			items: fixtureLineItems(),
			blockers,
			packedItems: {},
			sourceText: 'Production note for Bali: group sterling silver pieces.\nPacking note: pendants in cotton pouches.',
			getPackagingSpecifics: () => 'standard pouch',
			isBackordered: () => false
		});

		expect(text).not.toContain('Prepared locally in Artisan. Not sent externally.');
		expect(text).toContain('Mountain Pendant: confirm style code and material/finish');
		expect(text).toContain('Production note: group sterling silver pieces.');
		expect(text).not.toContain('Estimated completion');
	});

	test('TXT file content extraction parses items and assigns correct source filename', () => {
		const result = parsePastedOrder(`
---
Source file: artisan_po_HB-260314_north_shore.txt
Source type: text/plain
Client: North Shore Studio
PO: HB-260314

Item                                      Qty   Finish             Notes
---------------------------------------------------------------------------
Medium Silver Elephant Pin               12    Sterling Silver    Match approved sample card
hb1 hat stud / mini star                  24                       Buyer wrote "small starburst hat stud"
Mountain Pendant                          8                        handwritten note says "new mountain"
------------------------------------------------------
		`, 'Unresolved');

		expect(result.mode).toBe('deterministic');
		expect(result.client).toBe('North Shore Studio');
		expect(result.poNumber).toBe('HB-260314');
		expect(result.lineItems).toHaveLength(3);
		expect(result.lineItems[0].source).toBe('artisan_po_HB-260314_north_shore.txt');
		expect(result.lineItems[0].item).toBe('Medium Elephant Pin');
		expect(result.lineItems[1].source).toBe('artisan_po_HB-260314_north_shore.txt');
		expect(result.lineItems[1].item).toBe('hb1 hat stud / mini star');
		expect(result.blockers).toHaveLength(2);
		expect(result.blockers[0].source).toBe('artisan_po_HB-260314_north_shore.txt');
	});

	test('CSV file content extraction parses items and assigns correct source filename', () => {
		const result = parsePastedOrder(`
---
Source file: artisan_po_HB-260314_north_shore.csv
Source type: text/csv
Client: North Shore Studio
PO: HB-260314
Item,Qty,Finish,Notes
Medium Silver Elephant Pin,12,Sterling Silver,Match approved sample card
hb1 hat stud / mini star,24,,Buyer wrote "small starburst hat stud"
Mountain Pendant,8,,handwritten note says "new mountain"
------------------------------------------------------
		`, 'Unresolved');

		expect(result.mode).toBe('deterministic');
		expect(result.client).toBe('North Shore Studio');
		expect(result.poNumber).toBe('HB-260314');
		expect(result.lineItems).toHaveLength(3);
		expect(result.lineItems[0].source).toBe('artisan_po_HB-260314_north_shore.csv');
		expect(result.lineItems[0].item).toBe('Medium Silver Elephant Pin');
		expect(result.lineItems[1].source).toBe('artisan_po_HB-260314_north_shore.csv');
		expect(result.lineItems[1].item).toBe('hb1 hat stud / mini star');
		expect(result.blockers).toHaveLength(2);
		expect(result.blockers[0].source).toBe('artisan_po_HB-260314_north_shore.csv');
	});

	test('PDF text page extraction parses items and page markers', () => {
		const result = parsePastedOrder(`
---
Source file: artisan_po_HB-260314_north_shore.pdf
Source type: application/pdf

## For PDF pages:
Source file: artisan_po_HB-260314_north_shore.pdf
Page: 1
Client: North Shore Studio
PO: HB-260314
Item Qty Finish Notes
Medium Silver Elephant Pin               12    Sterling Silver    Match approved sample card
hb1 hat stud / mini star                  24                       Buyer wrote "small starburst hat stud"
-------------------
## For PDF pages:
Source file: artisan_po_HB-260314_north_shore.pdf
Page: 2
Mountain Pendant                          8                        handwritten note says "new mountain"
-------------------
------------------------------------------------------
		`, 'Unresolved');

		expect(result.mode).toBe('deterministic');
		expect(result.client).toBe('North Shore Studio');
		expect(result.poNumber).toBe('HB-260314');
		expect(result.lineItems).toHaveLength(3);
		expect(result.lineItems[0].source).toBe('artisan_po_HB-260314_north_shore.pdf');
		expect(result.lineItems[0].item).toBe('Medium Elephant Pin');
		expect(result.lineItems[2].source).toBe('artisan_po_HB-260314_north_shore.pdf');
		expect(result.lineItems[2].item).toBe('Mountain Pendant');
		expect(result.blockers).toHaveLength(2);
		expect(result.blockers[1].source).toBe('artisan_po_HB-260314_north_shore.pdf');
	});

	test('do it is ignored when file content exists', () => {
		const result = parsePastedOrder(`do it
---
Source file: artisan_po_HB-260314_north_shore.txt
Source type: text/plain
Client: North Shore Studio
PO: HB-260314
Item,Qty,Finish,Notes
Medium Silver Elephant Pin,12,Sterling Silver,Match approved sample card
------------------------------------------------------
		`, 'Unresolved');
		expect(result.mode).toBe('deterministic');
		expect(result.client).toBe('North Shore Studio');
		expect(result.poNumber).toBe('HB-260314');
		expect(result.lineItems).toHaveLength(1);
		expect(result.lineItems[0].source).toBe('artisan_po_HB-260314_north_shore.txt');
	});

	test('no fixture leakage for uploaded files', () => {
		const result = parsePastedOrder(`
---
Source file: custom_file.txt
Source type: text/plain
Client: Custom Client
PO: HB-999999
Item,Qty,Finish,Notes
Feather Necklace,10,Silver oxy,custom order
------------------------------------------------------
		`, 'Unresolved');

		expect(result.mode).toBe('deterministic');
		expect(result.client).toBe('Custom Client');
		expect(result.poNumber).toBe('HB-999999');
		expect(result.lineItems).toHaveLength(1);
		expect(result.lineItems[0].item).toBe('Feather Necklace');
		expect(JSON.stringify(result)).not.toContain('Golden Bird');
	});
});
