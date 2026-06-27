import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		const orderId = 'HB-250416'; // Demo order ID

		// 1. Fetch purchase order
		const poRes = await db.execute({
			sql: 'SELECT * FROM purchase_orders WHERE id = ?',
			args: [orderId]
		});

		// 2. Fetch catalog items
		const catalogRes = await db.execute('SELECT * FROM catalog_items');
		const catalogItems = catalogRes.rows.map((row: any) => ({
			styleCode: row.style_code,
			creativeTitle: row.title,
			baseLabor: row.base_labor,
			silverWeight: row.silver_weight,
			stoneCost: row.stone_cost,
			category: row.category,
			material: row.material,
			notes_en: row.notes_en,
			notes_id: row.notes_id,
			imageUrl: row.image_url
		}));

		if (poRes.rows.length === 0) {
			return {
				savedOrder: null,
				catalogItems
			};
		}

		const po = poRes.rows[0];

		// 3. Fetch order items
		const itemsRes = await db.execute({
			sql: 'SELECT * FROM order_items WHERE po_id = ?',
			args: [orderId]
		});
		const lineItems = itemsRes.rows.map((row: any) => ({
			id: row.id,
			item: row.item_name,
			styleCode: row.style_code,
			qty: row.qty,
			finish: row.finish,
			notes: row.notes,
			source: row.source,
			unitPrice: row.unit_price,
			imageUrl: row.image_url
		}));

		// 4. Fetch blockers
		const blockersResReal = await db.execute({
			sql: 'SELECT * FROM blockers WHERE po_id = ?',
			args: [orderId]
		});
		const blockers = blockersResReal.rows.map((row: any) => ({
			id: row.id,
			impact: row.impact,
			impactKey: row.impact === 'High impact' ? 'highImpact' : 'mediumImpact',
			question: row.question,
			questionKey: row.id === 'starburst-size' ? 'starburstQuestion' : 'horseQuestion',
			evidence: row.evidence,
			source: row.source,
			risk: row.risk,
			riskKey: row.id === 'starburst-size' ? 'starburstRisk' : 'horseRisk',
			options: JSON.parse(row.options || '[]'),
			answer: row.answer || ''
		}));

		return {
			savedOrder: {
				orderId: po.id as string,
				client: po.client_name as string,
				sourceText: po.source_text as string,
				customerUpdate: po.customer_update as string,
				uploadedFiles: JSON.parse((po.uploaded_files as string) || '[]'),
				lineItems,
				blockers
			},
			catalogItems
		};
	} catch (err) {
		console.error('Failed to load database data:', err);
		return {
			savedOrder: null,
			catalogItems: []
		};
	}
};
