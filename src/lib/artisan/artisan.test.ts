import { describe, expect, test } from 'bun:test';
import { buildBaliHandoffText, canCreateBaliHandoff } from './baliHandoff';
import { fixtureBlockers, fixtureLineItems } from './fixtures';
import { generateCustomerUpdate } from './customerUpdate';
import { escapeCsvCell, rowsToCsv } from './exports';
import { createPdfDocument } from './pdf';
import { canCreateSheets } from './review';
import { buildProductionRows } from './sheets';
import { createWorkbookXlsx } from './xlsx';
import { extractOrder } from '../server/orderExtraction';

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
	test('fixture fallback works without live AI keys', async () => {
		const result = await extractOrder({
			text: 'sample order',
			client: 'La Jolla Artisan Boutique',
			catalog: [],
			env: { AI_PROVIDER: 'gemini' },
			fetchImpl: (() => {
				throw new Error('fetch should not run without key');
			}) as typeof fetch
		});

		expect(result.mode).toBe('fixture');
		expect(result.lineItems).toHaveLength(5);
		expect(result.blockers).toHaveLength(2);
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
});
