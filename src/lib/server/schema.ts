import { db } from './db';

export async function initDb() {
	// Create tables if they don't exist
	await db.execute(`
		CREATE TABLE IF NOT EXISTS purchase_orders (
			id TEXT PRIMARY KEY,
			po_number TEXT,
			client_name TEXT,
			status TEXT,
			source_text TEXT,
			uploaded_files TEXT,
			customer_update TEXT,
			milestones TEXT,
			created_at INTEGER,
			updated_at INTEGER
		)
	`);

	await db.execute(`
		CREATE TABLE IF NOT EXISTS order_items (
			id TEXT PRIMARY KEY,
			po_id TEXT,
			item_name TEXT,
			style_code TEXT,
			qty INTEGER,
			finish TEXT,
			notes TEXT,
			unit_price REAL,
			image_url TEXT,
			source TEXT
		)
	`);

	await db.execute(`
		CREATE TABLE IF NOT EXISTS catalog_items (
			style_code TEXT PRIMARY KEY,
			title TEXT,
			base_labor REAL,
			silver_weight REAL,
			stone_cost REAL,
			category TEXT,
			material TEXT,
			notes_en TEXT,
			notes_id TEXT,
			image_url TEXT
		)
	`);

	await db.execute(`
		CREATE TABLE IF NOT EXISTS blockers (
			id TEXT PRIMARY KEY,
			po_id TEXT,
			impact TEXT,
			question TEXT,
			evidence TEXT,
			source TEXT,
			risk TEXT,
			options TEXT,
			answer TEXT
		)
	`);

	// Seed catalog items if empty
	const existingCatalog = await db.execute('SELECT count(*) as count FROM catalog_items');
	const count = Number(existingCatalog.rows[0].count);

	if (count === 0) {
		const seedCatalog = [
			{ 
				styleCode: 'HB-HORSE-M', 
				creativeTitle: 'Horse Pin Medium', 
				baseLabor: 12.00, 
				silverWeight: 8.5, 
				stoneCost: 0,
				category: 'Pins',
				material: 'Silver',
				notes_en: 'Cast in sterling silver. Match master horse mold size M.',
				notes_id: 'Cor dalam perak murni. Sesuaikan dengan cetakan induk kuda ukuran M.',
				imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=120&h=120&fit=crop'
			},
			{ 
				styleCode: 'HB-HORSE-S', 
				creativeTitle: 'Horse Pin Small', 
				baseLabor: 9.50, 
				silverWeight: 5.0, 
				stoneCost: 0,
				category: 'Pins',
				material: 'Silver',
				notes_en: 'Cast in sterling silver. Match master horse mold size S.',
				notes_id: 'Cor dalam perak murni. Sesuaikan dengan cetakan induk kuda ukuran S.',
				imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=120&h=120&fit=crop'
			},
			{ 
				styleCode: 'HB-HORSE-L', 
				creativeTitle: 'Horse Pin Large', 
				baseLabor: 15.00, 
				silverWeight: 11.5, 
				stoneCost: 0,
				category: 'Pins',
				material: 'Silver',
				notes_en: 'Cast in sterling silver. Match master horse mold size L.',
				notes_id: 'Cor dalam perak murni. Sesuaikan dengan cetakan induk kuda ukuran L.',
				imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=120&h=120&fit=crop'
			},
			{ 
				styleCode: 'HB-MTN-P', 
				creativeTitle: 'Mountain Pendant', 
				baseLabor: 18.00, 
				silverWeight: 12.0, 
				stoneCost: 5.50,
				category: 'Traditional Jewelry',
				material: 'Silver',
				notes_en: 'Hand-carved snow structures and mother-of-pearl accent. Long chain.',
				notes_id: 'Struktur salju diukir tangan dengan hiasan kerang mutiara. Rantai panjang.',
				imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=120&h=120&fit=crop'
			},
			{ 
				styleCode: 'HB-WAVE-C', 
				creativeTitle: 'Wave Cuff', 
				baseLabor: 22.00, 
				silverWeight: 18.5, 
				stoneCost: 0,
				category: 'Traditional Jewelry',
				material: 'Silver',
				notes_en: 'Wave textured cuff. Hand-finish silver. 6.5 inch circumference.',
				notes_id: 'Gelang bertekstur ombak. Perak polesan tangan. Lingkar 6.5 inci.',
				imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=120&h=120&fit=crop'
			},
			{ 
				styleCode: 'HB-SB-STUD', 
				creativeTitle: 'Starburst Studs', 
				baseLabor: 15.00, 
				silverWeight: 6.2, 
				stoneCost: 2.00,
				category: 'Traditional Jewelry',
				material: 'Gold',
				notes_en: 'Starburst design with gold vermeil finish. Match gold thickness rules.',
				notes_id: 'Desain starburst dengan lapisan emas vermeil. Sesuaikan ketebalan emas.',
				imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=120&h=120&fit=crop'
			},
			{ 
				styleCode: 'HB-TSR-2', 
				creativeTitle: 'Thin Stacking Ring', 
				baseLabor: 5.00, 
				silverWeight: 2.1, 
				stoneCost: 0,
				category: 'Traditional Jewelry',
				material: 'Silver',
				notes_en: 'Thin stacking ring. Mix sizes 7 and 8.',
				notes_id: 'Cincin tumpuk tipis. Campuran ukuran 7 dan 8.',
				imageUrl: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=120&h=120&fit=crop'
			},
			{ 
				styleCode: 'HB-CC-18', 
				creativeTitle: 'Cable Chain 18"', 
				baseLabor: 4.00, 
				silverWeight: 4.5, 
				stoneCost: 0,
				category: 'Others',
				material: 'Silver',
				notes_en: 'Cable chain 18 inches. Check links and clasp durability.',
				notes_id: 'Rantai kabel 18 inci. Periksa ketahanan sambungan dan pengait.',
				imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=120&h=120&fit=crop'
			},
			{ 
				styleCode: 'HB-SB-MINI', 
				creativeTitle: 'Bali Starburst Mini', 
				baseLabor: 8.00, 
				silverWeight: 3.5, 
				stoneCost: 0,
				category: 'Traditional Jewelry',
				material: 'Silver',
				notes_en: 'Mini starburst studs in sterling silver.',
				notes_id: 'Anting giwang starburst mini dalam perak murni.',
				imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=120&h=120&fit=crop'
			},
			{ 
				styleCode: 'HB-SB-SMALL', 
				creativeTitle: 'Bali Starburst Small', 
				baseLabor: 10.00, 
				silverWeight: 4.8, 
				stoneCost: 0,
				category: 'Traditional Jewelry',
				material: 'Silver',
				notes_en: 'Small starburst studs in sterling silver.',
				notes_id: 'Anting giwang starburst kecil dalam perak murni.',
				imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=120&h=120&fit=crop'
			},
			{ 
				styleCode: 'HB-SB-LARGE', 
				creativeTitle: 'Bali Starburst Large', 
				baseLabor: 14.00, 
				silverWeight: 7.2, 
				stoneCost: 0,
				category: 'Traditional Jewelry',
				material: 'Silver',
				notes_en: 'Large starburst studs in sterling silver.',
				notes_id: 'Anting giwang starburst besar dalam perak murni.',
				imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=120&h=120&fit=crop'
			}
		];

		for (const item of seedCatalog) {
			await db.execute({
				sql: `
					INSERT INTO catalog_items (style_code, title, base_labor, silver_weight, stone_cost, category, material, notes_en, notes_id, image_url)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
				args: [
					item.styleCode,
					item.creativeTitle,
					item.baseLabor,
					item.silverWeight,
					item.stoneCost,
					item.category,
					item.material,
					item.notes_en,
					item.notes_id,
					item.imageUrl
				]
			});
		}
	}

	// Seed purchase orders if empty
	const existingPO = await db.execute('SELECT count(*) as count FROM purchase_orders');
	const poCount = Number(existingPO.rows[0].count);

	if (poCount === 0) {
		const now = Date.now();

		// 1. Seed Order HB-250416 (Reviewing status)
		await db.execute({
			sql: `
				INSERT INTO purchase_orders (id, po_number, client_name, status, source_text, uploaded_files, customer_update, milestones, created_at, updated_at)
				VALUES ('HB-250416', 'HB-250416', 'Mia - Driftwood Collective', 'Review', ?, '[]', ?, ?, ?, ?)
			`,
			args: [
				`Subject: Production order Driftwood Collective\nDate: April 16, 2026\n\nHi Heather,\nHere is our order details for the upcoming summer boutique delivery:\n- 12x Horse Pin Medium (HB-HORSE-M) - silver\n- 6x Mountain Pendant (HB-MTN-P) - pearl accent\n- 4x Wave Cuff (HB-WAVE-C) - silver, size 6.5"\n- 24x Starburst Studs (HB-SB-STUD) - gold vermeil\n- 20x Thin Stacking Ring (HB-TSR-2) - silver\n- 10x Cable Chain 18" (HB-CC-18)\n- 8x Bali Starburst (mini star?)\n- 6x Horse Pin (new smaller horse pin)`,
				`Hi Mia,\n\nThank you for your order. We reviewed the details and everything needed for production is now ready.\n\nOrder summary\n- 8 items\n- Total quantity: 90\n- Finishes: Silver, Gold Vermeil, Mother of Pearl\n\nTimeline\n- Production start: June 3, 2026\n- Estimated completion: June 20, 2026\n- Need by: July 10, 2026\n\nWe will send another update once production begins. Please reach out if anything needs to change.\n\nThank you,\nHeather Benjamin Jewelry`,
				JSON.stringify({
					moldsChecked: false,
					silverCast: false,
					qualityChecked: false,
					readyForShipping: false
				}),
				now,
				now
			]
		});

		const defaultItems = [
			{ id: 'horse-medium', item: 'Horse Pin Medium', styleCode: 'HB-HORSE-M', qty: 12, finish: 'Silver', notes: 'Match last order', source: 'Copied PO text', unitPrice: 32.00, imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=120&h=120&fit=crop' },
			{ id: 'mountain-pendant', item: 'Mountain Pendant', styleCode: 'HB-MTN-P', qty: 6, finish: 'Mother of Pearl', notes: 'Confirm longer chain', source: 'Copied PO text', unitPrice: 42.00, imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=120&h=120&fit=crop' },
			{ id: 'wave-cuff', item: 'Wave Cuff', styleCode: 'HB-WAVE-C', qty: 4, finish: 'Silver', notes: '6.5" if possible', source: 'Copied PO text', unitPrice: 75.00, imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=120&h=120&fit=crop' },
			{ id: 'starburst-studs', item: 'Starburst Studs', styleCode: 'HB-SB-STUD', qty: 24, finish: 'Gold Vermeil', notes: 'Pack 12 pairs per card', source: 'Copied PO text', unitPrice: 38.00, imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=120&h=120&fit=crop' },
			{ id: 'thin-stacking-ring', item: 'Thin Stacking Ring', styleCode: 'HB-TSR-2', qty: 20, finish: 'Silver', notes: 'Mix sizes 7 and 8', source: 'Copied PO text', unitPrice: 12.00, imageUrl: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=120&h=120&fit=crop' },
			{ id: 'cable-chain', item: 'Cable Chain 18"', styleCode: 'HB-CC-18', qty: 10, finish: 'Silver', notes: 'Need by 7/10', source: 'CSV row', unitPrice: 15.00, imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=120&h=120&fit=crop' },
			{ id: 'bali-starburst', item: 'Bali Starburst (Size Unresolved)', styleCode: '', qty: 8, finish: 'Silver', notes: 'Awaiting size resolution', source: 'Pasted DM', unitPrice: 18.00, imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=120&h=120&fit=crop' },
			{ id: 'horse-unclear', item: 'Horse Pin (Size Unresolved)', styleCode: '', qty: 6, finish: 'Silver', notes: 'Awaiting size resolution', source: 'Copied PO text', unitPrice: 25.00, imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=120&h=120&fit=crop' }
		];

		for (const item of defaultItems) {
			await db.execute({
				sql: `
					INSERT INTO order_items (id, po_id, item_name, style_code, qty, finish, notes, unit_price, image_url, source)
					VALUES (?, 'HB-250416', ?, ?, ?, ?, ?, ?, ?, ?)
				`,
				args: [item.id, item.item, item.styleCode, item.qty, item.finish, item.notes, item.unitPrice, item.imageUrl, item.source]
			});
		}

		await db.execute({
			sql: `
				INSERT INTO blockers (id, po_id, impact, question, evidence, source, risk, options, answer)
				VALUES 
				('starburst-size', 'HB-250416', 'High impact', 'Which Starburst size should Bali make?', 'mini star', 'Pasted DM', 'Size changes casting, stone layout, packing count, and production time.', '["Mini", "Small", "Large"]', ''),
				('horse-pin-size', 'HB-250416', 'Medium impact', 'Which Horse Pin size is this?', 'new smaller horse pin', 'Copied PO text', 'Horse Pin sizes map to different style codes and wholesale packing labels.', '["Small", "Medium", "Large"]', '')
			`
		});

		// 2. Seed Order HB-250417 (In Production status)
		await db.execute({
			sql: `
				INSERT INTO purchase_orders (id, po_number, client_name, status, source_text, uploaded_files, customer_update, milestones, created_at, updated_at)
				VALUES ('HB-250417', 'HB-250417', 'La Jolla Artisan Boutique', 'Production', 'La Jolla order 12wave cuff', '[]', '', ?, ?, ?, ?)
			`,
			args: [
				JSON.stringify({
					moldsChecked: true,
					silverCast: true,
					qualityChecked: false,
					readyForShipping: false
				}),
				now - 86400000,
				now - 86400000
			]
		});

		await db.execute({
			sql: `
				INSERT INTO order_items (id, po_id, item_name, style_code, qty, finish, notes, unit_price, image_url, source)
				VALUES ('lajolla-1', 'HB-250417', 'Wave Cuff', 'HB-WAVE-C', 12, 'Silver', 'Urgent production', 75.00, 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=120&h=120&fit=crop', 'Email')
			`
		});

		// 3. Seed Order HB-250418 (Completed/Shipped status)
		await db.execute({
			sql: `
				INSERT INTO purchase_orders (id, po_number, client_name, status, source_text, uploaded_files, customer_update, milestones, created_at, updated_at)
				VALUES ('HB-250418', 'HB-250418', 'Driftwood Collective (Stock)', 'Completed', 'Stock replenish wave studs', '[]', '', ?, ?, ?, ?)
			`,
			args: [
				JSON.stringify({
					moldsChecked: true,
					silverCast: true,
					qualityChecked: true,
					readyForShipping: true
				}),
				now - 172800000,
				now - 172800000
			]
		});

		await db.execute({
			sql: `
				INSERT INTO order_items (id, po_id, item_name, style_code, qty, finish, notes, unit_price, image_url, source)
				VALUES ('stock-1', 'HB-250418', 'Starburst Studs', 'HB-SB-STUD', 50, 'Gold Vermeil', 'Standard packaging', 38.00, 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=120&h=120&fit=crop', 'System')
			`
		});
	}
}
