import { createClient } from '@libsql/client';

const url = process.env.TURSO_CONNECTION_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
	console.error('TURSO_CONNECTION_URL not set');
	process.exit(1);
}

const db = createClient({ url, authToken });

async function cleanup() {
	console.log('Connected to:', url.replace(/\/\/.*@/, '//***@'));

	// Count before
	const before = await db.execute('SELECT count(*) as count FROM purchase_orders');
	console.log('Orders before:', Number(before.rows[0].count));

	// Wipe order data (catalog stays)
	await db.execute('DELETE FROM blockers');
	await db.execute('DELETE FROM order_items');
	await db.execute('DELETE FROM purchase_orders');
	console.log('Wiped blockers, order_items, purchase_orders');

	// Count after
	const after = await db.execute('SELECT count(*) as count FROM purchase_orders');
	console.log('Orders after:', Number(after.rows[0].count));

	const catalog = await db.execute('SELECT count(*) as count FROM catalog_items');
	console.log('Catalog items preserved:', Number(catalog.rows[0].count));

	console.log('Done. initDb() will re-seed on next server start.');
}

cleanup().catch((err) => {
	console.error('Cleanup failed:', err.message);
	process.exit(1);
});
