import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { getCachedCatalog } from '$lib/server/catalogCache';

export const load: PageServerLoad = async () => {
	try {
		const [poRes, itemsRes, blockersRes, catalogItems] = await Promise.all([
			db.execute('SELECT * FROM purchase_orders ORDER BY updated_at DESC'),
			db.execute('SELECT * FROM order_items'),
			db.execute('SELECT * FROM blockers'),
			getCachedCatalog()
		]);

		const orders = poRes.rows.map((row: any) => ({
			id: row.id as string,
			poNumber: row.po_number as string,
			clientName: row.client_name as string,
			status: row.status as string,
			sourceText: row.source_text as string,
			customerUpdate: row.customer_update as string,
			uploadedFiles: JSON.parse((row.uploaded_files as string) || '[]'),
			milestones: JSON.parse((row.milestones as string) || '{}'),
			createdAt: row.created_at as number,
			updatedAt: row.updated_at as number
		}));

		const allItems = itemsRes.rows.map((row: any) => {
			const styleCode = (row.style_code as string) || '';
			const unresolvedFields = JSON.parse((row.unresolved_fields as string) || '[]');
			if (!styleCode && !unresolvedFields.includes('style code')) unresolvedFields.push('style code');
			return {
				poId: row.po_id as string,
				id: String(row.id).startsWith(`${row.po_id}:`)
					? String(row.id).slice(String(row.po_id).length + 1)
					: (row.id as string),
				item: row.item_name as string,
				styleCode,
				qty: row.qty as number,
				finish: row.finish as string,
				notes: row.notes as string,
				unitPrice: row.unit_price as number,
				imageUrl: row.image_url as string,
				source: row.source as string,
				confidenceState: (row.confidence_state as string) || (styleCode ? 'resolved' : 'unresolved'),
				unresolvedFields
			};
		});

		const allBlockers = blockersRes.rows.map((row: any) => {
			const id = String(row.id).startsWith(`${row.po_id}:`)
				? String(row.id).slice(String(row.po_id).length + 1)
				: (row.id as string);
			return {
				poId: row.po_id as string,
				id,
				impact: row.impact as string,
				impactKey: row.impact === 'High impact' ? 'highImpact' : 'mediumImpact',
				question: row.question as string,
				questionKey: id === 'star-bird-finish' ? 'starBirdQuestion' : id === 'bird-of-prey-size' ? 'birdOfPreyQuestion' : undefined,
				evidence: row.evidence as string,
				source: row.source as string,
				risk: row.risk as string,
				riskKey: id === 'star-bird-finish' ? 'starBirdRisk' : id === 'bird-of-prey-size' ? 'birdOfPreyRisk' : undefined,
				options: JSON.parse((row.options as string) || '[]'),
				answer: (row.answer as string) || ''
			};
		});

		return {
			orders,
			allItems,
			allBlockers,
			catalogItems
		};
	} catch (err) {
		console.error('Failed to load database data.');
		return {
			orders: [],
			allItems: [],
			allBlockers: [],
			catalogItems: []
		};
	}
};
