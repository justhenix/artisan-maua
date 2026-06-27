import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		// 1. Fetch all purchase orders
		const poRes = await db.execute('SELECT * FROM purchase_orders ORDER BY updated_at DESC');
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

		// 2. Fetch all order items
		const itemsRes = await db.execute('SELECT * FROM order_items');
		const allItems = itemsRes.rows.map((row: any) => ({
			id: row.id as string,
			poId: row.po_id as string,
			item: row.item_name as string,
			styleCode: row.style_code as string,
			qty: row.qty as number,
			finish: row.finish as string,
			notes: row.notes as string,
			unitPrice: row.unit_price as number,
			imageUrl: row.image_url as string,
			source: row.source as string
		}));

		// 3. Fetch all blockers
		const blockersRes = await db.execute('SELECT * FROM blockers');
		const allBlockers = blockersRes.rows.map((row: any) => ({
			id: row.id as string,
			poId: row.po_id as string,
			impact: row.impact as string,
			impactKey: row.impact === 'High impact' ? 'highImpact' : 'mediumImpact',
			question: row.question as string,
			questionKey: row.id === 'starburst-size' ? 'starburstQuestion' : 'horseQuestion',
			evidence: row.evidence as string,
			source: row.source as string,
			risk: row.risk as string,
			riskKey: row.id === 'starburst-size' ? 'starburstRisk' : 'horseRisk',
			options: JSON.parse((row.options as string) || '[]'),
			answer: (row.answer as string) || ''
		}));

		// 4. Fetch catalog items
		const catalogRes = await db.execute('SELECT * FROM catalog_items');
		const catalogItems = catalogRes.rows.map((row: any) => ({
			styleCode: row.style_code as string,
			creativeTitle: row.title as string,
			baseLabor: row.base_labor as number,
			silverWeight: row.silver_weight as number,
			stoneCost: row.stone_cost as number,
			category: row.category as string,
			material: row.material as string,
			notes_en: row.notes_en as string,
			notes_id: row.notes_id as string,
			imageUrl: row.image_url as string
		}));

		return {
			orders,
			allItems,
			allBlockers,
			catalogItems
		};
	} catch (err) {
		console.error('Failed to load database data:', err);
		return {
			orders: [],
			allItems: [],
			allBlockers: [],
			catalogItems: []
		};
	}
};
