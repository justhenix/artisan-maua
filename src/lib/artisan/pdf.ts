import { escapeSpreadsheetCell } from './exports';
import { unresolvedWarnings, allRequiredFieldsResolved, getBlockingMessage } from './review';
import type { ReviewBlocker, SheetLineItem, TableCell } from './types';

const encoder = new TextEncoder();

function pdfEscape(value: string) {
	return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

function normalizeText(value: TableCell) {
	return escapeSpreadsheetCell(value).replace(/[^\x09\x0a\x0d\x20-\x7e]/g, '?');
}

function safeValue(value: unknown, fallback = 'pending') {
	const text = String(value ?? '').trim();
	return text || fallback;
}

function truncateString(str: string, maxChars: number): string {
	if (!str) return '';
	if (str.length > maxChars) {
		return str.substring(0, maxChars - 3) + '...';
	}
	return str;
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

function wrapPdfLine(text: string, maxLength: number): string[] {
	const words = text.split(/\s+/);
	const lines: string[] = [];
	let current = '';
	for (const word of words) {
		if (!current) {
			current = word;
		} else if (`${current} ${word}`.length <= maxLength) {
			current += ` ${word}`;
		} else {
			lines.push(current);
			current = word;
		}
	}
	if (current) lines.push(current);
	return lines;
}

function wrapLine(text: string, maxLength: number) {
	return wrapPdfLine(text, maxLength);
}

function rowsToLines(title: string, rows: TableCell[][]) {
	const lines = [title, ''];
	for (const row of rows) {
		const text = row.map(normalizeText).join(' | ');
		lines.push(...wrapLine(text, 112));
	}
	return lines;
}

function pageContent(lines: string[]) {
	const commands = ['BT', '/F1 9 Tf', '50 780 Td', '12 TL'];
	lines.forEach((line, index) => {
		if (index > 0) commands.push('T*');
		commands.push(`(${pdfEscape(line)}) Tj`);
	});
	commands.push('ET');
	return commands.join('\n');
}

function paginate(lines: string[]) {
	const pages: string[][] = [];
	for (let i = 0; i < lines.length; i += 58) {
		pages.push(lines.slice(i, i + 58));
	}
	return pages.length ? pages : [['']];
}

export function createPdfDocument(title: string, rows: TableCell[][]) {
	const pages = paginate(rowsToLines(title, rows));
	const objects: string[] = [];
	const pageObjectIds: number[] = [];

	objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
	objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

	let nextId = 4;
	const contentIds: number[] = [];
	for (const page of pages) {
		const pageId = nextId++;
		const contentId = nextId++;
		pageObjectIds.push(pageId);
		contentIds.push(contentId);
		objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
		const content = pageContent(page);
		objects[contentId] = `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`;
	}

	objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;

	const chunks: string[] = ['%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'];
	const offsets = [0];
	for (let id = 1; id < objects.length; id++) {
		offsets[id] = encoder.encode(chunks.join('')).length;
		chunks.push(`${id} 0 obj\n${objects[id]}\nendobj\n`);
	}

	const xrefOffset = encoder.encode(chunks.join('')).length;
	chunks.push(`xref\n0 ${objects.length}\n`);
	chunks.push('0000000000 65535 f \n');
	for (let id = 1; id < objects.length; id++) {
		chunks.push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
	}
	chunks.push(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
	return encoder.encode(chunks.join(''));
}

class PdfBuilder {
	pages: string[][] = [];
	currentOps: string[] = [];
	y = 740;
	lineHeight = 13;

	constructor() {}

	setColor(r: number, g: number, b: number, stroke = false) {
		const cmd = stroke 
			? `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG` 
			: `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`;
		this.currentOps.push(cmd);
	}

	setLineWidth(w: number) {
		this.currentOps.push(`${w.toFixed(2)} w`);
	}

	drawRect(x: number, y: number, w: number, h: number, fill = false, stroke = true) {
		const cmd = fill && stroke 
			? `${x} ${y} ${w} ${h} re B` 
			: fill 
				? `${x} ${y} ${w} ${h} re f` 
				: `${x} ${y} ${w} ${h} re S`;
		this.currentOps.push(cmd);
	}

	drawLine(x1: number, y1: number, x2: number, y2: number) {
		this.currentOps.push(`${x1} ${y1} m ${x2} ${y2} l S`);
	}

	drawText(text: string, x: number, y: number, font = '/F1 9 Tf') {
		const escaped = pdfEscape(text);
		this.currentOps.push(`BT ${font} ${x} ${y} Td (${escaped}) Tj ET`);
	}

	writeText(text: string, x = 50, font = '/F1 9 Tf') {
		this.drawText(text, x, this.y, font);
	}

	newLine(count = 1) {
		this.y -= this.lineHeight * count;
		if (this.y < 50) {
			this.nextPage();
		}
	}

	nextPage() {
		this.pages.push(this.currentOps);
		this.currentOps = [];
		this.y = 740;
	}

	build() {
		if (this.currentOps.length > 0 || this.pages.length === 0) {
			this.pages.push(this.currentOps);
		}
		return this.pages;
	}
}

export function createBaliHandoffPdf({
	orderId,
	client,
	items,
	blockers,
	packedItems,
	sourceText,
	getTechnicalInstructions,
	getPackagingSpecifics,
	isBackordered
}: {
	orderId: string;
	client: string;
	items: SheetLineItem[];
	blockers: ReviewBlocker[];
	packedItems: Record<string, boolean>;
	sourceText: string;
	getTechnicalInstructions?: (item: SheetLineItem) => string;
	getPackagingSpecifics: (styleCode: string) => string;
	isBackordered: (styleCode: string) => boolean;
}) {
	const builder = new PdfBuilder();
	const allResolved = allRequiredFieldsResolved(items, blockers);
	const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
	const statusLabel = allResolved ? 'Ready' : 'Needs answer';

	// Page 1 Header
	builder.drawText('Bali handoff packet', 50, 750, '/F2 16 Tf');
	builder.setColor(0.7, 0.7, 0.7, true);
	builder.setLineWidth(0.5);
	builder.drawLine(50, 740, 562, 740);

	// Summary Card
	builder.setColor(0.9, 0.9, 0.9, true);
	builder.drawRect(50, 645, 512, 80, false, true);

	builder.setColor(0.1, 0.1, 0.1);
	builder.drawText(`Order: ${safeValue(orderId, 'pending')}`, 65, 705, '/F1 9.5 Tf');
	builder.drawText(`Customer: ${safeValue(client, 'pending')}`, 65, 688, '/F1 9.5 Tf');
	builder.drawText(`Line items: ${items.length}`, 320, 705, '/F1 9.5 Tf');
	builder.drawText(`Total quantity: ${totalQty}`, 320, 688, '/F1 9.5 Tf');
	
	builder.drawText('Handoff status:', 320, 671, '/F1 9.5 Tf');
	if (allResolved) {
		builder.setColor(0.1, 0.5, 0.1);
		builder.drawText('Ready', 395, 671, '/F2 9.5 Tf');
	} else {
		builder.setColor(0.8, 0.4, 0.0);
		builder.drawText('Needs answer', 395, 671, '/F2 9.5 Tf');
	}

	builder.setColor(0, 0, 0);
	builder.y = 625;

	// Warning Box if unresolved
	if (!allResolved) {
		const blockingIssues: string[] = [];
		for (const item of items) {
			const warnings = unresolvedWarnings(item);
			const fields: string[] = [];
			if (warnings.includes('style code')) fields.push('style code');
			if (warnings.includes('quantity')) fields.push('quantity');
			if (warnings.includes('finish/material') || warnings.includes('finish')) {
				fields.push(item.id === 'mountain-new' ? 'material/finish' : 'finish');
			}
			if (warnings.includes('size')) fields.push('size');

			const hasHold = item.notes?.toLowerCase().includes('hold');
			if (fields.length > 0 || hasHold) {
				const action = item.id === 'starburst-hat-stud' ? 'choose exact' : 'confirm';
				let msg = '';
				if (fields.length > 0) {
					if (fields.length === 1) msg = `${action} ${fields[0]}`;
					else msg = `${action} ${fields.slice(0, -1).join(', ')} and ${fields[fields.length - 1]}`;
				}
				if (hasHold) {
					if (msg) msg += ' (on hold)';
					else msg = 'on hold';
				}
				blockingIssues.push(`* ${item.item}: ${msg}`);
			}
		}

		const boxHeight = 25 + 14 * blockingIssues.length;
		builder.y -= 15;
		
		builder.setColor(1.0, 0.96, 0.9);
		builder.drawRect(50, builder.y - boxHeight, 512, boxHeight, true, false);
		builder.setColor(0.85, 0.5, 0.1, true);
		builder.drawRect(50, builder.y - boxHeight, 512, boxHeight, false, true);

		builder.setColor(0.75, 0.35, 0.0);
		builder.drawText('Review needed before sharing with Bali', 65, builder.y - 15, '/F2 9.5 Tf');

		builder.setColor(0.1, 0.1, 0.1);
		let issueY = builder.y - 30;
		for (const issue of blockingIssues) {
			builder.drawText(issue, 65, issueY, '/F1 9 Tf');
			issueY -= 13;
		}

		builder.y -= (boxHeight + 15);
	}

	builder.newLine(1);

	// Production Section
	builder.writeText('Production', 50, '/F2 11 Tf');
	builder.newLine(1.2);

	const prodCols = { item: 50, qty: 230, style: 260, finish: 330, note: 400, status: 510 };
	builder.drawText('Item', prodCols.item, builder.y, '/F2 8.5 Tf');
	builder.drawText('Qty', prodCols.qty, builder.y, '/F2 8.5 Tf');
	builder.drawText('Style', prodCols.style, builder.y, '/F2 8.5 Tf');
	builder.drawText('Finish', prodCols.finish, builder.y, '/F2 8.5 Tf');
	builder.drawText('Bali note', prodCols.note, builder.y, '/F2 8.5 Tf');
	builder.drawText('Status', prodCols.status, builder.y, '/F2 8.5 Tf');

	builder.setColor(0.8, 0.8, 0.8, true);
	builder.drawLine(50, builder.y - 4, 562, builder.y - 4);
	builder.newLine(1.2);

	builder.setColor(0.1, 0.1, 0.1);
	for (const item of items) {
		const isReady = isItemReady(item);
		const status = isReady ? 'Ready' : 'Needs answer';
		const style = item.styleCode ? item.styleCode : 'pending';
		const finish = item.finish ? item.finish : 'pending';
		const note = item.notes ? item.notes : '';

		builder.drawText(truncateString(item.item, 32), prodCols.item, builder.y, '/F1 8.5 Tf');
		builder.drawText(truncateString(String(item.qty), 5), prodCols.qty, builder.y, '/F1 8.5 Tf');
		builder.drawText(truncateString(style, 12), prodCols.style, builder.y, '/F1 8.5 Tf');
		builder.drawText(truncateString(finish, 12), prodCols.finish, builder.y, '/F1 8.5 Tf');
		builder.drawText(truncateString(note, 20), prodCols.note, builder.y, '/F1 8.5 Tf');
		
		if (isReady) {
			builder.setColor(0.1, 0.5, 0.1);
			builder.drawText(status, prodCols.status, builder.y, '/F2 8.5 Tf');
		} else {
			builder.setColor(0.8, 0.4, 0.0);
			builder.drawText(status, prodCols.status, builder.y, '/F2 8.5 Tf');
		}
		builder.setColor(0.1, 0.1, 0.1);
		builder.newLine(1.1);
	}

	builder.newLine(1);

	// Production notes details below
	const notesWithContent = items.filter(item => item.notes || getTechnicalInstructions?.(item));
	if (notesWithContent.length > 0) {
		builder.writeText('Production notes', 50, '/F2 11 Tf');
		builder.newLine(1.2);

		for (const item of items) {
			const technical = getTechnicalInstructions?.(item);
			if (item.notes || technical) {
				const styleLabel = item.styleCode ? ` (${item.styleCode})` : '';
				builder.writeText(`* ${item.item}${styleLabel}`, 50, '/F2 8.5 Tf');
				builder.newLine(1.0);

				if (item.notes) {
					const wrapped = wrapPdfLine(`Production note: ${item.notes}`, 105);
					for (const line of wrapped) {
						builder.writeText(line, 65, '/F1 8.5 Tf');
						builder.newLine(1.0);
					}
				}
				if (technical && !technical.toLowerCase().includes('pending resolution') && !technical.toLowerCase().includes('no instructions')) {
					const wrapped = wrapPdfLine(`Production note: ${technical}`, 105);
					for (const line of wrapped) {
						builder.writeText(line, 65, '/F1 8.5 Tf');
						builder.newLine(1.0);
					}
				}
			}
		}
		builder.newLine(1);
	}

	// Packing Section
	builder.writeText('Packing', 50, '/F2 11 Tf');
	builder.newLine(1.2);

	const packCols = { done: 50, item: 80, qty: 260, packing: 290, shipHold: 440 };
	builder.drawText('Done', packCols.done, builder.y, '/F2 8.5 Tf');
	builder.drawText('Item', packCols.item, builder.y, '/F2 8.5 Tf');
	builder.drawText('Qty', packCols.qty, builder.y, '/F2 8.5 Tf');
	builder.drawText('Packing', packCols.packing, builder.y, '/F2 8.5 Tf');
	builder.drawText('Ship / hold', packCols.shipHold, builder.y, '/F2 8.5 Tf');

	builder.setColor(0.8, 0.8, 0.8, true);
	builder.drawLine(50, builder.y - 4, 562, builder.y - 4);
	builder.newLine(1.2);

	builder.setColor(0.1, 0.1, 0.1);
	for (const item of items) {
		const done = packedItems[item.id] ? '[x]' : '[ ]';
		const packaging = item.styleCode ? getPackagingSpecifics(item.styleCode) : 'pending style';
		const shipHold = item.styleCode && isBackordered(item.styleCode) ? 'hold' : 'Ready';

		builder.drawText(done, packCols.done, builder.y, '/F1 8.5 Tf');
		builder.drawText(truncateString(item.item, 32), packCols.item, builder.y, '/F1 8.5 Tf');
		builder.drawText(truncateString(String(item.qty), 5), packCols.qty, builder.y, '/F1 8.5 Tf');
		builder.drawText(truncateString(packaging, 28), packCols.packing, builder.y, '/F1 8.5 Tf');
		builder.drawText(truncateString(shipHold, 20), packCols.shipHold, builder.y, '/F2 8.5 Tf');
		builder.newLine(1.1);
	}

	builder.newLine(1);

	// Outstanding Section
	const outstandingItems = items.filter(item => !isItemReady(item) || item.notes?.toLowerCase().includes('hold'));
	if (outstandingItems.length > 0) {
		builder.writeText('Outstanding', 50, '/F2 11 Tf');
		builder.newLine(1.2);

		for (const item of outstandingItems) {
			const msg = getBlockingMessage(item);
			if (msg) {
				builder.writeText(`* ${msg}`, 50, '/F1 8.5 Tf');
				builder.newLine(1.1);
			}
		}
		builder.newLine(1);
	}

	// Source Notes Used Section
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
		builder.writeText('Source notes used', 50, '/F2 11 Tf');
		builder.newLine(1.2);

		for (const note of uniqueSourceNotes) {
			const wrapped = wrapPdfLine(`* ${note}`, 105);
			for (const line of wrapped) {
				builder.writeText(line, 50, '/F1 8.5 Tf');
				builder.newLine(1.0);
			}
		}
	}

	// Compile PDF
	const pages = builder.build();
	const objects: string[] = [];
	const pageObjectIds: number[] = [];

	objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
	objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
	objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
	objects[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>';

	let nextId = 6;
	const contentIds: number[] = [];
	
	pages.forEach((pageOps, idx) => {
		const pageId = nextId++;
		const contentId = nextId++;
		pageObjectIds.push(pageId);
		contentIds.push(contentId);
		
		objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>`;
		
		const footer = `Page ${idx + 1} of ${pages.length}`;
		pageOps.push(`BT /F1 8 Tf 270 30 Td (${footer}) Tj ET`);
		
		const content = pageOps.join('\n');
		objects[contentId] = `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`;
	});

	objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;

	const chunks: string[] = ['%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'];
	const offsets = [0];
	for (let id = 1; id < objects.length; id++) {
		offsets[id] = encoder.encode(chunks.join('')).length;
		chunks.push(`${id} 0 obj\n${objects[id]}\nendobj\n`);
	}

	const xrefOffset = encoder.encode(chunks.join('')).length;
	chunks.push(`xref\n0 ${objects.length}\n`);
	chunks.push('0000000000 65535 f \n');
	for (let id = 1; id < objects.length; id++) {
		chunks.push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
	}
	chunks.push(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
	return encoder.encode(chunks.join(''));
}
