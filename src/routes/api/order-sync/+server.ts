import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { orderId, client, blockers, lineItems, customerUpdate, uploadedFiles, sourceText, status, milestones } = body;

		if (!orderId) {
			return json({ success: false, error: 'orderId is required' }, { status: 400 });
		}

		const now = Date.now();

		// 1. Upsert purchase_order
		await db.execute({
			sql: `
				INSERT INTO purchase_orders (id, po_number, client_name, status, source_text, uploaded_files, customer_update, milestones, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT(id) DO UPDATE SET
					client_name = excluded.client_name,
					status = excluded.status,
					source_text = excluded.source_text,
					uploaded_files = excluded.uploaded_files,
					customer_update = excluded.customer_update,
					milestones = excluded.milestones,
					updated_at = excluded.updated_at
			`,
			args: [
				orderId,
				orderId,
				client || 'La Jolla Artisan Boutique',
				status || 'Review',
				sourceText || '',
				JSON.stringify(uploadedFiles || []),
				customerUpdate || '',
				JSON.stringify(milestones || { moldsChecked: false, silverCast: false, qualityChecked: false, readyForShipping: false }),
				now,
				now
			]
		});

		// 2. Sync order_items (delete & re-insert)
		await db.execute({
			sql: 'DELETE FROM order_items WHERE po_id = ?',
			args: [orderId]
		});

		for (const item of lineItems || []) {
			const itemId = item.id || `item-${Math.random().toString(36).substr(2, 9)}`;
			await db.execute({
				sql: `
					INSERT INTO order_items (id, po_id, item_name, style_code, qty, finish, notes, unit_price, image_url, source, confidence_state, unresolved_fields)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
				args: [
					itemId.startsWith(`${orderId}:`) ? itemId : `${orderId}:${itemId}`,
					orderId,
					item.item || '',
					item.styleCode || '',
					item.qty || 0,
					item.finish || '',
					item.notes || '',
					item.unitPrice || 0,
					item.imageUrl || '',
					item.source || '',
					item.confidenceState || (item.styleCode ? 'resolved' : 'unresolved'),
					JSON.stringify(item.unresolvedFields || [])
				]
			});
		}

		// 3. Sync blockers (delete & re-insert)
		await db.execute({
			sql: 'DELETE FROM blockers WHERE po_id = ?',
			args: [orderId]
		});

		for (const blocker of blockers || []) {
			const blockerId = blocker.id || `blocker-${Math.random().toString(36).substr(2, 9)}`;
			await db.execute({
				sql: `
					INSERT INTO blockers (id, po_id, impact, question, evidence, source, risk, options, answer)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
				args: [
					blockerId.startsWith(`${orderId}:`) ? blockerId : `${orderId}:${blockerId}`,
					orderId,
					blocker.impact || '',
					blocker.question || '',
					blocker.evidence || '',
					blocker.source || '',
					blocker.risk || '',
					JSON.stringify(blocker.options || []),
					blocker.answer || ''
				]
			});
		}

		return json({ success: true });
	} catch (err: any) {
		console.error('Error syncing order data.');
		return json({ success: false, error: 'Unable to sync order data' }, { status: 500 });
	}
};
