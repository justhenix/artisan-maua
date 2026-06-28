import { escapeSpreadsheetCell } from './exports';
import type { TableCell } from './types';

const encoder = new TextEncoder();

function xmlEscape(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function columnName(index: number) {
	let name = '';
	let value = index + 1;
	while (value > 0) {
		const remainder = (value - 1) % 26;
		name = String.fromCharCode(65 + remainder) + name;
		value = Math.floor((value - 1) / 26);
	}
	return name;
}

function excelSerialDate(date = new Date()) {
	return Math.floor((date.getTime() - Date.UTC(1899, 11, 30)) / 86400000);
}

function sheetXml(rows: TableCell[][]) {
	const maxCols = Math.max(1, ...rows.map((row) => row.length));
	const data = rows
		.map((row, rowIndex) => {
			const cells = row
				.map((value, colIndex) => {
					const ref = `${columnName(colIndex)}${rowIndex + 1}`;
					if (typeof value === 'number' && Number.isFinite(value)) {
						return `<c r="${ref}"><v>${value}</v></c>`;
					}
					const text = escapeSpreadsheetCell(value);
					return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
				})
				.join('');
			return `<row r="${rowIndex + 1}">${cells}</row>`;
		})
		.join('');

	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
	<dimension ref="A1:${columnName(maxCols - 1)}${Math.max(1, rows.length)}"/>
	<sheetViews><sheetView workbookViewId="0"/></sheetViews>
	<sheetFormatPr defaultRowHeight="18"/>
	<cols>${Array.from({ length: maxCols }, (_, index) => `<col min="${index + 1}" max="${index + 1}" width="${index === 0 ? 34 : 18}" customWidth="1"/>`).join('')}</cols>
	<sheetData>${data}</sheetData>
</worksheet>`;
}

type ZipEntry = {
	name: string;
	data: Uint8Array;
	crc: number;
	offset: number;
};

let crcTable: number[] | null = null;

function getCrcTable() {
	if (crcTable) return crcTable;
	crcTable = Array.from({ length: 256 }, (_, n) => {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		return c >>> 0;
	});
	return crcTable;
}

function crc32(data: Uint8Array) {
	let crc = 0xffffffff;
	const table = getCrcTable();
	for (const byte of data) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(buffer: Uint8Array, offset: number, value: number) {
	buffer[offset] = value & 0xff;
	buffer[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(buffer: Uint8Array, offset: number, value: number) {
	buffer[offset] = value & 0xff;
	buffer[offset + 1] = (value >>> 8) & 0xff;
	buffer[offset + 2] = (value >>> 16) & 0xff;
	buffer[offset + 3] = (value >>> 24) & 0xff;
}

function concat(parts: Uint8Array[]) {
	const total = parts.reduce((sum, part) => sum + part.length, 0);
	const output = new Uint8Array(total);
	let offset = 0;
	for (const part of parts) {
		output.set(part, offset);
		offset += part.length;
	}
	return output;
}

function zip(files: { name: string; text: string }[]) {
	const localParts: Uint8Array[] = [];
	const entries: ZipEntry[] = [];
	let offset = 0;

	for (const file of files) {
		const name = encoder.encode(file.name);
		const data = encoder.encode(file.text);
		const crc = crc32(data);
		const header = new Uint8Array(30 + name.length);
		writeUint32(header, 0, 0x04034b50);
		writeUint16(header, 4, 20);
		writeUint16(header, 8, 0);
		writeUint32(header, 14, crc);
		writeUint32(header, 18, data.length);
		writeUint32(header, 22, data.length);
		writeUint16(header, 26, name.length);
		header.set(name, 30);
		localParts.push(header, data);
		entries.push({ name: file.name, data, crc, offset });
		offset += header.length + data.length;
	}

	const centralParts: Uint8Array[] = [];
	for (const entry of entries) {
		const name = encoder.encode(entry.name);
		const header = new Uint8Array(46 + name.length);
		writeUint32(header, 0, 0x02014b50);
		writeUint16(header, 4, 20);
		writeUint16(header, 6, 20);
		writeUint16(header, 10, 0);
		writeUint32(header, 16, entry.crc);
		writeUint32(header, 20, entry.data.length);
		writeUint32(header, 24, entry.data.length);
		writeUint16(header, 28, name.length);
		writeUint32(header, 42, entry.offset);
		header.set(name, 46);
		centralParts.push(header);
	}

	const centralOffset = offset;
	const central = concat(centralParts);
	const end = new Uint8Array(22);
	writeUint32(end, 0, 0x06054b50);
	writeUint16(end, 8, entries.length);
	writeUint16(end, 10, entries.length);
	writeUint32(end, 12, central.length);
	writeUint32(end, 16, centralOffset);
	return concat([...localParts, central, end]);
}

export function createWorkbookXlsx(rows: TableCell[][], sheetName = 'Sheet') {
	const safeName = xmlEscape(sheetName.slice(0, 31) || 'Sheet');
	const now = new Date().toISOString();
	return zip([
		{
			name: '[Content_Types].xml',
			text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
	<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
	<Default Extension="xml" ContentType="application/xml"/>
	<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
	<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
	<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
	<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
		},
		{
			name: '_rels/.rels',
			text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
	<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
	<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
		},
		{
			name: 'docProps/core.xml',
			text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<dc:title>${safeName}</dc:title>
	<dc:creator>Artisan</dc:creator>
	<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
	<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`
		},
		{
			name: 'docProps/app.xml',
			text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
	<Application>Artisan</Application>
	<DocSecurity>0</DocSecurity>
</Properties>`
		},
		{
			name: 'xl/workbook.xml',
			text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
	<sheets><sheet name="${safeName}" sheetId="1" r:id="rId1"/></sheets>
	<calcPr calcId="${excelSerialDate()}"/>
</workbook>`
		},
		{
			name: 'xl/_rels/workbook.xml.rels',
			text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
	<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`
		},
		{ name: 'xl/worksheets/sheet1.xml', text: sheetXml(rows) }
	]);
}
