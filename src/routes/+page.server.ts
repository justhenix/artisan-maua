import type { PageServerLoad, Actions } from './$types';
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

		const allItems = itemsRes.rows.map((row: any) => ({
			poId: row.po_id as string,
			id: String(row.id).startsWith(`${row.po_id}:`)
				? String(row.id).slice(String(row.po_id).length + 1)
				: (row.id as string),
			item: row.item_name as string,
			styleCode: row.style_code as string,
			qty: row.qty as number,
			finish: row.finish as string,
			notes: row.notes as string,
			unitPrice: row.unit_price as number,
			imageUrl: row.image_url as string,
			source: row.source as string
		}));

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
				questionKey: id === 'star-bird-finish' ? 'starBirdQuestion' : 'birdOfPreyQuestion',
				evidence: row.evidence as string,
				source: row.source as string,
				risk: row.risk as string,
				riskKey: id === 'star-bird-finish' ? 'starBirdRisk' : 'birdOfPreyRisk',
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
		console.error('Failed to load database data:', err);
		return {
			orders: [],
			allItems: [],
			allBlockers: [],
			catalogItems: []
		};
	}
};

export const actions: Actions = {
	recalculate: async ({ request }) => {
		const data = await request.formData();
		const spotRate = parseFloat(data.get('silverSpotRate') as string) || 1.00;

		try {
			const activeOrdersRes = await db.execute(
				"SELECT id FROM purchase_orders WHERE status IN ('Review', 'Production', 'Packing')"
			);
			const activePoIds = activeOrdersRes.rows.map((row: any) => row.id);

			if (activePoIds.length > 0) {
				const catalog = await getCachedCatalog();
				const catalogMap = new Map();
				for (const item of catalog) {
					catalogMap.set(item.styleCode, {
						baseLabor: item.baseLabor,
						silverWeight: item.silverWeight
					});
				}

				const placeholders = activePoIds.map(() => '?').join(',');
				const itemsRes = await db.execute({
					sql: `SELECT id, po_id, style_code FROM order_items WHERE po_id IN (${placeholders})`,
					args: activePoIds
				});

				for (const row of itemsRes.rows) {
					const poId = row.po_id as string;
					const itemId = row.id as string;
					const styleCode = row.style_code as string;
					const catalogItem = catalogMap.get(styleCode);

					if (catalogItem) {
						const artisanLabor = catalogItem.baseLabor || 0;
						const silverMass = catalogItem.silverWeight || 0;
						const markupMargin = 2.0;
						const newPrice = Math.round((artisanLabor + (silverMass * spotRate) * markupMargin) * 100) / 100;

						await db.execute({
							sql: "UPDATE order_items SET unit_price = ? WHERE id = ? AND po_id = ?",
							args: [newPrice, itemId, poId]
						});
					}
				}
			}
			return { success: true, spotRate };
		} catch (err) {
			console.error("Recalculation action failed:", err);
			return { success: false, error: 'Failed to update cost parameters' };
		}
	}
};
