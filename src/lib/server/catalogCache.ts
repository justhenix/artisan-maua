import { db } from './db';

export type CatalogItem = {
	styleCode: string;
	creativeTitle: string;
	baseLabor: number;
	silverWeight: number;
	stoneCost: number;
	department: string;
	category: string;
	collection: string;
	material: string;
	notes_en: string;
	notes_id: string;
	imageUrl: string;
};

let cachedCatalog: CatalogItem[] | null = null;

export async function getCachedCatalog(): Promise<CatalogItem[]> {
	if (cachedCatalog) {
		return cachedCatalog;
	}

	try {
		const catalogRes = await db.execute('SELECT * FROM catalog_items ORDER BY style_code');
		cachedCatalog = catalogRes.rows.map((row: any) => ({
			styleCode: row.style_code as string,
			creativeTitle: row.title as string,
			baseLabor: row.base_labor as number,
			silverWeight: row.silver_weight as number,
			stoneCost: row.stone_cost as number,
			department: (row.department as string) || 'Others',
			category: (row.category as string) || 'Others',
			collection: (row.collection as string) || 'Others',
			material: row.material as string,
			notes_en: row.notes_en as string,
			notes_id: row.notes_id as string,
			imageUrl: row.image_url as string
		}));
		return cachedCatalog;
	} catch (err) {
		console.error('Failed to load catalog cache:', err);
		return [];
	}
}

export function invalidateCatalogCache() {
	cachedCatalog = null;
}
