import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { getCachedCatalog, invalidateCatalogCache } from '$lib/server/catalogCache';

export const load: PageServerLoad = async () => {
	try {
		const catalogItems = await getCachedCatalog();
		return { catalogItems };
	} catch (err) {
		console.error('Failed to load catalog data:', err);
		return { catalogItems: [] };
	}
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const styleCode = (data.get('styleCode') as string || '').trim();
		const title = (data.get('title') as string || '').trim();
		const baseLabor = parseFloat(data.get('baseLabor') as string) || 0;
		const silverWeight = parseFloat(data.get('silverWeight') as string) || 0;
		const stoneCost = parseFloat(data.get('stoneCost') as string) || 0;
		const department = data.get('department') as string || 'Others';
		const category = data.get('category') as string || 'Others';
		const collection = data.get('collection') as string || 'Others';
		const material = data.get('material') as string || 'Silver';
		const notes_en = (data.get('notes_en') as string || '').trim();
		const notes_id = (data.get('notes_id') as string || '').trim();
		const imageUrl = (data.get('imageUrl') as string || '').trim();

		if (!styleCode || !title) {
			return { success: false, error: 'Style code and title are required' };
		}

		try {
			await db.execute({
				sql: `INSERT INTO catalog_items 
					(style_code, title, base_labor, silver_weight, stone_cost, department, category, collection, material, notes_en, notes_id, image_url)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				args: [styleCode, title, baseLabor, silverWeight, stoneCost, department, category, collection, material, notes_en, notes_id, imageUrl]
			});
			invalidateCatalogCache();
			return { success: true };
		} catch (err: any) {
			console.error('Failed to create catalog item:', err);
			return { success: false, error: err.message || 'Database error' };
		}
	},

	update: async ({ request }) => {
		const data = await request.formData();
		const originalStyleCode = data.get('originalStyleCode') as string;
		const styleCode = (data.get('styleCode') as string || '').trim();
		const title = (data.get('title') as string || '').trim();
		const baseLabor = parseFloat(data.get('baseLabor') as string) || 0;
		const silverWeight = parseFloat(data.get('silverWeight') as string) || 0;
		const stoneCost = parseFloat(data.get('stoneCost') as string) || 0;
		const department = data.get('department') as string || 'Others';
		const category = data.get('category') as string || 'Others';
		const collection = data.get('collection') as string || 'Others';
		const material = data.get('material') as string || 'Silver';
		const notes_en = (data.get('notes_en') as string || '').trim();
		const notes_id = (data.get('notes_id') as string || '').trim();
		const imageUrl = (data.get('imageUrl') as string || '').trim();

		if (!originalStyleCode || !styleCode || !title) {
			return { success: false, error: 'Original style code, style code, and title are required' };
		}

		try {
			await db.execute({
				sql: `UPDATE catalog_items SET 
					style_code = ?, title = ?, base_labor = ?, silver_weight = ?, stone_cost = ?, 
					department = ?, category = ?, collection = ?, material = ?, 
					notes_en = ?, notes_id = ?, image_url = ?
					WHERE style_code = ?`,
				args: [styleCode, title, baseLabor, silverWeight, stoneCost, department, category, collection, material, notes_en, notes_id, imageUrl, originalStyleCode]
			});
			invalidateCatalogCache();
			return { success: true };
		} catch (err: any) {
			console.error('Failed to update catalog item:', err);
			return { success: false, error: err.message || 'Database error' };
		}
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const styleCode = data.get('styleCode') as string;

		if (!styleCode) {
			return { success: false, error: 'Style code is required' };
		}

		try {
			await db.execute({
				sql: 'DELETE FROM catalog_items WHERE style_code = ?',
				args: [styleCode]
			});
			invalidateCatalogCache();
			return { success: true };
		} catch (err: any) {
			console.error('Failed to delete catalog item:', err);
			return { success: false, error: err.message || 'Database error' };
		}
	}
};