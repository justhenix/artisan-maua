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
}
