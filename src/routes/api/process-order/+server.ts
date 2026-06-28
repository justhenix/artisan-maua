import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { env } from '$env/dynamic/private';
import { extractOrder } from '$lib/server/orderExtraction';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { text, client, fixtureMode } = await request.json();

		if (fixtureMode !== true && (!text || typeof text !== 'string')) {
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
			text: typeof text === 'string' ? text : '',
			client: typeof client === 'string' ? client : '',
			catalog,
			env,
			fixtureMode: fixtureMode === true
		});

		return json(result);
	} catch {
		return json({ success: false, error: 'Unable to process order' }, { status: 500 });
	}
};
