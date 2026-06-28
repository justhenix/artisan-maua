export type CatalogCategory = 'Pins' | 'Brim Pinches' | 'Traditional Jewelry' | 'Others';
export type CatalogMaterial = 'Silver' | 'Gold' | 'Brass' | 'Others';

export type CatalogItem = {
	styleCode: string;
	creativeTitle: string;
	baseLabor: number;
	silverWeight: number;
	stoneCost: number;
	category: CatalogCategory;
	material: CatalogMaterial;
	notes_en: string;
	notes_id: string;
	imageUrl?: string;
};

export const fallbackCatalog: CatalogItem[] = [
	{
		styleCode: 'HB-HORSE-M',
		creativeTitle: 'Horse Pin Medium',
		baseLabor: 12.0,
		silverWeight: 8.5,
		stoneCost: 0,
		category: 'Pins',
		material: 'Silver',
		notes_en: 'Cast in sterling silver. Match master horse mold size M.',
		notes_id: 'Cor dalam perak murni. Sesuaikan dengan cetakan induk kuda ukuran M.',
		imageUrl:
			'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=120&h=120&fit=crop'
	},
	{
		styleCode: 'HB-HORSE-S',
		creativeTitle: 'Horse Pin Small',
		baseLabor: 9.5,
		silverWeight: 5.0,
		stoneCost: 0,
		category: 'Pins',
		material: 'Silver',
		notes_en: 'Cast in sterling silver. Match master horse mold size S.',
		notes_id: 'Cor dalam perak murni. Sesuaikan dengan cetakan induk kuda ukuran S.',
		imageUrl:
			'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=120&h=120&fit=crop'
	},
	{
		styleCode: 'HB-HORSE-L',
		creativeTitle: 'Horse Pin Large',
		baseLabor: 15.0,
		silverWeight: 11.5,
		stoneCost: 0,
		category: 'Pins',
		material: 'Silver',
		notes_en: 'Cast in sterling silver. Match master horse mold size L.',
		notes_id: 'Cor dalam perak murni. Sesuaikan dengan cetakan induk kuda ukuran L.',
		imageUrl:
			'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=120&h=120&fit=crop'
	},
	{
		styleCode: 'HB-MTN-P',
		creativeTitle: 'Mountain Pendant',
		baseLabor: 18.0,
		silverWeight: 12.0,
		stoneCost: 5.5,
		category: 'Traditional Jewelry',
		material: 'Silver',
		notes_en: 'Hand-carved snow structures and mother-of-pearl accent. Long chain.',
		notes_id: 'Struktur salju diukir tangan dengan hiasan kerang mutiara. Rantai panjang.',
		imageUrl:
			'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=120&h=120&fit=crop'
	},
	{
		styleCode: 'HB-WAVE-C',
		creativeTitle: 'Wave Cuff',
		baseLabor: 22.0,
		silverWeight: 18.5,
		stoneCost: 0,
		category: 'Traditional Jewelry',
		material: 'Silver',
		notes_en: 'Wave textured cuff. Hand-finish silver. 6.5 inch circumference.',
		notes_id: 'Gelang bertekstur ombak. Perak polesan tangan. Lingkar 6.5 inci.',
		imageUrl:
			'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=120&h=120&fit=crop'
	},
	{
		styleCode: 'HB-SB-STUD',
		creativeTitle: 'Starburst Studs',
		baseLabor: 15.0,
		silverWeight: 6.2,
		stoneCost: 2.0,
		category: 'Traditional Jewelry',
		material: 'Gold',
		notes_en: 'Starburst design with gold vermeil finish. Match gold thickness rules.',
		notes_id: 'Desain starburst dengan lapisan emas vermeil. Sesuaikan ketebalan emas.',
		imageUrl:
			'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=120&h=120&fit=crop'
	},
	{
		styleCode: 'HB-TSR-2',
		creativeTitle: 'Thin Stacking Ring',
		baseLabor: 5.0,
		silverWeight: 2.1,
		stoneCost: 0,
		category: 'Traditional Jewelry',
		material: 'Silver',
		notes_en: 'Thin stacking ring. Mix sizes 7 and 8.',
		notes_id: 'Cincin tumpuk tipis. Campuran ukuran 7 dan 8.',
		imageUrl:
			'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=120&h=120&fit=crop'
	},
	{
		styleCode: 'HB-CC-18',
		creativeTitle: 'Cable Chain 18"',
		baseLabor: 4.0,
		silverWeight: 4.5,
		stoneCost: 0,
		category: 'Others',
		material: 'Silver',
		notes_en: 'Cable chain 18 inches. Check links and clasp durability.',
		notes_id: 'Rantai kabel 18 inci. Periksa ketahanan sambungan dan pengait.',
		imageUrl:
			'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=120&h=120&fit=crop'
	},
	{
		styleCode: 'HB-SB-MINI',
		creativeTitle: 'Bali Starburst Mini',
		baseLabor: 8.0,
		silverWeight: 3.5,
		stoneCost: 0,
		category: 'Traditional Jewelry',
		material: 'Silver',
		notes_en: 'Mini starburst studs in sterling silver.',
		notes_id: 'Anting giwang starburst mini dalam perak murni.',
		imageUrl:
			'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=120&h=120&fit=crop'
	},
	{
		styleCode: 'HB-SB-SMALL',
		creativeTitle: 'Bali Starburst Small',
		baseLabor: 10.0,
		silverWeight: 4.8,
		stoneCost: 0,
		category: 'Traditional Jewelry',
		material: 'Silver',
		notes_en: 'Small starburst studs in sterling silver.',
		notes_id: 'Anting giwang starburst kecil dalam perak murni.',
		imageUrl:
			'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=120&h=120&fit=crop'
	},
	{
		styleCode: 'HB-SB-LARGE',
		creativeTitle: 'Bali Starburst Large',
		baseLabor: 14.0,
		silverWeight: 7.2,
		stoneCost: 0,
		category: 'Traditional Jewelry',
		material: 'Silver',
		notes_en: 'Large starburst studs in sterling silver.',
		notes_id: 'Anting giwang starburst besar dalam perak murni.',
		imageUrl:
			'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=120&h=120&fit=crop'
	}
];