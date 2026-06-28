import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		const catalogRes = await db.execute('SELECT * FROM catalog_items ORDER BY style_code');
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

		return { catalogItems };
	} catch (err) {
		console.error('Failed to load catalog data:', err);
		return { catalogItems: [] };
	}
};