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
			source TEXT,
			confidence_state TEXT,
			unresolved_fields TEXT
		)
	`);

	await db.execute(`
		CREATE TABLE IF NOT EXISTS catalog_items (
			style_code TEXT PRIMARY KEY,
			title TEXT,
			base_labor REAL,
			silver_weight REAL,
			stone_cost REAL,
			department TEXT,
			category TEXT,
			collection TEXT,
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

	// Migration: Ensure columns added in newer versions exist
	try {
		await db.execute('ALTER TABLE purchase_orders ADD COLUMN milestones TEXT');
	} catch (e) {
		// Ignore if column already exists
	}
	try {
		await db.execute('ALTER TABLE order_items ADD COLUMN unit_price REAL');
	} catch (e) {
		// Ignore if column already exists
	}
	try {
		await db.execute('ALTER TABLE order_items ADD COLUMN image_url TEXT');
	} catch (e) {
		// Ignore if column already exists
	}
	try {
		await db.execute('ALTER TABLE order_items ADD COLUMN confidence_state TEXT');
	} catch (e) {
		// Ignore if column already exists
	}
	try {
		await db.execute('ALTER TABLE order_items ADD COLUMN unresolved_fields TEXT');
	} catch (e) {
		// Ignore if column already exists
	}

	// Seed catalog items if empty
	const existingCatalog = await db.execute('SELECT count(*) as count FROM catalog_items');
	const count = Number(existingCatalog.rows[0].count);

	if (count === 0) {
		const seedCatalog = [
  {
    "styleCode": "HB-MEDIUM-GOLDEN-B",
    "creativeTitle": "Medium Golden Bird of Prey Hat Stud",
    "baseLabor": 15,
    "silverWeight": 5,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Freedom & Spirit",
    "material": "Gold",
    "notes_en": "Bird, plane, eagle and hawk...hand carved out of bone and cast in recycled sterling silver plated with 18k gold. This special golden bird of prey is s",
    "notes_id": "Dibuat dengan tangan medium golden bird of prey hat stud dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/files/Screenshot2025-12-09at12.22.01AM.png?v=1765261804"
  },
  {
    "styleCode": "HB-FEATHER-HAT-PIN",
    "creativeTitle": "Feather Hat Pin",
    "baseLabor": 9,
    "silverWeight": 3,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Freedom & Spirit",
    "material": "Silver",
    "notes_en": "Mother earth meets Sky in these sweet and delicate feather pins. Intricately hand-carved mother of pearl or cast and carved feathers. Recycled sterlin",
    "notes_id": "Dibuat dengan tangan feather hat pin dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-01-04at12.24.17AM.png?v=1641318568"
  },
  {
    "styleCode": "HB-BIRD-OF-PREY-HA",
    "creativeTitle": "Bird of Prey Hat Jewelry Pin",
    "baseLabor": 63.8,
    "silverWeight": 21.3,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Freedom & Spirit",
    "material": "Silver",
    "notes_en": "Adorn your hat (jacket, sweater or lapel) with authenticity. Hand carved out of bone from a water buffalo (who lived a full life and died a natural de",
    "notes_id": "Dibuat dengan tangan bird of prey hat jewelry pin dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/files/IMG_0631.heic?v=1695929392"
  },
  {
    "styleCode": "HE-4720-GP-1",
    "creativeTitle": "Golden Love Shard Pin - Single",
    "baseLabor": 7.5,
    "silverWeight": 2.5,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Celestial Story",
    "material": "Gold",
    "notes_en": "Explore, experience and adorn with this perfectly balanced masuline and feminie love shard. Tribal elegance meets Lunar Love in these perfectly formed",
    "notes_id": "Dibuat dengan tangan golden love shard pin - single dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2020-03-25at7.15.57PM.png?v=1590122461"
  },
  {
    "styleCode": "HB-MOTHER-OF-PEARL",
    "creativeTitle": "Mother of Pearl Silver Star Hat Stud",
    "baseLabor": 18.8,
    "silverWeight": 6.3,
    "stoneCost": 10,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Celestial Story",
    "material": "Silver",
    "notes_en": "Explore, experience and adorn with this rustic golden arrowhead hat stud-hand carved and cast our of recycled sterling silver - plated with gold",
    "notes_id": "Dibuat dengan tangan mother of pearl silver star hat stud dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-09-29at9.22.09PM.png?v=1664508134"
  },
  {
    "styleCode": "HB-CRESCENT-LUNAR-",
    "creativeTitle": "Crescent Lunar Golden Medium",
    "baseLabor": 22.5,
    "silverWeight": 7.5,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Celestial Story",
    "material": "Gold",
    "notes_en": "Explore, experience and adorn with this medium golden crescent lunar shape hat stud. A perfect blend of tribal, elegant, celestial and magical. A port",
    "notes_id": "Dibuat dengan tangan crescent lunar golden medium dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-09-28at4.03.47PM.png?v=1664402632"
  },
  {
    "styleCode": "HB-MINI-GOLDEN-BIR",
    "creativeTitle": "Mini Golden Bird of Prey Hat Stud",
    "baseLabor": 10.5,
    "silverWeight": 3.5,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Freedom & Spirit",
    "material": "Gold",
    "notes_en": "Bird, plane, eagle and hawk...hand carved out of bone and cast in recycled sterling silver plated with 18 k gold. This special bird of prey is so deta",
    "notes_id": "Dibuat dengan tangan mini golden bird of prey hat stud dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-09-27at2.37.29PM.png?v=1664311054"
  },
  {
    "styleCode": "HB-BIRD-OF-PREY-SI",
    "creativeTitle": "Bird of Prey Silver Hat Jewelry Pin",
    "baseLabor": 52.5,
    "silverWeight": 17.5,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Freedom & Spirit",
    "material": "Silver",
    "notes_en": "Adorn your hat (jacket, sweater or lapel) with authenticity. Hand carved out of bone from a water buffalo (who lived a full life and died a natural de",
    "notes_id": "Dibuat dengan tangan bird of prey silver hat jewelry pin dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-09-27at1.10.08PM.png?v=1765256748"
  },
  {
    "styleCode": "HB-40523-SIL",
    "creativeTitle": "Medium Silver Elephant Pin",
    "baseLabor": 27.8,
    "silverWeight": 9.3,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Power & Protection",
    "material": "Silver",
    "notes_en": "Water buffalo bone center Ganesha carve, cast sterling silver, oxidized.",
    "notes_id": "Ukiran Ganesha di pusat tulang kerbau air, perak sterling teroksidasi.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-09-27at12.37.23PM.png?v=1664303848"
  },
  {
    "styleCode": "HB-WATER-BUFFALO-LONG-HORN-PIN",
    "creativeTitle": "Silver Water Buffalo \"Long Horn\" Pin",
    "baseLabor": 52.5,
    "silverWeight": 17.5,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Power & Protection",
    "material": "Silver",
    "notes_en": "The Indonesian Water buffalo/long horn is the symbol of wealth, strength, fertility and prosperity. Hand Carved from water buffalo bone and Cast out o",
    "notes_id": "Dibuat dengan tangan silver water buffalo \"long horn\" pin dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2021-12-06at10.35.47PM.png?v=1638848173"
  },
  {
    "styleCode": "HB-P9015-GP",
    "creativeTitle": "Mother of Pearl Gold Plated Silver Star Pin",
    "baseLabor": 19.5,
    "silverWeight": 6.5,
    "stoneCost": 10.4,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Celestial Story",
    "material": "Gold",
    "notes_en": "Explore, experience and adorn with this rustic carved bone arrowhead hat stud-hand carved and claw set in recycled sterling silver plated with gold",
    "notes_id": "Dibuat dengan tangan mother of pearl gold plated silver star pin dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-09-29at9.20.00PM.png?v=1664508004"
  },
  {
    "styleCode": "HB-BLACK-LIP-STAR-",
    "creativeTitle": "Black Lip Star with Bird of Prey Dangle - Golden",
    "baseLabor": 29.3,
    "silverWeight": 9.8,
    "stoneCost": 15.6,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Celestial Story",
    "material": "Gold",
    "notes_en": "Explore, experiece and adorn with this small black lip shell star and bid of prey dangle hat stud- recycled sterling silver -plated with gold With cel",
    "notes_id": "Dibuat dengan tangan black lip star with bird of prey dangle - golden dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-09-28at3.35.10PM.png?v=1664400928"
  },
  {
    "styleCode": "HB-GOLDEN-ARROWHEA",
    "creativeTitle": "Golden Arrowhead",
    "baseLabor": 33.8,
    "silverWeight": 11.3,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Transformation",
    "material": "Gold",
    "notes_en": "Explore, experiece and adorn with this rustic golden arrowhead hat stud-hand carved and cast our of recycled sterling silver - plated with gold A port",
    "notes_id": "Dibuat dengan tangan golden arrowhead dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/HB-61.jpg?v=1676369530"
  },
  {
    "styleCode": "HB-GOLDEN-LARGE-DE",
    "creativeTitle": "Golden Large Deer Antler - Hat Pin",
    "baseLabor": 27.8,
    "silverWeight": 9.3,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Transformation",
    "material": "Gold",
    "notes_en": "Explore, experience and adorn with this hand carved and cast Golden Large Deer Antler--recycled sterling silver plated with gold hat pin This powerful",
    "notes_id": "Dibuat dengan tangan golden large deer antler - hat pin dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-09-28at4.19.25PM.png?v=1664403570"
  },
  {
    "styleCode": "HB-WOLF-PIN-SILVER",
    "creativeTitle": "Wolf Pin - Silver Oxy",
    "baseLabor": 30,
    "silverWeight": 10,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Transformation",
    "material": "Silver",
    "notes_en": "Hand Carved and cast with incredible delicacy and specificity. This Sculptural pieces is your newest and most complex friend \"Shera\" Embracing the pow",
    "notes_id": "Dibuat dengan tangan wolf pin - silver oxy dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/files/Screenshot2025-12-09at12.19.03AM.png?v=1765261186"
  },
  {
    "styleCode": "HB-BIRD-OF-PREY-GO",
    "creativeTitle": "Bird of Prey Gold Plate Hat Jewelry Pin",
    "baseLabor": 61.5,
    "silverWeight": 20.5,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Freedom & Spirit",
    "material": "Gold",
    "notes_en": "Adorn your hat (jacket, sweater or lapel) with authenticity. Hand carved out of bone from a water buffalo (who lived a full life and died a natural de",
    "notes_id": "Dibuat dengan tangan bird of prey gold plate hat jewelry pin dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/files/Screenshot2025-12-08at10.57.07PM_e2518f83-2755-4b51-a4b8-bdfee948406a.png?v=1765256748"
  },
  {
    "styleCode": "HB-P9012-SIL",
    "creativeTitle": "Black Lip Heart -Grey Gold Plate",
    "baseLabor": 19.5,
    "silverWeight": 6.5,
    "stoneCost": 10.4,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Nature & The Duality of Life",
    "material": "Gold",
    "notes_en": "Explore, experience and adorn with this black lip heart-hat stud-hand carved and cast our of recycled sterling silver plated with gold. Measuring a li",
    "notes_id": "Dibuat dengan tangan black lip heart -grey gold plate dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-09-29at9.24.33PM.png?v=1664508278"
  },
  {
    "styleCode": "HB-NATURAL-TURQUOI",
    "creativeTitle": "Natural Turquoise Heart Hat Stud",
    "baseLabor": 19.5,
    "silverWeight": 6.5,
    "stoneCost": 10.4,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Nature & The Duality of Life",
    "material": "Silver",
    "notes_en": "Explore, experience and adorn with this Natural Turquoise heart, sweetly set in recycled sterling silver-hat stud.",
    "notes_id": "Dibuat dengan tangan natural turquoise heart hat stud dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/files/ScreenShot2023-09-27at11.07.27PM.png?v=1695874056"
  },
  {
    "styleCode": "HB-LOVE-SHARD-WITH",
    "creativeTitle": "Love Shard with Feather Dangle - Golden",
    "baseLabor": 26.3,
    "silverWeight": 8.8,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Celestial Story",
    "material": "Gold",
    "notes_en": "Explore, experiece and adorn with this small shard and feather dangle hat stud- recycled sterling silver plated in gold",
    "notes_id": "Dibuat dengan tangan love shard with feather dangle - golden dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-09-28at3.51.12PM.png?v=1664401877"
  },
  {
    "styleCode": "HB-CARVED-BONE-ARR",
    "creativeTitle": "Carved Bone Arrowhead Claw Set in Recycled Sterling Silver",
    "baseLabor": 22.5,
    "silverWeight": 7.5,
    "stoneCost": 12,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Transformation",
    "material": "Silver",
    "notes_en": "Explore, experience and adorn with this rustic carved bone arrowhead hat stud-hand carved and claw set in recycled sterling silver plated with gold Em",
    "notes_id": "Dibuat dengan tangan carved bone arrowhead claw set in recycled sterling silver dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2023-01-29at5.04.00PM.png?v=1675037163"
  },
  {
    "styleCode": "HB-SILVER-OXY-ARRO",
    "creativeTitle": "Carved and Cast Silver Oxy Arrowhead",
    "baseLabor": 27.8,
    "silverWeight": 9.3,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Transformation",
    "material": "Silver",
    "notes_en": "Explore, experiece and adorn with this rustic silver arrowhead hat stud-hand carved and cast our of recycled sterling silver Employing skill, talent, ",
    "notes_id": "Dibuat dengan tangan carved and cast silver oxy arrowhead dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-09-28at4.25.32PM.png?v=1664403939"
  },
  {
    "styleCode": "HB-GOLDEN-MOOSE-AN",
    "creativeTitle": "Golden Moose Antler Paddle",
    "baseLabor": 50.3,
    "silverWeight": 16.8,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Transformation",
    "material": "Gold",
    "notes_en": "Explore, experience and adorn with this carved and cast Golden moose antler-Paddle recycled sterling silver plated with gold This powerful and symboli",
    "notes_id": "Dibuat dengan tangan golden moose antler paddle dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-09-28at4.15.29PM.png?v=1664403335"
  },
  {
    "styleCode": "HB-SILVER-MOOSE-AN",
    "creativeTitle": "Silver Moose Antler Paddle",
    "baseLabor": 46.5,
    "silverWeight": 15.5,
    "stoneCost": 0,
    "department": "Hat Jewelry",
    "category": "Hat Pins",
    "collection": "Transformation",
    "material": "Silver",
    "notes_en": "Explore, experience and adorn with this large Hand-carved and cast Moose Antler Paddle- hand-made out of recycled sterling silver",
    "notes_id": "Dibuat dengan tangan silver moose antler paddle dalam kategori hat pins.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-09-28at4.16.03PM.png?v=1664403367"
  },
  {
    "styleCode": "HE-BL1-GP",
    "creativeTitle": "Two Play- Shell Earrings",
    "baseLabor": 75,
    "silverWeight": 25,
    "stoneCost": 40,
    "department": "Body Jewelry",
    "category": "Earrings",
    "collection": "Tribal Elegance",
    "material": "Silver",
    "notes_en": "Tribal elegance takes form in the sensually arranged shards of iridescent hand-carved B lack Lip Shell . The power, playfulness, and mystery of the se",
    "notes_id": "Dibuat dengan tangan two play- shell earrings dalam kategori earrings.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2020-03-25at7.15.04PM.png?v=1592865016"
  },
  {
    "styleCode": "HR952",
    "creativeTitle": "Impala Ring",
    "baseLabor": 34.5,
    "silverWeight": 11.5,
    "stoneCost": 0,
    "department": "Body Jewelry",
    "category": "Rings",
    "collection": "Tribal Elegance",
    "material": "Silver",
    "notes_en": "Let the beauty of the animal kingdom pull and ground you as you Explore, experience, and adorn. Honor nature, in this hand-carved and cast sculptural ",
    "notes_id": "Dibuat dengan tangan impala ring dalam kategori rings.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/2019_03-02_Heather_0258.jpg?v=1590122473"
  },
  {
    "styleCode": "HBE-4120-GP-1",
    "creativeTitle": "Impressive Impala Stud Earrings",
    "baseLabor": 37.5,
    "silverWeight": 12.5,
    "stoneCost": 0,
    "department": "Body Jewelry",
    "category": "Earrings",
    "collection": "Tribal Elegance",
    "material": "Silver",
    "notes_en": "Let the beauty of the animal kingdom pull you as you Explore, experience, and adorn. Honor nature, in these hand-carved and cast sculptural Impala s c",
    "notes_id": "Dibuat dengan tangan impressive impala stud earrings dalam kategori earrings.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/2019_03-02_Heather_0491.jpg?v=1592862293"
  },
  {
    "styleCode": "3",
    "creativeTitle": "Antlers of Elegance",
    "baseLabor": 42,
    "silverWeight": 14,
    "stoneCost": 0,
    "department": "Body Jewelry",
    "category": "Others",
    "collection": "Transformation",
    "material": "Silver",
    "notes_en": "Antlers of Elegance. Shed annually, these antlers were carved and cast to honor the cycle of life as we honor the sentiment “Leave only footprints, ta",
    "notes_id": "Dibuat dengan tangan antlers of elegance dalam kategori others.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/heather-benjamin-jewelery_earrings_antlers-of-elegance_01.jpg?v=1589428984"
  },
  {
    "styleCode": "9",
    "creativeTitle": "Elephant Love Ring",
    "baseLabor": 36,
    "silverWeight": 12,
    "stoneCost": 0,
    "department": "Body Jewelry",
    "category": "Rings",
    "collection": "Power & Protection",
    "material": "Silver",
    "notes_en": "In honor of the beauty, strength, intellect, and grace of this incredible being and my desire to end poaching and ensure their survival for future gen",
    "notes_id": "Dibuat dengan tangan elephant love ring dalam kategori rings.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2020-05-26at4.18.42PM.png?v=1590527999"
  },
  {
    "styleCode": "HB-COLORFUL-SHELL-",
    "creativeTitle": "Colorful Shell Ring",
    "baseLabor": 51,
    "silverWeight": 17,
    "stoneCost": 27.2,
    "department": "Body Jewelry",
    "category": "Rings",
    "collection": "Tribal Elegance",
    "material": "Silver",
    "notes_en": "This vibrantly colored Shell ring honors the beauty of the sea. This irregular triangle shape is about 1 inch in length. Completely hand-made from ste",
    "notes_id": "Dibuat dengan tangan colorful shell ring dalam kategori rings.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/purpshell.jpg?v=1612302967"
  },
  {
    "styleCode": "HB-PEAR-SHAPE-RHOD",
    "creativeTitle": "Pear Shape Rhodonite Ring",
    "baseLabor": 24,
    "silverWeight": 8,
    "stoneCost": 0,
    "department": "Body Jewelry",
    "category": "Earrings",
    "collection": "Tribal Elegance",
    "material": "Silver",
    "notes_en": "Deep, sweet, delicate, and strong Pear shaped Rhodonite is surrounded by a hand-formed bezel and band. Employing centuries-old talent and tradition fr",
    "notes_id": "Dibuat dengan tangan pear shape rhodonite ring dalam kategori earrings.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/chalcedony.jpg?v=1612038901"
  },
  {
    "styleCode": "HB-SOLID-METAL-FEA",
    "creativeTitle": "Solid Metal Feather Ring",
    "baseLabor": 24,
    "silverWeight": 8,
    "stoneCost": 0,
    "department": "Body Jewelry",
    "category": "Rings",
    "collection": "Freedom & Spirit",
    "material": "Silver",
    "notes_en": "Bringing together the worlds of seen and unseen, this large feather ring is designed to support you in listening to your intuition. Initially hand-car",
    "notes_id": "Dibuat dengan tangan solid metal feather ring dalam kategori rings.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/featherscreenshot.png?v=1611348464"
  },
  {
    "styleCode": "HB-OYSTER-RED-RING",
    "creativeTitle": "Ethically Red Ring",
    "baseLabor": 51,
    "silverWeight": 17,
    "stoneCost": 0,
    "department": "Body Jewelry",
    "category": "Rings",
    "collection": "Tribal Elegance",
    "material": "Silver",
    "notes_en": "This vibrant Red shell ring is a limited edition piece, It is cool and classic and honors the natural vibrance of nature with its completely original ",
    "notes_id": "Dibuat dengan tangan ethically red ring dalam kategori rings.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/IMG_0262.jpg?v=1593812247"
  },
  {
    "styleCode": "HB-CARVED-FEATHER-",
    "creativeTitle": "Hand-carved Feather Ring",
    "baseLabor": 51,
    "silverWeight": 17,
    "stoneCost": 0,
    "department": "Body Jewelry",
    "category": "Rings",
    "collection": "Freedom & Spirit",
    "material": "Silver",
    "notes_en": "Hand Carved out of Cruelty-free bone ring. This sculptural and detailed feather ring was hand-carved by one of our master Balinese artisans with love,",
    "notes_id": "Dibuat dengan tangan hand-carved feather ring dalam kategori rings.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2020-07-03at3.34.31PM.png?v=1593809182"
  },
  {
    "styleCode": "HB-WOLF-PENDANT-NE",
    "creativeTitle": "Wolf Pendant Necklace",
    "baseLabor": 45,
    "silverWeight": 15,
    "stoneCost": 0,
    "department": "Body Jewelry",
    "category": "Necklaces",
    "collection": "Transformation",
    "material": "Silver",
    "notes_en": "Let the beauty of the animal kingdom pull you as you Explore, experience and adorn. Honor your true nature, in this hand-carved and cast sculptural mi",
    "notes_id": "Dibuat dengan tangan wolf pendant necklace dalam kategori necklaces.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-02-20at5.49.46PM.png?v=1645404698"
  },
  {
    "styleCode": "HB-STEER-PENDANT-W",
    "creativeTitle": "Steer Pendant with Ganesh",
    "baseLabor": 60,
    "silverWeight": 20,
    "stoneCost": 0,
    "department": "Body Jewelry",
    "category": "Necklaces",
    "collection": "Tribal Elegance",
    "material": "Silver",
    "notes_en": "The Indonesian Water buffalo is the symbol of wealth, strength, fertility and prosperity. Hand Carved and Cast out of recycled sterling silver plated ",
    "notes_id": "Dibuat dengan tangan steer pendant with ganesh dalam kategori necklaces.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-02-09at4.52.52PM.png?v=1644450907"
  },
  {
    "styleCode": "HB-LARGE-IMPALA-PE",
    "creativeTitle": "Large Impala Necklace",
    "baseLabor": 75,
    "silverWeight": 25,
    "stoneCost": 0,
    "department": "Body Jewelry",
    "category": "Necklaces",
    "collection": "Tribal Elegance",
    "material": "Silver",
    "notes_en": "Defining graceful power, let the beauty of the animal kingdom pull you as you Explore, experience, and adorn. Honor nature, in this hand-carved and ca",
    "notes_id": "Dibuat dengan tangan large impala necklace dalam kategori necklaces.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/largeimpala2.jpg?v=1638554964"
  },
  {
    "styleCode": "HB-PERUVIAN-OPAL-B",
    "creativeTitle": "Peruvian Opal Beaded Necklace",
    "baseLabor": 90,
    "silverWeight": 30,
    "stoneCost": 0,
    "department": "Body Jewelry",
    "category": "Necklaces",
    "collection": "Tribal Elegance",
    "material": "Silver",
    "notes_en": "Incredibly blue beaded Peruvian Opal Necklace. In its classic way, this is a statement necklace that stands on its own and plays well with others. 32 ",
    "notes_id": "Dibuat dengan tangan peruvian opal beaded necklace dalam kategori necklaces.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/peruopalwireneck.jpg?v=1612388741"
  },
  {
    "styleCode": "HB-FEATHER-NECKLAC",
    "creativeTitle": "Feather Necklace",
    "baseLabor": 60,
    "silverWeight": 20,
    "stoneCost": 0,
    "department": "Body Jewelry",
    "category": "Necklaces",
    "collection": "Freedom & Spirit",
    "material": "Silver",
    "notes_en": "Soar in your life powerfully with this perfect reminder of your ability to glide gracefully through challenges, obstacles, and opportunities. A symbol",
    "notes_id": "Dibuat dengan tangan feather necklace dalam kategori necklaces.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/featherneck2.jpg?v=1644446147"
  },
  {
    "styleCode": "HB-TURQUOISE-ADJUS",
    "creativeTitle": "Turquoise Adjustable Bracelet",
    "baseLabor": 54,
    "silverWeight": 18,
    "stoneCost": 28.8,
    "department": "Body Jewelry",
    "category": "Bracelets",
    "collection": "Nature & The Duality of Life",
    "material": "Silver",
    "notes_en": "Vibrant, fresh, and adjustable Amazonite and turquoise bracelet will be your go-to as a single bracelet or the perfect addition to your rustic and ele",
    "notes_id": "Dibuat dengan tangan turquoise adjustable bracelet dalam kategori bracelets.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/amazoniteadjbracelt.jpg?v=1594853095"
  },
  {
    "styleCode": "HB-ANTIQUE-SILVER-",
    "creativeTitle": "Silver Impala Stud Earrings",
    "baseLabor": 25.5,
    "silverWeight": 8.5,
    "stoneCost": 0,
    "department": "Body Jewelry",
    "category": "Earrings",
    "collection": "Tribal Elegance",
    "material": "Silver",
    "notes_en": "Let the beauty of the animal kingdom pull you as you Explore, experience and adorn. Honor nature, in these hand-carved and cast sculptural Impala s ca",
    "notes_id": "Dibuat dengan tangan silver impala stud earrings dalam kategori earrings.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/impalasilver.jpg?v=1594842757"
  },
  {
    "styleCode": "HB-THE-WATER-BUFFA",
    "creativeTitle": "The Water Buffalo \"Long Horn\"  Necklace",
    "baseLabor": 67.5,
    "silverWeight": 22.5,
    "stoneCost": 0,
    "department": "Body Jewelry",
    "category": "Necklaces",
    "collection": "Power & Protection",
    "material": "Silver",
    "notes_en": "The Indonesian Water buffalo is the symbol of wealth, strength, fertility and prosperity. Hand Carved and Cast out of recycled sterling silver plated ",
    "notes_id": "Dibuat dengan tangan the water buffalo \"long horn\"  necklace dalam kategori necklaces.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/WATERBUFFALONECK.jpg?v=1594764077"
  },
  {
    "styleCode": "HN-53-MOP-GP",
    "creativeTitle": "True Tribal and Lunar Paua Shell Pendant Necklace",
    "baseLabor": 82.5,
    "silverWeight": 27.5,
    "stoneCost": 44,
    "department": "Body Jewelry",
    "category": "Necklaces",
    "collection": "Celestial Story",
    "material": "Silver",
    "notes_en": "Explore and Experience as unfamiliar becomes familiar. True tribal elegance takes form in the undulating hand carved Paua shell or Black lip.. Mother ",
    "notes_id": "Dibuat dengan tangan true tribal and lunar paua shell pendant necklace dalam kategori necklaces.",
    "imageUrl": "https://cdn.shopify.com/s/files/1/0277/4286/3462/products/2019_03-02_Heather_0234.jpg?v=1590122491"
  }
];

		for (const item of seedCatalog) {
			await db.execute({
				sql: `
					INSERT INTO catalog_items (style_code, title, base_labor, silver_weight, stone_cost, department, category, collection, material, notes_en, notes_id, image_url)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`,
				args: [
					item.styleCode,
					item.creativeTitle,
					item.baseLabor,
					item.silverWeight,
					item.stoneCost,
					item.department,
					item.category,
					item.collection,
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
		const day = 86400000;
		const redacted = 'Buyer and shipping details are redacted for demo.';
		const primarySource = `Subject: Production order HB-259689 - La Jolla Artisan Boutique
Date: June 18, 2026

Hi Heather,
Please prep this for our late-summer resort delivery.
${redacted}

Line items:
- 12x Medium Silver Elephant Pin (HB-40523-SIL) - sterling silver, match approved sample card
- 24x hb1 hat stud / mini star - buyer wrote "small starburst hat stud"; finish not specified
- 8x Mountain Pendant - new request, finish/material missing
- 6x Black Lip Star with Bird of Prey Dangle - note says "star bird dangle"
- 10x Golden Bird of Prey Hat Stud - buyer wrote "new smaller golden bird of prey"

Production note for Bali: group sterling silver pieces for the next casting batch; hold unresolved variants until Heather confirms.
Packing note: pack hat studs on individual cards; pendants in cotton pouches.`;

		const orders = [
			{
				id: 'HB-259689',
				client: 'La Jolla Artisan Boutique',
				status: 'Review',
				source: primarySource,
				update: `Hi La Jolla Artisan Boutique,

We reviewed PO HB-259689 and have the order drafted.

Order summary
- 5 items
- Total quantity: 60
- 2 required production questions remain.

Open questions
- Finish for Black Lip Star with Bird of Prey Dangle
- Mini vs medium Golden Bird of Prey Hat Stud

Production note for Bali
- Group sterling silver pieces for the next casting batch once blockers are resolved.

Packing note
- Hat studs on individual cards; pendants in cotton pouches.

Thank you,
Heather Benjamin Jewelry`,
				milestones: { moldsChecked: false, silverCast: false, qualityChecked: false, readyForShipping: false },
				age: 0,
				items: [
					{ id: 'elephant-medium', item: 'Medium Silver Elephant Pin', styleCode: 'HB-40523-SIL', qty: 12, finish: 'Sterling Silver', notes: 'Match approved sample card. Bali: cast with sterling batch.', source: 'PO line', confidenceState: 'resolved', unresolvedFields: [] },
					{ id: 'starburst-hat-stud', item: 'hb1 hat stud / mini star', styleCode: '', qty: 24, finish: '', notes: 'Buyer wrote "small starburst hat stud"; confirm exact hat stud variant.', source: 'PO line', confidenceState: 'needs_review', unresolvedFields: ['style code', 'finish'] },
					{ id: 'mountain-new', item: 'Mountain Pendant', styleCode: '', qty: 8, finish: '', notes: 'New request. Missing finish/material; hold until confirmed.', source: 'PO line', confidenceState: 'unresolved', unresolvedFields: ['style code', 'finish'] },
					{ id: 'star-dangle-unclear', item: 'Black Lip Star with Bird of Prey Dangle', styleCode: '', qty: 6, finish: '', notes: 'Evidence: "star bird dangle". Finish required before casting.', source: 'PO note', confidenceState: 'unresolved', unresolvedFields: ['style code', 'finish'] },
					{ id: 'bird-unclear', item: 'Golden Bird of Prey Hat Stud', styleCode: '', qty: 10, finish: 'Gold', notes: 'Evidence: "new smaller golden bird of prey". Confirm mini vs medium.', source: 'Buyer note', confidenceState: 'unresolved', unresolvedFields: ['style code', 'size'] }
				],
				blockers: [
					{ id: 'star-bird-finish', impact: 'High impact', question: 'Which finish should Bali make for the Black Lip Star with Bird of Prey Dangle?', evidence: 'star bird dangle', source: 'PO note', risk: 'Finish changes the metal casting, material cost, and production scheduling.', options: ['Golden', 'Recycled Sterling Silver'] },
					{ id: 'bird-of-prey-size', impact: 'Medium impact', question: 'Which Golden Bird of Prey Hat Stud size is this?', evidence: 'new smaller golden bird of prey', source: 'Buyer note', risk: 'Size changes the bone carving template, casting mold, and unit price.', options: ['Mini', 'Medium'] }
				]
			},
			{
				id: 'HB-259701',
				client: 'Marin Coastal Goods',
				status: 'Review',
				source: `Subject: PO HB-259701 - coastal capsule\n${redacted}\n\n- 16x Black Lip Heart Hat Stud in Silver - size mix not specified\n- 6x Feather Necklace - standard silver\nPacking note: small cards for hat studs.`,
				update: 'Draft pending size mix confirmation for hat studs.',
				milestones: { moldsChecked: false, silverCast: false, qualityChecked: false, readyForShipping: false },
				age: 1,
				items: [
					{ id: 'marin-heart-stud', item: 'Black Lip Heart Hat Stud in Silver', styleCode: 'HB-P9012-SIL', qty: 16, finish: 'Silver', notes: 'Size mix not specified.', source: 'PO line', confidenceState: 'needs_review', unresolvedFields: ['size mix'] },
					{ id: 'marin-feather-neck', item: 'Feather Necklace', styleCode: 'HB-FEATHER-NECKLAC', qty: 6, finish: 'Silver', notes: 'Standard pouch.', source: 'PO line', confidenceState: 'resolved', unresolvedFields: [] }
				],
				blockers: []
			},
			{
				id: 'HB-259714',
				client: 'Canyon & Cove Market',
				status: 'Review',
				source: `Subject: PO HB-259714 - canyon edit\n${redacted}\n\n- 10x Wolf Pendant Necklace - chain length not shown\n- 8x Silver Oxy Arrowhead Pin - packing: kraft cards`,
				update: 'Draft pending chain length confirmation.',
				milestones: { moldsChecked: false, silverCast: false, qualityChecked: false, readyForShipping: false },
				age: 2,
				items: [
					{ id: 'canyon-wolf-pendant', item: 'Wolf Pendant Necklace', styleCode: 'HB-WOLF-PENDANT-NE', qty: 10, finish: 'Silver', notes: 'Chain length not shown.', source: 'PO line', confidenceState: 'needs_review', unresolvedFields: ['chain length'] },
					{ id: 'canyon-arrowhead', item: 'Silver Oxy Arrowhead Pin', styleCode: 'HB-SILVER-OXY-ARRO', qty: 8, finish: 'Silver Oxy', notes: 'Kraft cards.', source: 'PO line', confidenceState: 'resolved', unresolvedFields: [] }
				],
				blockers: []
			},
			{
				id: 'HB-259728',
				client: 'North Shore Studio',
				status: 'Review',
				source: `Subject: PO HB-259728 - shore collection\n${redacted}\n\n- 6x Peruvian Opal Beaded Necklace - length unclear\n- 12x Golden Arrowhead Hat Pin - gold`,
				update: 'Draft pending necklace length confirmation.',
				milestones: { moldsChecked: false, silverCast: false, qualityChecked: false, readyForShipping: false },
				age: 3,
				items: [
					{ id: 'north-opal-necklace', item: 'Peruvian Opal Beaded Necklace', styleCode: 'HB-PERUVIAN-OPAL-B', qty: 6, finish: 'Silver', notes: 'Length unclear.', source: 'PO line', confidenceState: 'needs_review', unresolvedFields: ['length'] },
					{ id: 'north-arrowhead-pin', item: 'Golden Arrowhead Hat Pin', styleCode: 'HB-GOLDEN-ARROWHEA', qty: 12, finish: 'Gold', notes: 'Standard hat pin card.', source: 'PO line', confidenceState: 'resolved', unresolvedFields: [] }
				],
				blockers: []
			},
			{
				id: 'HB-259735',
				client: 'Blue Heron Gallery',
				status: 'Production',
				source: `Subject: PO HB-259735 - gallery case\n${redacted}\n\n- 6x Large Impala Necklace - 18 inch chain\n- 8x Solid Metal Feather Ring - sizes 6-8 mix`,
				update: 'Order is in Bali production. Casting batch grouped with sterling silver pieces.',
				milestones: { moldsChecked: true, silverCast: true, qualityChecked: false, readyForShipping: false },
				age: 4,
				items: [
					{ id: 'heron-impala-neck', item: 'Large Impala Necklace', styleCode: 'HB-LARGE-IMPALA-PE', qty: 6, finish: 'Silver', notes: '18 inch chain.', source: 'PO line', confidenceState: 'resolved', unresolvedFields: [] },
					{ id: 'heron-feather-ring', item: 'Solid Metal Feather Ring', styleCode: 'HB-SOLID-METAL-FEA', qty: 8, finish: 'Silver', notes: 'Sizes 6-8 mix.', source: 'PO line', confidenceState: 'resolved', unresolvedFields: [] }
				],
				blockers: []
			},
			{
				id: 'HB-259742',
				client: 'Makai Resort Shop',
				status: 'Production',
				source: `Subject: PO HB-259742 - resort case refresh\n${redacted}\n\n- 10x Mother of Pearl Gold Plated Silver Star Pin\n- 12x Golden Large Deer Antler Hat Pin`,
				update: 'Order is in production. MOP and gold-plated pieces are grouped for finishing review.',
				milestones: { moldsChecked: true, silverCast: false, qualityChecked: false, readyForShipping: false },
				age: 5,
				items: [
					{ id: 'makai-mop-star', item: 'Mother of Pearl Gold Plated Silver Star Pin', styleCode: 'HB-P9015-GP', qty: 10, finish: 'Mother of Pearl / Gold Plated', notes: 'Standard card.', source: 'PO line', confidenceState: 'resolved', unresolvedFields: [] },
					{ id: 'makai-deer-pin', item: 'Golden Large Deer Antler Hat Pin', styleCode: 'HB-GOLDEN-LARGE-DE', qty: 12, finish: 'Gold', notes: 'Resort display cards.', source: 'PO line', confidenceState: 'resolved', unresolvedFields: [] }
				],
				blockers: []
			},
			{
				id: 'HB-259756',
				client: 'Juniper House',
				status: 'Packing',
				source: `Subject: PO HB-259756 - ready-to-ship sample set\n${redacted}\n\n- 8x Turquoise Adjustable Bracelet\n- 6x Colorful Shell Ring\nPacking note: cotton pouches, no price tags.`,
				update: 'Production is complete. Packing checklist is ready for final review.',
				milestones: { moldsChecked: true, silverCast: true, qualityChecked: true, readyForShipping: true },
				age: 6,
				items: [
					{ id: 'juniper-turquoise-bracelet', item: 'Turquoise Adjustable Bracelet', styleCode: 'HB-TURQUOISE-ADJUS', qty: 8, finish: 'Silver', notes: 'Cotton pouch.', source: 'PO line', confidenceState: 'resolved', unresolvedFields: [] },
					{ id: 'juniper-shell-ring', item: 'Colorful Shell Ring', styleCode: 'HB-COLORFUL-SHELL-', qty: 6, finish: 'Silver', notes: 'No price tags.', source: 'PO line', confidenceState: 'resolved', unresolvedFields: [] }
				],
				blockers: []
			},
			{
				id: 'HB-259762',
				client: 'Driftwood Collective',
				status: 'Completed',
				source: `Subject: PO HB-259762 - event replenishment\n${redacted}\n\n- 12x Black Lip Heart Hat Stud in Silver\n- 5x Feather Necklace`,
				update: 'Order shipped. Tracking details handled outside demo data.',
				milestones: { moldsChecked: true, silverCast: true, qualityChecked: true, readyForShipping: true },
				age: 7,
				items: [
					{ id: 'driftwood-heart-stud', item: 'Black Lip Heart Hat Stud in Silver', styleCode: 'HB-P9012-SIL', qty: 12, finish: 'Silver', notes: 'Individual cards.', source: 'PO line', confidenceState: 'resolved', unresolvedFields: [] },
					{ id: 'driftwood-feather-neck', item: 'Feather Necklace', styleCode: 'HB-FEATHER-NECKLAC', qty: 5, finish: 'Silver', notes: 'Cotton pouches.', source: 'PO line', confidenceState: 'resolved', unresolvedFields: [] }
				],
				blockers: []
			},
			{
				id: 'HB-259779',
				client: 'Laurel Market',
				status: 'Completed',
				source: `Subject: PO HB-259779 - market display order\n${redacted}\n\n- 6x Oyster Red Ring\n- 4x Steer Pendant with Chain`,
				update: 'Order shipped. Customer update sent from Artisan draft.',
				milestones: { moldsChecked: true, silverCast: true, qualityChecked: true, readyForShipping: true },
				age: 8,
				items: [
					{ id: 'laurel-oyster-ring', item: 'Oyster Red Ring', styleCode: 'HB-OYSTER-RED-RING', qty: 6, finish: 'Silver', notes: 'Ring boxes.', source: 'PO line', confidenceState: 'resolved', unresolvedFields: [] },
					{ id: 'laurel-steer-pendant', item: 'Steer Pendant with Chain', styleCode: 'HB-STEER-PENDANT-W', qty: 4, finish: 'Silver', notes: 'Cotton pouches.', source: 'PO line', confidenceState: 'resolved', unresolvedFields: [] }
				],
				blockers: []
			}
		];

		for (const order of orders) {
			await db.execute({
				sql: `
					INSERT INTO purchase_orders (id, po_number, client_name, status, source_text, uploaded_files, customer_update, milestones, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, '[]', ?, ?, ?, ?)
				`,
				args: [
					order.id,
					order.id,
					order.client,
					order.status,
					order.source,
					order.update,
					JSON.stringify(order.milestones),
					now - order.age * day,
					now - order.age * day
				]
			});

			for (const item of order.items) {
				await db.execute({
					sql: `
						INSERT INTO order_items (id, po_id, item_name, style_code, qty, finish, notes, unit_price, image_url, source, confidence_state, unresolved_fields)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					`,
					args: [
						`${order.id}:${item.id}`,
						order.id,
						item.item,
						item.styleCode,
						item.qty,
						item.finish,
						item.notes,
						0,
						'',
						item.source,
						item.confidenceState,
						JSON.stringify(item.unresolvedFields)
					]
				});
			}

			for (const blocker of order.blockers) {
				await db.execute({
					sql: `
						INSERT INTO blockers (id, po_id, impact, question, evidence, source, risk, options, answer)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, '')
					`,
					args: [
						`${order.id}:${blocker.id}`,
						order.id,
						blocker.impact,
						blocker.question,
						blocker.evidence,
						blocker.source,
						blocker.risk,
						JSON.stringify(blocker.options)
					]
				});
			}
		}
	}
}
