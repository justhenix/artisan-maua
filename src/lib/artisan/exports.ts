import type { TableCell } from './types';

const spreadsheetFormulaStart = /^[=+\-@\t\r]/;

export function escapeSpreadsheetCell(value: TableCell) {
	const text = String(value ?? '');
	return spreadsheetFormulaStart.test(text) ? `'${text}` : text;
}

export function escapeCsvCell(value: TableCell) {
	const text = escapeSpreadsheetCell(value);
	return `"${text.replaceAll('"', '""')}"`;
}

export function rowsToCsv(rows: TableCell[][]) {
	return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

export function rowsToCopyTable(rows: TableCell[][]) {
	return rows.map((row) => row.map(escapeSpreadsheetCell).join('\t')).join('\n');
}
