import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { env } from '$env/dynamic/private';
import { extractOrder } from '$lib/server/orderExtraction';
import { getDocumentProxy, extractText } from 'unpdf';

function isShortOrDoIt(text: string): boolean {
	const trimmed = text.trim().toLowerCase().replace(/[.,!]/g, '');
	return (
		trimmed === 'do it' ||
		trimmed === 'doit' ||
		trimmed === 'process' ||
		trimmed === 'go' ||
		trimmed === 'extract' ||
		trimmed.length < 10
	);
}

function formatFileExtraction(filename: string, mimeType: string, text: string, pages?: { pageNum: number, text: string }[]): string {
	let output = `\n---\nSource file: ${filename}\nSource type: ${mimeType}\n`;
	if (pages && pages.length > 0) {
		output += `\n## For PDF pages:\n`;
		for (const page of pages) {
			output += `Source file: ${filename}\nPage: ${page.pageNum} ${page.text}\n-------------------\n`;
		}
	} else {
		output += `${text}\n`;
	}
	output += `------------------------------------------------------\n`;
	return output;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		let text = '';
		let client = 'Unresolved';
		let fixtureMode = false;
		let files: File[] = [];

		const contentType = request.headers.get('content-type') || '';
		if (contentType.includes('multipart/form-data')) {
			const formData = await request.formData();
			text = (formData.get('text') as string) || '';
			client = (formData.get('client') as string) || 'Unresolved';
			fixtureMode = formData.get('fixtureMode') === 'true';
			files = (formData.getAll('files') as unknown as File[]) || [];
		} else {
			const body = await request.json();
			text = body.text || '';
			client = body.client || 'Unresolved';
			fixtureMode = body.fixtureMode === true;
		}

		let combinedText = '';
		let fileContents = '';
		let hasTxtOrCsvOrPdf = false;
		let hasUnsupportedPdf = false;

		for (const file of files) {
			const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
			if (['txt', 'csv', 'pdf'].includes(extension)) {
				hasTxtOrCsvOrPdf = true;
				const mimeType = file.type || extension;
				if (extension === 'pdf') {
					try {
						const arrayBuffer = await file.arrayBuffer();
						const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
						const { text: pagesText } = await extractText(pdf, { mergePages: false });
						const pages: { pageNum: number, text: string }[] = [];
						let totalTextLength = 0;
						for (let i = 0; i < pagesText.length; i++) {
							const pageText = pagesText[i] || '';
							totalTextLength += pageText.trim().length;
							pages.push({ pageNum: i + 1, text: pageText });
						}
						if (totalTextLength === 0) {
							hasUnsupportedPdf = true;
						} else {
							fileContents += formatFileExtraction(file.name, mimeType, '', pages);
						}
					} catch (err) {
						console.error(`Failed to parse PDF ${file.name}:`, err);
						hasUnsupportedPdf = true;
					}
				} else {
					const content = await file.text();
					fileContents += formatFileExtraction(file.name, mimeType, content);
				}
			}
		}

		if (hasUnsupportedPdf && !fileContents) {
			return json({
				success: true,
				mode: 'failed',
				provider: 'fixture',
				fallbackReason: 'unsupported-scan',
				helperMessage: 'This file does not contain readable text. Upload a text-based PDF/CSV/TXT or paste the PO text.',
				lineItems: [],
				blockers: []
			});
		}

		const trimmedText = text.trim();
		if (hasTxtOrCsvOrPdf && fileContents) {
			if (trimmedText && !isShortOrDoIt(trimmedText)) {
				combinedText = trimmedText + '\n' + fileContents;
			} else {
				combinedText = fileContents.trim();
			}
		} else {
			combinedText = trimmedText;
		}

		if (fixtureMode !== true && (!combinedText || typeof combinedText !== 'string')) {
			return json({ success: false, error: 'Input text is required' }, { status: 400 });
		}

		const catalogRes = await db.execute('SELECT * FROM catalog_items');
		const catalog = catalogRes.rows.map((row: any) => ({
			styleCode: row.style_code,
			title: row.title,
			category: row.category,
			material: row.material,
			notes_en: row.notes_en,
			notes_id: row.notes_id,
			imageUrl: row.image_url
		}));

		const result = await extractOrder({
			text: combinedText,
			client: typeof client === 'string' ? client : '',
			catalog,
			env,
			fixtureMode: fixtureMode === true
		});

		return json({
			...result,
			combinedText
		});
	} catch (err) {
		console.error('API extraction failed:', err);
		return json({ success: false, error: 'Unable to process order' }, { status: 500 });
	}
};
