<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { driver } from 'driver.js';
	import 'driver.js/dist/driver.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { localizeHref } from '$lib/paraglide/runtime';
	import type { Pathname } from '$app/types';

	type Step = 1 | 2 | 3 | 4;
	type Tab = 'production' | 'packing' | 'customer';

	type Blocker = {
		id: string;
		impact: 'High impact' | 'Medium impact';
		question: string;
		evidence: string;
		source: string;
		risk: string;
		options: string[];
		answer: string;
	};

	type LineItem = {
		id: string;
		item: string;
		styleCode: string;
		qty: number;
		finish: string;
		notes: string;
		source: string;
		unitPrice: number; // Client PO price
	};

	type CatalogItem = {
		styleCode: string;
		creativeTitle: string;
		baseLabor: number;
		silverWeight: number; // in grams
		stoneCost: number;
		category: 'Pins' | 'Brim Pinches' | 'Traditional Jewelry' | 'Others';
		material: 'Silver' | 'Gold' | 'Brass' | 'Others';
		notes_en: string;
		notes_id: string;
	};

	const storageKey = 'artisan-demo-flow-v3';
	const orderId = 'HB-250416';
	const client = 'Driftwood Collective';

	const sourceTypes = ['Email', 'DM', 'Spreadsheet rows', 'PO text'];
	const steps: { id: Step; label: string }[] = [
		{ id: 1, label: 'Add order' },
		{ id: 2, label: 'Review order' },
		{ id: 3, label: 'Sheets' },
		{ id: 4, label: 'Update customer' }
	];

	const sampleOrder = `From: Mia Chen <mia@driftwoodcollective.com>
Subject: Re: New pieces for Summer

Hi Heather,
Here's what we're hoping to get for our July drop.
PO#: DC-0725
Ship to: Driftwood Collective, 123 Ocean Ave, Santa Cruz, CA 95060

Item                   Qty   Finish             Notes
---------------------------------------------------------------
Horse Pin Medium       12    Silver             Please match last order
Mountain Pendant       6     Mother of Pearl    Can we get with longer chain?
Wave Cuff              4     Silver             6.5" if possible
Starburst Studs        24    Gold Vermeil       12 pr per card?
Thin Stacking Ring     20    Silver             Size 7 & 8 mix

CSV pasted below:
Item,Qty,Material/Finish,Notes
Cable Chain 18",10,Silver,Need by 7/10
Bali Starburst (Large),8,Silver,OK to sub similar if OOS

Sent via Instagram DM 6/1: "Do you have more wave cuffs in stock?"`;

	const catalog: CatalogItem[] = [
		{ 
			styleCode: 'HB-HORSE-M', 
			creativeTitle: 'Horse Pin Medium', 
			baseLabor: 12.00, 
			silverWeight: 8.5, 
			stoneCost: 0,
			category: 'Pins',
			material: 'Silver',
			notes_en: 'Cast in sterling silver. Match master horse mold size M.',
			notes_id: 'Cor dalam perak murni. Sesuaikan dengan cetakan induk kuda ukuran M.'
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
			notes_id: 'Cor dalam perak murni. Sesuaikan dengan cetakan induk kuda ukuran S.'
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
			notes_id: 'Cor dalam perak murni. Sesuaikan dengan cetakan induk kuda ukuran L.'
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
			notes_id: 'Struktur salju diukir tangan dengan hiasan kerang mutiara. Rantai panjang.'
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
			notes_id: 'Gelang bertekstur ombak. Perak polesan tangan. Lingkar 6.5 inci.'
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
			notes_id: 'Desain starburst dengan lapisan emas vermeil. Sesuaikan ketebalan emas.'
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
			notes_id: 'Cincin tumpuk tipis. Campuran ukuran 7 dan 8.'
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
			notes_id: 'Rantai kabel 18 inci. Periksa ketahanan sambungan dan pengait.'
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
			notes_id: 'Anting giwang starburst mini dalam perak murni.'
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
			notes_id: 'Anting giwang starburst kecil dalam perak murni.'
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
			notes_id: 'Anting giwang starburst besar dalam perak murni.'
		}
	];

	const initialBlockers = (): Blocker[] => [
		{
			id: 'starburst-size',
			impact: 'High impact',
			question: 'Which Starburst size should Bali make?',
			evidence: 'mini star',
			source: 'Pasted DM',
			risk: 'Size changes casting, stone layout, packing count, and production time.',
			options: ['Mini', 'Small', 'Large'],
			answer: ''
		},
		{
			id: 'horse-pin-size',
			impact: 'Medium impact',
			question: 'Which Horse Pin size is this?',
			evidence: 'new smaller horse pin',
			source: 'Copied PO text',
			risk: 'Horse Pin sizes map to different style codes and wholesale packing labels.',
			options: ['Small', 'Medium', 'Large'],
			answer: ''
		}
	];

	const initialLineItems = (): LineItem[] => [
		{
			id: 'horse-medium',
			item: 'Horse Pin Medium',
			styleCode: 'HB-HORSE-M',
			qty: 12,
			finish: 'Silver',
			notes: 'Match last order',
			source: 'Copied PO text',
			unitPrice: 32.00
		},
		{
			id: 'mountain-pendant',
			item: 'Mountain Pendant',
			styleCode: 'HB-MTN-P',
			qty: 6,
			finish: 'Mother of Pearl',
			notes: 'Confirm longer chain',
			source: 'Copied PO text',
			unitPrice: 42.00
		},
		{
			id: 'wave-cuff',
			item: 'Wave Cuff',
			styleCode: 'HB-WAVE-C',
			qty: 4,
			finish: 'Silver',
			notes: '6.5" if possible',
			source: 'Copied PO text',
			unitPrice: 75.00
		},
		{
			id: 'starburst-studs',
			item: 'Starburst Studs',
			styleCode: 'HB-SB-STUD',
			qty: 24,
			finish: 'Gold Vermeil',
			notes: 'Pack 12 pairs per card',
			source: 'Copied PO text',
			unitPrice: 38.00
		},
		{
			id: 'thin-stacking-ring',
			item: 'Thin Stacking Ring',
			styleCode: 'HB-TSR-2',
			qty: 20,
			finish: 'Silver',
			notes: 'Mix sizes 7 and 8',
			source: 'Copied PO text',
			unitPrice: 12.00
		},
		{
			id: 'cable-chain',
			item: 'Cable Chain 18"',
			styleCode: 'HB-CC-18',
			qty: 10,
			finish: 'Silver',
			notes: 'Need by 7/10',
			source: 'CSV row',
			unitPrice: 15.00
		},
		{
			id: 'bali-starburst',
			item: 'Bali Starburst (Size Unresolved)',
			styleCode: '',
			qty: 8,
			finish: 'Silver',
			notes: "Awaiting size resolution",
			source: 'Pasted DM',
			unitPrice: 18.00
		},
		{
			id: 'horse-unclear',
			item: 'Horse Pin (Size Unresolved)',
			styleCode: '',
			qty: 6,
			finish: 'Silver',
			notes: "Awaiting size resolution",
			source: 'Copied PO text',
			unitPrice: 25.00
		}
	];

	const initialCustomerUpdate = `Hi Mia,

Thank you for your order. We reviewed the details and everything needed for production is now ready.

Order summary
- 8 items
- Total quantity: 90
- Finishes: Silver, Gold Vermeil, Mother of Pearl

Timeline
- Production start: June 3, 2026
- Estimated completion: June 20, 2026
- Need by: July 10, 2026

We will send another update once production begins. Please reach out if anything needs to change.

Thank you,
Heather Benjamin Jewelry`;

	let currentStep = $state<Step>(1);
	let selectedSource = $state('Email');
	let intakeText = $state(sampleOrder);
	let blockers = $state<Blocker[]>(initialBlockers());
	let lineItems = $state<LineItem[]>(initialLineItems());
	let activeTab = $state<Tab>('production');
	let customerUpdate = $state(initialCustomerUpdate);
	let sheetDirty = $state(false);
	let lastSaved = $state('10:42 AM');
	let exportOpen = $state(false);
	let toast = $state('');
	let sent = $state(false);
	let contentPanel = $state<HTMLDivElement | undefined>();
	let sidebarCollapsed = $state(false);
	let mobileSidebarOpen = $state(false);

	// New States
	let uploadedFiles = $state<string[]>([]);
	let showOriginalDrawer = $state(false);
	let silverSpotRate = $state(1.05); // Global silver spot price slider
	let productionGrouping = $state<'material' | 'category'>('material'); // Production group toggle
	let packedItems = $state<Record<string, boolean>>({}); // Checkbox state for Packing checklist
	let completedSteps = $state<number>(1);
	let rightSidebarCollapsed = $state(false);
	let activeIngestTab = $state<'paste' | 'upload'>('paste');
	let sampleUsed = $state(false);
	let processClicked = $state(false);
	let isDragging = $state(false);

	const step1_item1 = $derived(intakeText.trim().length > 0 || uploadedFiles.length > 0);
	const step1_item2 = $derived(sampleUsed);
	const step1_item3 = $derived(processClicked);

	// i18n Detection from Path
	const isIndonesian = $derived(page.url.pathname.startsWith('/id'));
	const currentLocale = $derived(isIndonesian ? 'id' : 'en');

	// Translation Dictionary
	const t = $derived({
		addOrder: currentLocale === 'id' ? 'Input Pesanan' : 'Add Order',
		addWholesaleOrder: currentLocale === 'id' ? 'Input Pesanan Grosir' : 'Add wholesale order',
		intakeDesc: currentLocale === 'id' 
			? 'Tempel PO, email, atau chat di bawah. Artisan akan mengekstrak item dan menandai hal yang butuh konfirmasi.'
			: 'Paste your PO, email, or chat below. Artisan will extract items and highlight details needing confirmation.',
		uploadInstead: currentLocale === 'id' ? 'Unggah File' : 'Upload file instead',
		trySample: currentLocale === 'id' ? 'Gunakan Contoh Pesanan' : 'Try sample order',
		processOrder: currentLocale === 'id' ? 'Mulai Proses' : 'Process order',
		safetyNote: currentLocale === 'id' ? 'Keamanan data terjaga. Gunakan data sampel atau data samaran.' : 'Use fictional or redacted data only.',
		reviewOrder: currentLocale === 'id' ? 'Cek Detail Pesanan' : 'Review order',
		foundItems: currentLocale === 'id' ? 'Berhasil menemukan 8 item' : 'Artisan found 8 items',
		unresolvedCount: (count: number) => currentLocale === 'id'
			? `Ada ${count} detail produksi yang butuh konfirmasi sebelum masuk ke lembar kerja.`
			: `${count} production ${count === 1 ? 'detail needs' : 'details need'} answers before sheets can be created.`,
		allResolved: currentLocale === 'id' ? 'Semua detail selesai dikonfirmasi! Silakan lanjut ke lembar kerja.' : 'All production details have been resolved. You are ready to view sheets.',
		viewOriginal: currentLocale === 'id' ? 'Lihat Dokumen Asli' : 'View original order',
		saveProgress: currentLocale === 'id' ? 'Simpan Progres' : 'Save progress',
		needsAnswer: currentLocale === 'id' ? 'Butuh Konfirmasi' : 'Needs your answer',
		looksReady: currentLocale === 'id' ? 'Siap Produksi' : 'Looks ready',
		yourDocs: currentLocale === 'id' ? 'Dokumen Pesanan' : 'Your documents',
		lockedDocs: currentLocale === 'id' ? 'Belum siap. Selesaikan konfirmasi di sebelah kiri.' : 'Locked until the questions are answered.',
		readyDocs: currentLocale === 'id' ? 'Siap ditinjau.' : 'Ready for review.',
		infoNote: currentLocale === 'id' ? 'Butuh cek ulang? Kamu bisa lihat dokumen asli kapan saja.' : 'You can view the original order anytime while reviewing details.',
		sheets: currentLocale === 'id' ? 'Lembar Kerja' : 'Sheets',
		sheetsDesc: currentLocale === 'id' ? 'Dokumen produksi & packing siap pakai yang diekstrak otomatis dari pesanan pelanggan.' : 'Clean production and packing documents generated from order input.',
		answersComplete: currentLocale === 'id' ? 'Semua konfirmasi sudah lengkap!' : 'All required answers complete.',
		productionSheet: currentLocale === 'id' ? 'Lembar Produksi' : 'Production sheet',
		packingChecklist: currentLocale === 'id' ? 'Checklist Packing' : 'Packing checklist',
		customerUpdate: currentLocale === 'id' ? 'Update Pelanggan' : 'Customer update',
		saveChanges: currentLocale === 'id' ? 'Simpan Perubahan' : 'Save changes',
		exportBtn: currentLocale === 'id' ? 'Ekspor' : 'Export',
		readyNext: currentLocale === 'id' ? 'Langkah Berikutnya' : 'Ready next',
		copyUpdate: currentLocale === 'id' ? 'Salin Update' : 'Copy update',
		markSent: currentLocale === 'id' ? 'Tandai Sudah Dikirim' : 'Mark as sent',
		preview: currentLocale === 'id' ? 'Pratinjau' : 'Preview',
		saveDraft: currentLocale === 'id' ? 'Simpan Draft' : 'Save draft',
		emailTo: currentLocale === 'id' ? 'Kirim ke' : 'To',
		emailSubject: currentLocale === 'id' ? 'Subjek Email' : 'Subject',
		whatsIncluded: currentLocale === 'id' ? 'Rangkuman Update' : "What's included in this update",
		includedDesc: currentLocale === 'id' ? 'Rangkuman pesanan, jadwal produksi, estimasi selesai, dan catatan khusus.' : 'Order summary, timeline, production status, and any notes or next steps.',
		updateDesc: currentLocale === 'id' ? 'Sesuaikan pesan untuk pelanggan di bawah sebelum disalin atau dikirim.' : 'Edit the customer update before copying or marking sent.',
		orders: currentLocale === 'id' ? 'Daftar Pesanan' : 'Orders',
		replayTour: currentLocale === 'id' ? 'Ulangi Panduan' : 'Replay Tour',
		nextTitle: currentLocale === 'id' ? 'Cara Kerja Artisan' : 'What happens next',
		extractTitle: currentLocale === 'id' ? '1. Ekstrak Data Otomatis' : 'Extract line items',
		extractDesc: currentLocale === 'id' ? 'Ekstrak otomatis item, jumlah, dan bahan.' : 'Auto-extract products, quantities, and finishes.',
		answerTitle: currentLocale === 'id' ? '2. Konfirmasi Detail' : 'Answer unclear details',
		answerDesc: currentLocale === 'id' ? 'Artisan akan memunculkan pertanyaan jika ada spesifikasi produk yang kurang jelas.' : 'Questions appear only when production details are unclear.',
		createTitle: currentLocale === 'id' ? '3. Lembar Kerja Siap' : 'Create sheets',
		createDesc: currentLocale === 'id' ? 'Lembar produksi, checklist packing, dan draft update pelanggan langsung siap pakai.' : 'Production sheet, packing checklist, and customer update become ready.'
	});

	// Formulaic Weight-Based Pricing Auditor
	const markupMargin = 1.5;
	function getCalculatedCost(styleCode: string, spotRate: number): number {
		const cat = catalog.find(x => x.styleCode === styleCode);
		if (!cat) return 0;
		return Number(((cat.baseLabor + (cat.silverWeight * spotRate) + cat.stoneCost) * markupMargin).toFixed(2));
	}

	const pricingWarnings = $derived(
		lineItems.filter(item => {
			if (!item.styleCode) return false;
			const calc = getCalculatedCost(item.styleCode, silverSpotRate);
			return calc > item.unitPrice;
		})
	);

	function applySafeSpotRate() {
		let minRate = 1.05;
		let found = false;
		pricingWarnings.forEach(item => {
			if (!item.styleCode) return;
			const cat = catalog.find(x => x.styleCode === item.styleCode);
			if (!cat || cat.silverWeight <= 0) return;
			const rate = (item.unitPrice / markupMargin - cat.baseLabor - cat.stoneCost) / cat.silverWeight;
			if (rate < minRate) {
				minRate = rate;
				found = true;
			}
		});
		if (found) {
			silverSpotRate = Number(Math.max(0, minRate).toFixed(2));
			showToast(currentLocale === 'id' ? `Harga spot disesuaikan ke: $${silverSpotRate.toFixed(2)}/g` : `Spot rate adjusted to: $${silverSpotRate.toFixed(2)}/g`);
		}
	}

	// Dynamic Blocker & Ready Tracking
	const remainingAnswers = $derived(blockers.filter((blocker) => !blocker.answer).length);
	const allAnswered = $derived(remainingAnswers === 0);

	const prodProgress = $derived((blockers.filter(b => b.answer).length / blockers.length) * 100);
	const packingProgress = $derived(allAnswered ? 100 : 0);
	const customerProgress = $derived(allAnswered ? 100 : 0);

	const readyItems = $derived(
		lineItems.filter(item => {
			if (item.id === 'bali-starburst') {
				const b = blockers.find(x => x.id === 'starburst-size');
				return b && b.answer !== '';
			}
			if (item.id === 'horse-unclear') {
				const b = blockers.find(x => x.id === 'horse-pin-size');
				return b && b.answer !== '';
			}
			return true;
		})
	);

	const totalQty = $derived(lineItems.reduce((sum, item) => sum + Number(item.qty || 0), 0));
	const finishSummary = $derived(
		Array.from(new Set(lineItems.map((item) => item.finish))).join(', ')
	);

	$effect(() => {
		if (currentStep > completedSteps) {
			completedSteps = currentStep;
		}
	});
	const maxStep = $derived(allAnswered ? Math.max(completedSteps, 3) as Step : completedSteps as Step);

	// Session Restoration
	if (browser) {
		const saved = sessionStorage.getItem(storageKey);
		if (saved) {
			try {
				const parsed = JSON.parse(saved) as any;
				currentStep = parsed.currentStep ?? 1;
				selectedSource = parsed.selectedSource ?? 'Email';
				intakeText = parsed.intakeText ?? sampleOrder;
				blockers = parsed.blockers ?? initialBlockers();
				lineItems = parsed.lineItems ?? initialLineItems();
				activeTab = parsed.activeTab ?? 'production';
				customerUpdate = parsed.customerUpdate ?? initialCustomerUpdate;
				sheetDirty = parsed.sheetDirty ?? false;
				lastSaved = parsed.lastSaved ?? '10:42 AM';
				sent = parsed.sent ?? false;
				uploadedFiles = parsed.uploadedFiles ?? [];
				silverSpotRate = parsed.silverSpotRate ?? 1.05;
				productionGrouping = parsed.productionGrouping ?? 'material';
				packedItems = parsed.packedItems ?? {};
				completedSteps = parsed.completedSteps ?? 1;
				rightSidebarCollapsed = parsed.rightSidebarCollapsed ?? false;
				activeIngestTab = parsed.activeIngestTab ?? 'paste';
				sampleUsed = parsed.sampleUsed ?? false;
				processClicked = parsed.processClicked ?? false;
			} catch {
				sessionStorage.removeItem(storageKey);
			}
		}
	}

	$effect(() => {
		if (!browser) return;
		sessionStorage.setItem(
			storageKey,
			JSON.stringify({
				currentStep,
				selectedSource,
				intakeText,
				blockers,
				lineItems,
				activeTab,
				customerUpdate,
				sheetDirty,
				lastSaved,
				sent,
				uploadedFiles,
				silverSpotRate,
				productionGrouping,
				packedItems,
				completedSteps,
				rightSidebarCollapsed,
				activeIngestTab,
				sampleUsed,
				processClicked
			})
		);
	});

	function getOptionDetail(blockerId: string, option: string): string {
		if (blockerId === 'starburst-size') {
			if (option === 'Mini') return currentLocale === 'id' ? 'Diameter 8mm (Anting stud mini)' : '8mm diameter (Mini stud earring)';
			if (option === 'Small') return currentLocale === 'id' ? 'Diameter 12mm (Ukuran standar)' : '12mm diameter (Standard size)';
			if (option === 'Large') return currentLocale === 'id' ? 'Diameter 18mm (Ukuran pernyataan)' : '18mm diameter (Statement size)';
		}
		if (blockerId === 'horse-size') {
			if (option === 'Small') return currentLocale === 'id' ? 'Lebar 15mm (Cetakan S)' : '15mm width (Mold S)';
			if (option === 'Medium') return currentLocale === 'id' ? 'Lebar 22mm (Cetakan M)' : '22mm width (Mold M)';
			if (option === 'Large') return currentLocale === 'id' ? 'Lebar 30mm (Cetakan L)' : '30mm width (Mold L)';
		}
		return '';
	}

	function showToast(message: string) {
		toast = message;
		if (!browser) return;
		window.setTimeout(() => {
			if (toast === message) toast = '';
		}, 2400);
	}

	function resetDemoState() {
		blockers = initialBlockers();
		lineItems = initialLineItems();
		sent = false;
		sheetDirty = false;
		activeTab = 'production';
		customerUpdate = initialCustomerUpdate;
		showOriginalDrawer = false;
		packedItems = {};
	}

	function useSampleOrder() {
		intakeText = sampleOrder;
		selectedSource = 'Email';
		uploadedFiles = [];
		sampleUsed = true;
		resetDemoState();
		showToast('Sample order loaded.');
	}

	function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const files = Array.from(target.files);
			uploadedFiles = [...uploadedFiles, ...files.map(f => f.name)];
			intakeText = `[Files Source: ${uploadedFiles.join(', ')}]\n\n` + sampleOrder;
			resetDemoState();
			showToast(currentLocale === 'id' ? `${files.length} file berhasil diunggah.` : `${files.length} files uploaded successfully.`);
		}
	}
	function handleFileDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
			const files = Array.from(event.dataTransfer.files);
			uploadedFiles = [...uploadedFiles, ...files.map(f => f.name)];
			intakeText = `[Files Source: ${uploadedFiles.join(', ')}]\n\n` + sampleOrder;
			resetDemoState();
			showToast(currentLocale === 'id' ? `${files.length} file berhasil diunggah.` : `${files.length} files uploaded successfully.`);
		}
	}
	function processOrder() {
		if (!intakeText.trim()) {
			intakeText = sampleOrder;
		}
		processClicked = true;
		resetDemoState();
		setStep(2);
	}

	function setStep(step: Step) {
		currentStep = step;
		mobileSidebarOpen = false;
		if (!browser) return;
		window.requestAnimationFrame(() => contentPanel?.scrollTo({ top: 0, left: 0 }));
	}

	function previousStep() {
		if (currentStep > 1) {
			setStep((currentStep - 1) as Step);
		}
	}

	function toggleSidebar() {
		if (browser && window.innerWidth < 1024) {
			mobileSidebarOpen = !mobileSidebarOpen;
			return;
		}
		sidebarCollapsed = !sidebarCollapsed;
	}

	function chooseAnswer(blockerId: string, answer: string) {
		const blocker = blockers.find((item) => item.id === blockerId);
		if (!blocker) return;

		blocker.answer = answer;
		if (blockerId === 'starburst-size') {
			const starburst = lineItems.find((item) => item.id === 'bali-starburst');
			if (starburst) {
				starburst.item = `Bali Starburst ${answer}`;
				starburst.styleCode = `HB-SB-${answer.toUpperCase()}`;
				starburst.notes = `Resolved size: ${answer}`;
			}
		}
		if (blockerId === 'horse-pin-size') {
			const horse = lineItems.find((item) => item.id === 'horse-unclear');
			if (horse) {
				horse.item = `Horse Pin ${answer}`;
				horse.styleCode = `HB-HORSE-${answer.charAt(0).toUpperCase()}`;
				horse.notes = `Resolved size: ${answer}`;
			}
		}
	}

	function continueToSheets() {
		if (!allAnswered) return;
		setStep(3);
		activeTab = 'production';
	}

	// Grouping Helpers for Step 3 Production tab
	const silverProduction = $derived(lineItems.filter(x => {
		const cat = catalog.find(c => c.styleCode === x.styleCode);
		return cat ? cat.material === 'Silver' : x.finish.toLowerCase().includes('silver');
	}));
	const goldProduction = $derived(lineItems.filter(x => {
		const cat = catalog.find(c => c.styleCode === x.styleCode);
		return cat ? cat.material === 'Gold' : x.finish.toLowerCase().includes('gold') || x.finish.toLowerCase().includes('vermeil');
	}));
	const otherProduction = $derived(lineItems.filter(x => {
		const cat = catalog.find(c => c.styleCode === x.styleCode);
		return cat ? (cat.material !== 'Silver' && cat.material !== 'Gold') : (!x.finish.toLowerCase().includes('silver') && !x.finish.toLowerCase().includes('gold') && !x.finish.toLowerCase().includes('vermeil'));
	}));

	const pinsProduction = $derived(lineItems.filter(x => {
		const cat = catalog.find(c => c.styleCode === x.styleCode);
		return cat ? (cat.category === 'Pins' || cat.category === 'Brim Pinches') : false;
	}));
	const traditionalProduction = $derived(lineItems.filter(x => {
		const cat = catalog.find(c => c.styleCode === x.styleCode);
		return cat ? cat.category === 'Traditional Jewelry' : true;
	}));
	const otherCatProduction = $derived(lineItems.filter(x => {
		const cat = catalog.find(c => c.styleCode === x.styleCode);
		return cat ? cat.category === 'Others' : false;
	}));

	function markDirty() {
		sheetDirty = true;
	}

	function saveChanges() {
		lastSaved = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
		sheetDirty = false;
		showToast('Changes saved.');
	}

	function sanitizeExportCell(value: string | number) {
		const text = String(value ?? '');
		if (/^[=+\-@\t\r]/.test(text)) return `'${text}`;
		return text;
	}

	function csvEscape(value: string | number) {
		const text = sanitizeExportCell(value);
		return `"${text.replaceAll('"', '""')}"`;
	}

	function productionRows() {
		const warningRows = remainingAnswers
			? [
					[
						'UNRESOLVED WARNING',
						`${remainingAnswers} required production answers remain before final use.`,
						'',
						'',
						'',
						''
					]
				]
			: [];

		return [
			['Item', 'Style code', 'Qty', 'Material / finish', 'Production notes', 'Source evidence'],
			...warningRows,
			...lineItems.map((item) => [
				item.item,
				item.styleCode,
				item.qty,
				item.finish,
				item.notes,
				item.source
			])
		];
	}

	function packingRows() {
		return [
			['Item', 'Qty', 'Packing check', 'Notes'],
			...lineItems.map((item) => [
				item.item,
				item.qty,
				'Confirm count and finish label',
				item.notes
			])
		];
	}

	function rowsToCsv(rows: (string | number)[][]) {
		return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
	}

	function downloadCsv(kind: 'production' | 'packing') {
		const rows = kind === 'production' ? productionRows() : packingRows();
		const blob = new Blob([rowsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${orderId}-${kind === 'production' ? 'production-sheet' : 'packing-checklist'}.csv`;
		link.click();
		URL.revokeObjectURL(url);
		exportOpen = false;
		showToast(`${kind === 'production' ? 'Production sheet' : 'Packing checklist'} CSV downloaded.`);
	}

	async function copyTable() {
		const rows = activeTab === 'packing' ? packingRows() : productionRows();
		await navigator.clipboard.writeText(
			rows.map((row) => row.map((cell) => sanitizeExportCell(cell)).join('\t')).join('\n')
		);
		exportOpen = false;
		showToast('Table copied.');
	}

	async function copyCustomerUpdate() {
		await navigator.clipboard.writeText(customerUpdate);
		showToast('Customer update copied.');
	}

	function saveDraft() {
		lastSaved = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
		showToast('Draft saved.');
	}

	function markSent() {
		sent = true;
		showToast('Marked as sent.');
	}

	// Onboarding Tour logic
	function startTour() {
		const d = driver({
			showProgress: true,
			nextBtnText: 'Next →',
			prevBtnText: '← Back',
			doneBtnText: 'Done',
			animate: true, // Animations enabled as viewport fits clean and scroll-free
			steps: [
				{ 
					element: '#sidebar-logo', 
					popover: { 
						title: 'Welcome to Artisan', 
						description: 'Your Quiet Workshop companion for processing Heather Benjamin Jewelry wholesale orders.', 
						side: 'right', 
						align: 'start' 
					} 
				},
				{ 
					element: '#intake-scratchpad', 
					popover: { 
						title: '1. Ingestion Area', 
						description: 'Paste unstructured order text (emails, DMs, spreadsheet rows) here. No strict parsing forms required.', 
						side: 'bottom' 
					} 
				},
				{ 
					element: '#try-sample-btn', 
					popover: { 
						title: '2. Try Sample Order', 
						description: 'Load a realistic wholesale order containing item size ambiguities to test the verification pipeline.', 
						side: 'top' 
					} 
				},
				{ 
					element: '#process-order-btn', 
					popover: { 
						title: '3. Process Order', 
						description: 'Run the extraction engine to catalog items and instantly discover production blockers.', 
						side: 'top' 
					} 
				},
				{ 
					element: '#silver-auditor', 
					popover: { 
						title: '4. Silver Spot Auditor', 
						description: 'Drag this slider to simulate changes in silver spot price, which automatically flags outdated order rates.', 
						side: 'right' 
					} 
				}
			]
		});
		d.drive();
	}

	onMount(() => {
		// Launch tour automatically on first load
		const onboarded = localStorage.getItem('artisan-onboarded');
		if (!onboarded) {
			localStorage.setItem('artisan-onboarded', 'true');
			setTimeout(() => {
				startTour();
			}, 600);
		}
	});

	// Packing Helpers
	function getPackagingSpecifics(styleCode: string): string {
		if (!styleCode) return 'Standard pouch';
		if (styleCode.includes('STUD') || styleCode.includes('MINI') || styleCode.includes('SMALL') || styleCode.includes('LARGE')) {
			return 'Earring card + small linen pouch';
		}
		if (styleCode.includes('HORSE') || styleCode.includes('MTN')) {
			return 'Premium gift box + custom wrapping';
		}
		if (styleCode.includes('WAVE')) {
			return 'Velvet pouch + gift box';
		}
		return 'Standard jewelry pouch';
	}

	function isBackordered(styleCode: string): boolean {
		return styleCode === 'HB-WAVE-C';
	}
</script>

<svelte:head>
	<title>Artisan · Order-to-Production Assistant</title>
	<meta
		name="description"
		content="Internal order-to-production assistant for Heather Benjamin Jewelry"
	/>
</svelte:head>

<main class="h-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
	<div class={`app-shell ${sidebarCollapsed ? 'app-shell-collapsed' : ''}`}>
		{#if mobileSidebarOpen}
			<button
				class="sidebar-backdrop"
				type="button"
				aria-label="Close sidebar"
				onclick={() => (mobileSidebarOpen = false)}
			></button>
		{/if}

		<aside
			class={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileSidebarOpen ? 'sidebar-open' : ''} flex flex-col h-screen`}
		>
			<div class="sidebar-heading" id="sidebar-logo">
				{#if !sidebarCollapsed}
					<!-- Open State Header -->
					<div class="flex w-full items-center justify-between">
						<div class="sidebar-title flex items-center gap-2">
							<div class="w-8 h-8 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--brand)]">
								<i class="ri-sparkling-fill text-lg"></i>
							</div>
							<div>
								<p class="font-display text-xl leading-tight">Artisan</p>
								<p class="text-[10px] text-[var(--muted)]">Order-to-Production</p>
							</div>
						</div>
						<div class="relative group">
							<button
								class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-muted)] text-[var(--muted)] hover:text-[var(--ink)] transition bg-transparent border-0 p-0 cursor-pointer"
								type="button"
								aria-label={currentLocale === 'id' ? 'Tutup bilah samping' : 'Close sidebar'}
								onclick={toggleSidebar}
							>
								<i class="ri-sidebar-fold-line text-lg"></i>
							</button>
							<div class="absolute right-10 top-1/2 -translate-y-1/2 bg-[var(--surface-muted)] text-[var(--ink)] text-[10px] font-semibold px-2 py-1 rounded shadow border border-[var(--line)] whitespace-nowrap z-50 hidden group-hover:block">
								{currentLocale === 'id' ? 'Tutup bilah samping' : 'Close sidebar'}
							</div>
						</div>
					</div>
				{:else}
					<!-- Collapsed State Header: shows logo, on hover replaces with toggle button -->
					<div class="relative w-10 h-10 flex items-center justify-center mx-auto group">
						<!-- Logo: visible by default, hidden on hover -->
						<div class="w-8 h-8 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--brand)] transition-opacity duration-150 group-hover:opacity-0">
							<i class="ri-sparkling-fill text-lg"></i>
						</div>
						<!-- Toggle button: hidden by default, visible on hover -->
						<button
							class="absolute inset-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--surface-muted)] text-[var(--muted)] hover:text-[var(--ink)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-transparent border-0 p-0 cursor-pointer"
							type="button"
							aria-label={currentLocale === 'id' ? 'Buka bilah samping' : 'Open sidebar'}
							onclick={toggleSidebar}
						>
							<i class="ri-sidebar-unfold-line text-lg"></i>
						</button>
						<div class="absolute left-12 top-1/2 -translate-y-1/2 ml-2 bg-[var(--surface-muted)] text-[var(--ink)] text-[10px] font-semibold px-2 py-1 rounded shadow border border-[var(--line)] whitespace-nowrap z-50 hidden group-hover:block">
							{currentLocale === 'id' ? 'Buka bilah samping' : 'Open sidebar'}
						</div>
					</div>
				{/if}
			</div>

			<nav class="mt-10 space-y-2 flex-1">
				<div class="relative group">
					<button
						class="flex w-full items-center gap-3 rounded-md bg-[var(--nav-active)] px-4 py-3 text-left font-semibold"
						type="button"
					>
						<i class="ri-file-list-3-line text-lg" aria-hidden="true"></i>
						<span class="sidebar-label">{t.orders}</span>
					</button>
					{#if sidebarCollapsed}
						<div class="absolute left-14 top-1/2 -translate-y-1/2 ml-2 bg-[var(--surface-muted)] text-[var(--ink)] text-[10px] font-semibold px-2 py-1 rounded shadow border border-[var(--line)] whitespace-nowrap z-50 hidden group-hover:block">
							{t.orders}
						</div>
					{/if}
				</div>

				<div class="relative group">
					<button
						class="flex w-full items-center justify-between rounded-md px-4 py-3 text-left text-[var(--ink)]"
						type="button"
					>
						<span class="flex items-center gap-3">
							<i class="ri-book-open-line text-lg" aria-hidden="true"></i>
							<span class="sidebar-label">{t.replayTour === 'Ulangi Tur' ? 'Katalog' : 'Catalog'}</span>
						</span>
						<span class="sidebar-label rounded bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--muted)]">Later</span>
					</button>
					{#if sidebarCollapsed}
						<div class="absolute left-14 top-1/2 -translate-y-1/2 ml-2 bg-[var(--surface-muted)] text-[var(--ink)] text-[10px] font-semibold px-2 py-1 rounded shadow border border-[var(--line)] whitespace-nowrap z-50 hidden group-hover:block">
							{t.replayTour === 'Ulangi Tur' ? 'Katalog' : 'Catalog'}
						</div>
					{/if}
				</div>

				<div class="relative group">
					<button
						id="replay-tour-btn"
						class="flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-[var(--ink)] hover:bg-[var(--surface-soft)] transition"
						type="button"
						onclick={startTour}
					>
						<i class="ri-question-line text-lg" aria-hidden="true"></i>
						<span class="sidebar-label">{t.replayTour}</span>
					</button>
					{#if sidebarCollapsed}
						<div class="absolute left-14 top-1/2 -translate-y-1/2 ml-2 bg-[var(--surface-muted)] text-[var(--ink)] text-[10px] font-semibold px-2 py-1 rounded shadow border border-[var(--line)] whitespace-nowrap z-50 hidden group-hover:block">
							{t.replayTour}
						</div>
					{/if}
				</div>
			</nav>

			{#if !sidebarCollapsed}
				<div class="mt-auto border-t border-[var(--line)] pt-6 space-y-4" id="silver-auditor">
					<div class="rounded-md bg-[var(--surface-soft)] p-4 border border-[var(--line)] shadow-sm">
						<h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Silver Spot Auditor</h3>
						<div class="mt-3 flex items-center justify-between">
							<span class="text-sm text-[var(--ink)] font-medium">Silver Spot:</span>
							<strong class="text-sm text-[var(--brand)]">${silverSpotRate.toFixed(2)}/g</strong>
						</div>
						<input
							type="range"
							min="0.5"
							max="2.5"
							step="0.05"
							bind:value={silverSpotRate}
							class="mt-2 w-full accent-[var(--brand)] cursor-ew-resize"
						/>
						<p class="mt-1 text-[10px] text-[var(--muted)]">Recalculates margins and flags outdated client pricing.</p>
					</div>
				</div>
			{/if}
		</aside>

		<section class="app-main">
			<header class="app-header flex items-center justify-between px-6 py-3 border-b border-[var(--line)] bg-white">
				<div class="flex items-center gap-4">
					<button class="icon-button header-toggle" type="button" aria-label="Toggle sidebar" onclick={toggleSidebar}>
						<i class="ri-menu-line text-lg" aria-hidden="true"></i>
					</button>
					<span class="text-xs text-[var(--muted)]">Last saved {lastSaved}</span>
				</div>
				<div class="flex items-center gap-4">
					<!-- i18n Language Segment Control -->
					<div class="flex items-center gap-1 border border-[var(--line)] rounded bg-[var(--surface-soft)] p-0.5 text-xs shadow-sm">
						<i class="ri-translate-2 text-[var(--muted)] px-1 text-sm"></i>
						<a
							href={resolve(localizeHref(page.url.pathname, { locale: 'en' }) as Pathname)}
							class={`px-2 py-1 rounded font-semibold text-xs transition-all ${currentLocale === 'en' ? 'bg-[var(--brand)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
						>
							English
						</a>
						<a
							href={resolve(localizeHref(page.url.pathname, { locale: 'id' }) as Pathname)}
							class={`px-2 py-1 rounded font-semibold text-xs transition-all ${currentLocale === 'id' ? 'bg-[var(--brand)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
						>
							Indonesia
						</a>
					</div>

					<!-- Right Sidebar Toggle Button -->
					<div class="relative group">
						<button
							class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition bg-transparent border-0 p-0 cursor-pointer"
							type="button"
							aria-label={rightSidebarCollapsed ? 'Open right panel' : 'Close right panel'}
							onclick={() => (rightSidebarCollapsed = !rightSidebarCollapsed)}
						>
							{#if rightSidebarCollapsed}
								<i class="ri-layout-right-line text-lg"></i>
							{:else}
								<i class="ri-layout-right-fill text-lg text-[var(--brand)]"></i>
							{/if}
						</button>
						<div class="absolute right-0 top-10 bg-[var(--surface-muted)] text-[var(--ink)] text-[10px] font-semibold px-2 py-1 rounded shadow border border-[var(--line)] whitespace-nowrap z-50 hidden group-hover:block">
							{rightSidebarCollapsed 
								? (currentLocale === 'id' ? 'Buka panel kanan' : 'Open right panel') 
								: (currentLocale === 'id' ? 'Tutup panel kanan' : 'Close right panel')}
						</div>
					</div>
				</div>
			</header>

			<div class="step-scroll border-b border-[var(--line)] bg-white px-4 md:px-10">
				<div class="mx-auto flex h-full min-w-max max-w-6xl items-center justify-between gap-3 md:gap-4">
					{#each steps as step, index (step.id)}
						<button
							class={`step-button ${currentStep === step.id ? 'step-button-active' : ''}`}
							type="button"
							disabled={step.id > maxStep}
							onclick={() => {
								if (step.id <= maxStep) setStep(step.id);
							}}
						>
							<span class="step-index flex items-center justify-center">
								{#if step.id < currentStep}
									<i class="ri-check-line text-sm font-bold" aria-hidden="true"></i>
								{:else}
									{step.id}
								{/if}
							</span>
							<span class={`step-label ${step.id > maxStep ? 'text-[var(--muted)] opacity-60' : 'font-semibold'}`}>
								{t[step.id === 1 ? 'addOrder' : step.id === 2 ? 'reviewOrder' : step.id === 3 ? 'sheets' : 'customerUpdate']}
							</span>
						</button>
						{#if index < steps.length - 1}
							<div class="hidden h-px flex-1 bg-[var(--line)] md:block"></div>
						{/if}
					{/each}
				</div>
			</div>

			<div class="min-h-0 overflow-auto" bind:this={contentPanel}>
				{#if currentStep === 1}
					<section class={`grid min-h-full transition-all duration-300 ${rightSidebarCollapsed ? 'xl:grid-cols-1' : 'xl:grid-cols-[1fr_368px]'}`}>
						<div class="px-4 py-6 md:px-10 md:py-10">
							<div class="mx-auto max-w-4xl">
								<h1 class="font-display text-4xl leading-tight md:text-5xl">{t.addWholesaleOrder}</h1>
								<p class="mt-4 max-w-3xl text-lg leading-8">{t.intakeDesc}</p>

								<div class="mt-8 rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm">
									<!-- Ingestion Mode Tabs -->
									<div class="flex border-b border-[var(--line)] mb-6">
										<button
											class={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${activeIngestTab === 'paste' ? 'border-[var(--brand)] text-[var(--brand-dark)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'}`}
											type="button"
											onclick={() => (activeIngestTab = 'paste')}
										>
											<i class="ri-keyboard-line text-base"></i> {currentLocale === 'id' ? 'Tempel Teks' : 'Paste Text'}
										</button>
										<button
											class={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${activeIngestTab === 'upload' ? 'border-[var(--brand)] text-[var(--brand-dark)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'}`}
											type="button"
											onclick={() => (activeIngestTab = 'upload')}
										>
											<i class="ri-upload-cloud-2-line text-base"></i> {currentLocale === 'id' ? 'Unggah File' : 'Upload File'}
										</button>
									</div>

									{#if activeIngestTab === 'paste'}
										<!-- Paste Mode Panel -->
										<div class="flex flex-wrap gap-2 mb-4">
											{#each sourceTypes as source (source)}
												<button
													class={`chip ${selectedSource === source ? 'chip-active' : ''}`}
													type="button"
													onclick={() => (selectedSource = source)}
												>
													{source}
												</button>
											{/each}
										</div>

										<label class="block">
											<span class="sr-only">{t.addWholesaleOrder}</span>
											<textarea
												id="intake-scratchpad"
												class="h-[260px] w-full resize-none rounded-md border border-[var(--line)] bg-[var(--surface-soft)] p-4 font-mono text-sm leading-6 outline-none transition focus:border-[var(--brand)] focus:bg-white"
												bind:value={intakeText}
											></textarea>
										</label>

										<div class="mt-5 flex items-center justify-end gap-3">
											<button id="try-sample-btn" class="secondary-button" type="button" onclick={useSampleOrder}>
												{t.trySample}
											</button>
											<button id="process-order-btn" class="primary-button flex items-center justify-center" type="button" onclick={processOrder}>
												{t.processOrder} <i class="ri-arrow-right-line ml-1" aria-hidden="true"></i>
											</button>
										</div>
									{:else}
										<!-- Upload Mode Panel -->
										<div 
											class={`border-2 rounded-lg p-10 text-center transition-all duration-300 relative ${isDragging ? 'border-[var(--brand)] bg-[var(--brand)]/10 scale-[1.02] ring-4 ring-[var(--brand)]/20 border-solid' : 'border-dashed border-[var(--line)] bg-[var(--surface-soft)] hover:border-[var(--brand)] hover:bg-[var(--surface-soft)]'}`}
											role="region"
											aria-label="File upload dropzone"
										>
											<input 
												class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
												type="file" 
												multiple
												onchange={handleFileUpload}
												ondragenter={(e) => { e.preventDefault(); isDragging = true; }}
												ondragover={(e) => { e.preventDefault(); isDragging = true; }}
												ondragleave={() => { isDragging = false; }}
												ondrop={handleFileDrop}
											/>
											<i class={`ri-upload-cloud-2-line text-4xl block mb-3 transition-transform duration-300 ${isDragging ? 'text-[var(--brand)] scale-110' : 'text-[var(--brand)]'}`}></i>
											<strong class="block text-base text-[var(--ink)] mb-1">
												{currentLocale === 'id' ? 'Tarik & lepas file di sini' : 'Drag & drop file here'}
											</strong>
											<span class="text-xs text-[var(--muted)]">
												{currentLocale === 'id' ? 'atau klik untuk memilih dari komputer Anda' : 'or click to browse from your computer'}
											</span>
											<div class="mt-4 text-[var(--muted)] text-[10px] uppercase font-bold tracking-wider">
												PDF, CSV, XLSX, PNG, JPG, TXT
											</div>
										</div>

										{#if uploadedFiles.length > 0}
											<div class="mt-4 space-y-2">
												{#each uploadedFiles as file, index (file + '-' + index)}
													<div class="p-3 border border-emerald-100 bg-emerald-50/30 rounded flex items-center justify-between text-xs text-emerald-800">
														<span class="flex items-center gap-2">
															<i class="ri-checkbox-circle-line text-emerald-600 text-base"></i>
															<strong>{file}</strong> ({currentLocale === 'id' ? 'File berhasil diunggah' : 'File uploaded successfully'})
														</span>
														<button
															class="text-red-600 hover:text-red-800 transition font-bold cursor-pointer"
															type="button"
															onclick={() => {
																uploadedFiles = uploadedFiles.filter((_, i) => i !== index);
																if (uploadedFiles.length > 0) {
																	intakeText = `[Files Source: ${uploadedFiles.join(', ')}]\n\n` + sampleOrder;
																} else {
																	intakeText = '';
																}
															}}
														>
															{currentLocale === 'id' ? 'Hapus' : 'Remove'}
														</button>
													</div>
												{/each}
											</div>
										{/if}

										<div class="mt-6 flex justify-end gap-3">
											<button id="process-file-btn" class="primary-button flex items-center justify-center" type="button" disabled={uploadedFiles.length === 0} onclick={processOrder}>
												{t.processOrder} <i class="ri-arrow-right-line ml-1" aria-hidden="true"></i>
											</button>
										</div>
									{/if}
								</div>

								<p class="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]">
									<i class="ri-shield-check-line text-base text-[var(--brand)]" aria-hidden="true"></i>
									{t.safetyNote}
								</p>
							</div>
						</div>

						{#if !rightSidebarCollapsed}
							<aside class="border-l border-[var(--line)] bg-white px-8 py-10">
								<div class="flex items-center justify-between gap-4 mb-7">
									<h2 class="font-display text-2xl">{t.nextTitle}</h2>
									<button
										class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition bg-transparent border-0 p-0 cursor-pointer"
										type="button"
										aria-label="Close right panel"
										onclick={() => (rightSidebarCollapsed = true)}
									>
										<i class="ri-close-line text-lg"></i>
									</button>
								</div>
								<div class="mt-7 space-y-5">
									<!-- Checklist Item 1 -->
									<div class={`next-card transition-all duration-300 ${step1_item1 ? 'border-emerald-200 bg-emerald-50/20' : ''}`}>
										<span class={`flex items-center justify-center font-bold text-sm rounded-full w-8 h-8 border ${step1_item1 ? 'bg-emerald-600 text-white border-transparent' : 'border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)]'}`}>
											{#if step1_item1}
												<i class="ri-check-line text-sm font-bold"></i>
											{:else}
												1
											{/if}
										</span>
										<div>
											<h3 class={step1_item1 ? 'text-[var(--ink)] font-semibold' : 'text-sm font-semibold'}>{t.extractTitle}</h3>
											<p class="text-xs text-[var(--muted)] mt-1">{t.extractDesc}</p>
										</div>
									</div>

									<!-- Checklist Item 2 -->
									<div class={`next-card transition-all duration-300 ${step1_item2 ? 'border-emerald-200 bg-emerald-50/20' : ''}`}>
										<span class={`flex items-center justify-center font-bold text-sm rounded-full w-8 h-8 border ${step1_item2 ? 'bg-emerald-600 text-white border-transparent' : 'border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)]'}`}>
											{#if step1_item2}
												<i class="ri-check-line text-sm font-bold"></i>
											{:else}
												2
											{/if}
										</span>
										<div>
											<h3 class={step1_item2 ? 'text-[var(--ink)] font-semibold' : 'text-sm font-semibold'}>
												{currentLocale === 'id' ? 'Gunakan Contoh Data' : 'Review Sample Data'}
											</h3>
											<p class="text-xs text-[var(--muted)] mt-1">
												{currentLocale === 'id' ? 'Gunakan contoh data PO untuk mempelajari ekstraksi otomatis Artisan.' : 'Click "Gunakan Contoh Pesanan" to load PO sample data.'}
											</p>
										</div>
									</div>

									<!-- Checklist Item 3 -->
									<div class={`next-card transition-all duration-300 ${step1_item3 ? 'border-emerald-200 bg-emerald-50/20' : ''}`}>
										<span class={`flex items-center justify-center font-bold text-sm rounded-full w-8 h-8 border ${step1_item3 ? 'bg-emerald-600 text-white border-transparent' : 'border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)]'}`}>
											{#if step1_item3}
												<i class="ri-check-line text-sm font-bold"></i>
											{:else}
												3
											{/if}
										</span>
										<div>
											<h3 class={step1_item3 ? 'text-[var(--ink)] font-semibold' : 'text-sm font-semibold'}>
												{currentLocale === 'id' ? 'Mulai Proses Pesanan' : 'Start Order Processing'}
											</h3>
											<p class="text-xs text-[var(--muted)] mt-1">
												{currentLocale === 'id' ? 'Kirim pesanan yang dimasukkan untuk masuk ke tahap audit.' : 'Process the entered order text to proceed to step 2.'}
											</p>
										</div>
									</div>
								</div>
							</aside>
						{/if}
					</section>
				{:else if currentStep === 2}
					<section class={`grid min-h-full transition-all duration-300 ${rightSidebarCollapsed ? 'xl:grid-cols-1' : 'xl:grid-cols-[1fr_352px]'}`}>
						<div class="px-4 py-6 md:px-10 md:py-8">
							<div class="mx-auto max-w-5xl">
								<div class="flex flex-wrap items-start justify-between gap-4">
									<div>
										<p class="text-sm uppercase tracking-wide text-[var(--muted)]">
											Order #{orderId}
											<span class="ml-3 rounded border border-[var(--line)] px-2 py-1 normal-case tracking-normal font-sans"
												>Wholesale</span
											>
											<span class="ml-3 normal-case tracking-normal">Client: {client}</span>
										</p>
										<h1 class="mt-5 font-display text-4xl leading-tight md:text-5xl">{t.reviewOrder}</h1>
										<p class="mt-3 text-lg">{t.foundItems}</p>
										<p class="mt-1 text-sm text-[var(--muted)]">
											{#if remainingAnswers > 0}
												{t.unresolvedCount(remainingAnswers)}
											{:else}
												{t.allResolved}
											{/if}
										</p>
										<p class="mt-4 text-sm text-[var(--muted)]">Source: {uploadedFiles.length > 0 ? `Uploaded ${uploadedFiles.join(', ')}` : 'Pasted text'}</p>
									</div>

									<div class="page-actions">
										<button class="ghost-button" type="button" onclick={() => showToast('Progress saved.')}>
											{t.saveProgress}
										</button>
										<button class="secondary-button" type="button" onclick={() => (showOriginalDrawer = true)}>{t.viewOriginal}</button>
									</div>
								</div>

								<!-- Outdated spot auditor alert banner -->
								{#if pricingWarnings.length > 0}
									<div class="mt-6 rounded-md border border-[var(--warning)] bg-[var(--warning-bg)] p-4 text-sm text-[var(--warning-ink)] leading-relaxed shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
										<div class="flex items-start gap-2.5">
											<i class="ri-error-warning-line text-lg text-[var(--warning)] shrink-0 mt-0.5" aria-hidden="true"></i>
											<div>
												{#if currentLocale === 'id'}
													<strong>Selisih Harga:</strong> Harga PO di bawah kalkulasi spot rate (<strong>${silverSpotRate.toFixed(2)}/g</strong>). Tim Bali berpotensi menolak.
												{:else}
													<strong>Price Discrepancy:</strong> PO prices are below spot calculations (<strong>${silverSpotRate.toFixed(2)}/g</strong>). Bali team may reject due to low margins.
												{/if}
											</div>
										</div>
										<button
											class="secondary-button whitespace-nowrap text-xs font-semibold px-3 py-1.5 bg-white border border-[var(--warning)] hover:bg-[var(--warning-bg)] text-[var(--warning-ink)] transition flex items-center gap-1 cursor-pointer shrink-0"
											type="button"
											onclick={applySafeSpotRate}
										>
											<i class="ri-refresh-line"></i>
											{currentLocale === 'id' ? 'Sesuaikan' : 'Resolve'}
										</button>
									</div>
								{/if}

								<h2 class="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
									{t.needsAnswer} ({remainingAnswers})
								</h2>
								<div class="mt-3 space-y-4">
									{#each blockers as blocker (blocker.id)}
										<article class={`blocker-card ${blocker.answer ? 'blocker-card-done' : ''}`}>
											<div class="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
												<div>
													<div class="flex flex-wrap items-center gap-3">
														<span
															class={`impact flex items-center gap-1.5 ${blocker.impact === 'High impact' ? 'impact-high text-[var(--warning-ink)]' : 'text-[var(--warning-ink)]'}`}
														>
															<i class="ri-alert-line" aria-hidden="true"></i>
															{blocker.impact}
														</span>
														{#if blocker.answer}
															<span class="answered-pill flex items-center gap-1">
																<i class="ri-checkbox-circle-line" aria-hidden="true"></i>
																Answered: {blocker.answer}
															</span>
														{/if}
													</div>
													<h3 class="mt-3 text-lg font-semibold">{blocker.question}</h3>
													<p class="mt-1 text-sm text-[var(--muted)]">
														{currentLocale === 'id' ? 'Ditemukan:' : 'Found:'} “{blocker.evidence}” ({blocker.source})
													</p>
												</div>
												<div class="flex flex-wrap gap-3 w-full md:w-auto">
													{#each blocker.options as option (option)}
														<button
															class={`choice-card flex flex-col items-start p-3 rounded-lg border text-left transition-all duration-200 cursor-pointer min-w-[130px] flex-1 md:flex-none ${blocker.answer === option ? 'border-[var(--brand)] bg-[var(--surface-soft)] ring-2 ring-[var(--brand)]/10' : 'border-[var(--line)] bg-white hover:border-[var(--brand)] hover:bg-[var(--surface-soft)]'}`}
															type="button"
															onclick={() => chooseAnswer(blocker.id, option)}
														>
															<span class="font-bold text-sm text-[var(--ink)]">{option}</span>
															<span class="text-[10px] text-[var(--muted)] mt-1 leading-tight">{getOptionDetail(blocker.id, option)}</span>
														</button>
													{/each}
												</div>
											</div>
											<div class="border-t border-[var(--line)] bg-[var(--warning-bg)]/20 px-4 py-3 text-xs text-[var(--warning-ink)] flex items-start gap-2 leading-relaxed">
												<i class="ri-error-warning-line text-sm text-[var(--warning)] shrink-0 mt-0.5" aria-hidden="true"></i>
												<div>
													<strong class="font-semibold uppercase tracking-wider text-[10px] text-[var(--brand-dark)] block mb-0.5">
														{currentLocale === 'id' ? 'Risiko Produksi:' : 'Production Risk:'}
													</strong>
													{blocker.risk}
												</div>
											</div>
										</article>
									{/each}
								</div>

								<h2 class="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
									{t.looksReady} ({readyItems.length})
								</h2>
								<div class="mt-3 overflow-hidden rounded-md border border-[var(--line)] bg-white shadow-sm">
									<table class="w-full text-left text-sm">
										<thead class="bg-[var(--surface-soft)] border-b border-[var(--line)]">
											<tr>
												<th class="w-10 px-3 py-3"></th>
												<th class="px-3 py-3">Item</th>
												<th class="px-3 py-3">Style code</th>
												<th class="px-3 py-3">Qty</th>
												<th class="px-3 py-3">Finish</th>
												<th class="px-3 py-3 text-right">PO Price</th>
												<th class="px-3 py-3 text-right">Calc Cost</th>
												<th class="px-3 py-3">Notes</th>
											</tr>
										</thead>
										<tbody>
											{#each readyItems as item (item.id)}
												{@const calculatedCost = item.styleCode ? getCalculatedCost(item.styleCode, silverSpotRate) : 0}
												{@const hasPriceWarning = item.styleCode && calculatedCost > item.unitPrice}
												<tr class="border-t border-[var(--line)]">
													<td class="px-3 py-3 text-[var(--ready-ink)] text-center">
														<i class="ri-checkbox-circle-line text-base font-medium" aria-hidden="true"></i>
													</td>
													<td class="px-3 py-3 font-medium">{item.item}</td>
													<td class="px-3 py-3 font-mono text-xs">{item.styleCode || 'PENDING'}</td>
													<td class="px-3 py-3 font-medium">{item.qty}</td>
													<td class="px-3 py-3">{item.finish}</td>
													<td class="px-3 py-3 text-right">${item.unitPrice.toFixed(2)}</td>
													<td class={`px-3 py-3 text-right font-medium flex items-center justify-end gap-1 ${hasPriceWarning ? 'text-[var(--warning)]' : 'text-[var(--ready-ink)]'}`}>
														${calculatedCost > 0 ? calculatedCost.toFixed(2) : '-'}
														{#if hasPriceWarning}
															<i class="ri-error-warning-line text-sm text-[var(--warning)] cursor-help" title="Outdated pricing" aria-hidden="true"></i>
														{/if}
													</td>
													<td class="px-3 py-3 text-[var(--muted)] text-xs">{item.notes}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						</div>

						{#if !rightSidebarCollapsed}
							<aside class="side-panel">
								<div class="flex items-center justify-between gap-4 mb-2">
									<h2 class="font-display text-2xl">{t.yourDocs}</h2>
									<button
										class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition bg-transparent border-0 p-0 cursor-pointer"
										type="button"
										aria-label="Close right panel"
										onclick={() => (rightSidebarCollapsed = true)}
									>
										<i class="ri-close-line text-lg"></i>
									</button>
								</div>
								<p class="text-sm text-[var(--muted)]">
									{allAnswered ? t.readyDocs : t.lockedDocs}
								</p>
								<div class="mt-6 space-y-4">
									{#each [t.productionSheet, t.packingChecklist, t.customerUpdate] as doc (doc)}
										{@const progress = doc === t.productionSheet ? prodProgress : (doc === t.packingChecklist ? packingProgress : customerProgress)}
										{@const isUnlocked = progress === 100}
										<div class={`document-card document-card-compact shadow-sm relative overflow-hidden transition-all duration-300 ${isUnlocked ? 'border-emerald-200 bg-emerald-50/10' : ''}`}>
											<!-- Progress Bar -->
											<div class="absolute bottom-0 left-0 h-1 bg-emerald-500 transition-all duration-500 ease-out" style="width: {progress}%"></div>
											
											<div>
												<h3 class={isUnlocked ? 'text-[var(--ink)] font-semibold' : ''}>{doc}</h3>
												<p class="text-xs text-[var(--muted)] mt-1">
													{allAnswered
														? doc === t.customerUpdate
															? 'Draft includes notes'
															: 'Ready after review'
														: doc === t.productionSheet
															? `Blocked by ${remainingAnswers} answers`
															: 'Blocked by production sheet'}
												</p>
											</div>
											<span aria-hidden="true" class={`text-lg transition-all duration-300 ${isUnlocked ? 'text-emerald-600 scale-110' : 'text-[var(--muted)]'}`}>
												{#if isUnlocked}
													<i class="ri-checkbox-circle-fill animate-scale-in block" aria-hidden="true"></i>
												{:else}
													<i class="ri-lock-line" aria-hidden="true"></i>
												{/if}
											</span>
										</div>
									{/each}
								</div>
								<div class="mt-6 rounded-md border border-[var(--info-line)] bg-[var(--info)] p-4 text-sm leading-relaxed text-blue-900 flex gap-2">
									<i class="ri-information-line text-lg text-blue-600 shrink-0" aria-hidden="true"></i>
									<span>{t.infoNote}</span>
								</div>
							</aside>
						{/if}
					</section>
				{:else if currentStep === 3}
					<section class="px-4 py-6 md:px-8 md:py-8">
						<div class="mx-auto max-w-7xl">
							<div class="flex flex-wrap items-start justify-between gap-5">
								<div>
									<p class="text-sm uppercase tracking-wide text-[var(--muted)]">
										Order #{orderId}
										<span class="ml-3 rounded border border-[var(--line)] px-2 py-1 normal-case tracking-normal font-sans"
											>Wholesale</span
										>
										<span class="ml-3 normal-case tracking-normal">Client: {client}</span>
									</p>
									<h1 class="mt-5 font-display text-4xl leading-tight md:text-5xl">{t.sheets}</h1>
									<p class="mt-3">{t.sheetsDesc}</p>
									<p class="mt-5 inline-flex items-center gap-1.5 rounded-md border border-[var(--ready)] bg-[var(--ready-bg)] px-3 py-2 text-sm text-[var(--ready-ink)] font-semibold">
										<i class="ri-checkbox-circle-line text-base" aria-hidden="true"></i>
										{t.answersComplete}
									</p>
								</div>

								<div class="page-actions">
									<button class="secondary-button" type="button" disabled={!sheetDirty} onclick={saveChanges}>
										{t.saveChanges}
									</button>
									<div class="relative">
										<button class="secondary-button flex items-center" type="button" onclick={() => (exportOpen = !exportOpen)}>
											{t.exportBtn} <i class="ri-arrow-down-s-line ml-1" aria-hidden="true"></i>
										</button>
										{#if exportOpen}
											<div class="absolute right-0 z-10 mt-2 w-56 rounded-md border border-[var(--line)] bg-white p-2 shadow-xl animate-fade-in">
												<button class="menu-item font-sans text-sm" type="button" onclick={() => downloadCsv('production')}>
													Download production CSV
												</button>
												<button class="menu-item font-sans text-sm" type="button" onclick={() => downloadCsv('packing')}>
													Download packing CSV
												</button>
												<button class="menu-item font-sans text-sm" type="button" onclick={copyTable}>Copy table</button>
											</div>
										{/if}
									</div>
								</div>
							</div>

							<div class="sheet-stats">
								<div>
									<span>Line items</span>
									<strong>{lineItems.length}</strong>
								</div>
								<div>
									<span>Total quantity</span>
									<strong>{totalQty}</strong>
								</div>
								<div>
									<span>Finishes</span>
									<strong>{finishSummary}</strong>
								</div>
								<div>
									<span>Unresolved</span>
									<strong>{remainingAnswers}</strong>
								</div>
							</div>

							<div class="mt-9 flex gap-8 border-b border-[var(--line)]">
								{#each [
									['production', t.productionSheet],
									['packing', t.packingChecklist],
									['customer', t.customerUpdate]
								] as tab (tab[0])}
									<button
										class={`tab-button ${activeTab === tab[0] ? 'tab-button-active' : ''}`}
										type="button"
										onclick={() => (activeTab = tab[0] as Tab)}
									>
										{tab[1]}
									</button>
								{/each}
							</div>

							<div class={`output-grid ${rightSidebarCollapsed ? 'output-grid-collapsed' : ''}`}>
								<div class="output-card shadow-sm">
									{#if activeTab === 'production'}
										<div class="mb-5 flex flex-wrap items-center justify-between gap-4">
											<div>
												<h2 class="font-display text-2xl">{t.productionSheet}</h2>
												<p class="mt-1 text-sm text-[var(--muted)]">
													Heather Benjamin Jewelry · Order {orderId} · {client}
												</p>
											</div>
											<!-- Grouping Mode Selector -->
											<div class="flex items-center gap-2 border border-[var(--line)] rounded bg-[var(--surface-soft)] p-1 text-xs">
												<span class="px-2 text-[var(--muted)] font-medium">{currentLocale === 'id' ? 'Grup berdasarkan:' : 'Group by:'}</span>
												<button
													class={`px-2 py-1 rounded transition font-semibold ${productionGrouping === 'material' ? 'bg-white shadow-sm border border-[var(--line)] text-[var(--brand-dark)]' : 'text-[var(--muted)]'}`}
													type="button"
													onclick={() => (productionGrouping = 'material')}
												>
													{currentLocale === 'id' ? 'Hasil Akhir Bahan' : 'Material Finish'}
												</button>
												<button
													class={`px-2 py-1 rounded transition font-semibold ${productionGrouping === 'category' ? 'bg-white shadow-sm border border-[var(--line)] text-[var(--brand-dark)]' : 'text-[var(--muted)]'}`}
													type="button"
													onclick={() => (productionGrouping = 'category')}
												>
													{currentLocale === 'id' ? 'Kategori Gaya' : 'Style Category'}
												</button>
											</div>
										</div>

										<div class="space-y-8">
											{#if productionGrouping === 'material'}
												<!-- GROUP BY MATERIAL -->
												{#each [
													{ name: currentLocale === 'id' ? 'Produksi Perak (Perak Murni)' : 'Silver Production (Perak Murni)', items: silverProduction },
													{ name: currentLocale === 'id' ? 'Produksi Emas Vermeil (Lapisan Emas)' : 'Gold Vermeil Production (Lapisan Emas)', items: goldProduction },
													{ name: currentLocale === 'id' ? 'Produksi Bahan Lainnya' : 'Other Materials Production', items: otherProduction }
												] as group}
													{#if group.items.length > 0}
														<div class="border border-[var(--line)] rounded-md overflow-hidden bg-white shadow-sm">
															<div class="bg-[var(--surface-muted)] px-4 py-2 border-b border-[var(--line)]">
																<h3 class="text-sm font-bold uppercase tracking-wider text-[var(--brand-dark)]">{group.name}</h3>
															</div>
															<table class="w-full text-left text-sm">
																<thead class="bg-[var(--surface-soft)] border-b border-[var(--line)]">
																	<tr>
																		<th class="w-24 px-3 py-2 text-xs font-bold text-[var(--muted)]">{currentLocale === 'id' ? 'Kode gaya' : 'Style code'}</th>
																		<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">{currentLocale === 'id' ? 'Deskripsi item' : 'Item description'}</th>
																		<th class="w-16 px-3 py-2 text-xs font-bold text-[var(--muted)]">{currentLocale === 'id' ? 'Jumlah' : 'Qty'}</th>
																		<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.exportBtn === 'Ekspor' ? 'Instruksi Teknis (EN/ID)' : 'Technical Instructions (EN/ID)'}</th>
																		<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">{currentLocale === 'id' ? 'Catatan Pesanan' : 'Order Notes'}</th>
																	</tr>
																</thead>
																<tbody>
																	{#each group.items as item (item.id)}
																		<tr class="border-t border-[var(--line)]">
																			<td class="px-2 py-2">
																				<input class="cell-input font-mono text-xs" bind:value={item.styleCode} oninput={markDirty} />
																			</td>
																			<td class="px-3 py-2 font-medium">{item.item}</td>
																			<td class="px-2 py-2">
																				<input class="cell-input w-16" type="number" min="0" bind:value={item.qty} oninput={markDirty} />
																			</td>
																			<td class="px-3 py-2 text-xs leading-relaxed">
																				{#if item.styleCode}
																					{@const cat = catalog.find(x => x.styleCode === item.styleCode)}
																					{#if cat}
																						<div class="text-[var(--ink)] font-medium">🇬🇧 {cat.notes_en}</div>
																						<div class="text-[var(--muted)] mt-1 italic">🇮🇩 {cat.notes_id}</div>
																					{:else}
																						<span class="text-[var(--muted)]">No instructions mapped</span>
																					{/if}
																				{:else}
																					<span class="text-[var(--warning)] font-semibold flex items-center gap-1">
																						<i class="ri-error-warning-line" aria-hidden="true"></i>
																						PENDING RESOLUTION
																					</span>
																				{/if}
																			</td>
																			<td class="px-2 py-2">
																				<input class="cell-input cell-input-wide text-xs" bind:value={item.notes} oninput={markDirty} />
																			</td>
																		</tr>
																	{/each}
																</tbody>
															</table>
														</div>
													{/if}
												{/each}
											{:else}
												<!-- GROUP BY CATEGORY -->
												{#each [
													{ name: currentLocale === 'id' ? 'Pen & Jepitan Brim' : 'Pins & Brim Pinches', items: pinsProduction },
													{ name: currentLocale === 'id' ? 'Perhiasan Tradisional' : 'Traditional Jewelry', items: traditionalProduction },
													{ name: currentLocale === 'id' ? 'Aksesori Lainnya' : 'Other Accessories', items: otherCatProduction }
												] as group}
													{#if group.items.length > 0}
														<div class="border border-[var(--line)] rounded-md overflow-hidden bg-white shadow-sm">
															<div class="bg-[var(--surface-muted)] px-4 py-2 border-b border-[var(--line)]">
																<h3 class="text-sm font-bold uppercase tracking-wider text-[var(--brand-dark)]">{group.name}</h3>
															</div>
															<table class="w-full text-left text-sm">
																<thead class="bg-[var(--surface-soft)] border-b border-[var(--line)]">
																	<tr>
																		<th class="w-24 px-3 py-2 text-xs font-bold text-[var(--muted)]">{currentLocale === 'id' ? 'Kode gaya' : 'Style code'}</th>
																		<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">{currentLocale === 'id' ? 'Deskripsi item' : 'Item description'}</th>
																		<th class="w-16 px-3 py-2 text-xs font-bold text-[var(--muted)]">{currentLocale === 'id' ? 'Jumlah' : 'Qty'}</th>
																		<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.exportBtn === 'Ekspor' ? 'Instruksi Teknis (EN/ID)' : 'Technical Instructions (EN/ID)'}</th>
																		<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">{currentLocale === 'id' ? 'Catatan Pesanan' : 'Order Notes'}</th>
																	</tr>
																</thead>
																<tbody>
																	{#each group.items as item (item.id)}
																		<tr class="border-t border-[var(--line)]">
																			<td class="px-2 py-2">
																				<input class="cell-input font-mono text-xs" bind:value={item.styleCode} oninput={markDirty} />
																			</td>
																			<td class="px-3 py-2 font-medium">{item.item}</td>
																			<td class="px-2 py-2">
																				<input class="cell-input w-16" type="number" min="0" bind:value={item.qty} oninput={markDirty} />
																			</td>
																			<td class="px-3 py-2 text-xs leading-relaxed">
																				{#if item.styleCode}
																					{@const cat = catalog.find(x => x.styleCode === item.styleCode)}
																					{#if cat}
																						<div class="text-[var(--ink)] font-medium">🇬🇧 {cat.notes_en}</div>
																						<div class="text-[var(--muted)] mt-1 italic">🇮🇩 {cat.notes_id}</div>
																					{:else}
																						<span class="text-[var(--muted)]">No instructions mapped</span>
																					{/if}
																				{:else}
																					<span class="text-[var(--warning)] font-semibold flex items-center gap-1">
																						<i class="ri-error-warning-line" aria-hidden="true"></i>
																						PENDING RESOLUTION
																					</span>
																				{/if}
																			</td>
																			<td class="px-2 py-2">
																				<input class="cell-input cell-input-wide text-xs" bind:value={item.notes} oninput={markDirty} />
																			</td>
																		</tr>
																	{/each}
																</tbody>
															</table>
														</div>
													{/if}
												{/each}
											{/if}
										</div>
									{:else if activeTab === 'packing'}
										<div class="mb-5">
											<h2 class="font-display text-2xl">{t.packingChecklist}</h2>
											<p class="mt-1 text-sm text-[var(--muted)]">
												Bali Fulfillment & Packing Check · Order {orderId} · {client}
											</p>
										</div>
										<div class="mt-5 overflow-hidden rounded-md border border-[var(--line)] bg-white shadow-sm">
											<table class="w-full text-left text-sm">
												<thead class="bg-[var(--surface-soft)] border-b border-[var(--line)]">
													<tr>
														<th class="w-12 px-3 py-3 text-center text-xs font-bold text-[var(--muted)]">{currentLocale === 'id' ? 'Pengepakan' : 'Packed'}</th>
														<th class="px-3 py-3 text-xs font-bold text-[var(--muted)]">Item</th>
														<th class="w-20 px-3 py-3 text-center text-xs font-bold text-[var(--muted)]">{currentLocale === 'id' ? 'Jumlah' : 'Qty'}</th>
														<th class="px-3 py-3 text-xs font-bold text-[var(--muted)]">{currentLocale === 'id' ? 'Spesifikasi Kemasan' : 'Packaging Specifics'}</th>
														<th class="px-3 py-3 text-xs font-bold text-[var(--muted)]">{currentLocale === 'id' ? 'Tanda Pemenuhan' : 'Fulfillment Flags'}</th>
														<th class="px-3 py-3 text-xs font-bold text-[var(--muted)]">{currentLocale === 'id' ? 'Catatan Pesanan' : 'Order Notes'}</th>
													</tr>
												</thead>
												<tbody>
													{#each lineItems as item (item.id)}
														{@const isBack = isBackordered(item.styleCode)}
														<tr class={`border-t border-[var(--line)] transition-all duration-150 ${packedItems[item.id] ? 'bg-emerald-50/40' : ''}`}>
															<td class="px-3 py-3 text-center">
																<input
																	type="checkbox"
																	bind:checked={packedItems[item.id]}
																	class="w-4 h-4 rounded border-[var(--line)] accent-[var(--brand)] cursor-pointer"
																/>
															</td>
															<td class="px-3 py-3 font-medium">
																<span class={packedItems[item.id] ? 'line-through text-[var(--muted)]' : ''}>
																	{item.item}
																</span>
															</td>
															<td class="px-3 py-3 text-center font-bold">{item.qty}</td>
															<td class="px-3 py-3 text-xs text-[var(--muted)]">{getPackagingSpecifics(item.styleCode)}</td>
															<td class="px-3 py-3">
																{#if isBack}
																	<span class="inline-flex items-center gap-1 rounded bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 uppercase tracking-wide border border-red-200">
																		<i class="ri-time-line" aria-hidden="true"></i>
																		Backorder
																	</span>
																	<span class="text-[10px] text-[var(--muted)] block mt-1">Split ship after Bali casting</span>
																{:else}
																	<span class="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 uppercase tracking-wide border border-emerald-200">
																		<i class="ri-send-plane-line" aria-hidden="true"></i>
																		Direct Ship
																	</span>
																{/if}
															</td>
															<td class="px-3 py-3 text-xs text-[var(--muted)] italic">{item.notes}</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									{:else}
										<h2 class="font-display text-2xl">Customer update draft</h2>
										<p class="mt-1 text-sm text-[var(--muted)]">Edit the drafted message directly.</p>
										<textarea
											class="mt-5 h-[420px] w-full resize-none rounded-md border border-[var(--line)] bg-[var(--surface-soft)] p-4 leading-7 outline-none focus:border-[var(--brand)] focus:bg-white"
											bind:value={customerUpdate}
										></textarea>
									{/if}
								</div>

								{#if !rightSidebarCollapsed}
									<aside class="output-side shadow-sm">
										<div class="flex items-center justify-between gap-4 mb-2">
											<h2 class="font-display text-2xl">{t.readyNext}</h2>
											<button
												class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition bg-transparent border-0 p-0 cursor-pointer"
												type="button"
												aria-label="Close right panel"
												onclick={() => (rightSidebarCollapsed = true)}
											>
												<i class="ri-close-line text-lg"></i>
											</button>
										</div>
										<p class="text-sm text-[var(--muted)]">
											{currentLocale === 'id' ? 'Dokumen menggunakan perubahan dalam aplikasi.' : 'Documents use current in-app edits.'}
										</p>
										<div class="mt-5 space-y-4">
											<button class="side-action transition flex items-center justify-between gap-3" type="button" onclick={() => downloadCsv('production')}>
												<div>
													<strong>{currentLocale === 'id' ? 'Unduh lembar produksi' : 'Download production sheet'}</strong>
													<span class="block text-xs text-[var(--muted)] mt-1">CSV format</span>
												</div>
												<i class="ri-download-2-line text-xl text-[var(--brand)]" aria-hidden="true"></i>
											</button>
											<button class="side-action transition flex items-center justify-between gap-3" type="button" onclick={() => downloadCsv('packing')}>
												<div>
													<strong>{currentLocale === 'id' ? 'Unduh daftar pengepakan' : 'Download packing checklist'}</strong>
													<span class="block text-xs text-[var(--muted)] mt-1">CSV format</span>
												</div>
												<i class="ri-download-2-line text-xl text-[var(--brand)]" aria-hidden="true"></i>
											</button>
											<button class="side-action transition flex items-center justify-between gap-3" type="button" onclick={copyCustomerUpdate}>
												<div>
													<strong>{t.copyUpdate}</strong>
													<span class="block text-xs text-[var(--muted)] mt-1">Plain text</span>
												</div>
												<i class="ri-file-copy-2-line text-xl text-[var(--brand)]" aria-hidden="true"></i>
											</button>
										</div>
									</aside>
								{/if}
							</div>
						</div>
					</section>
				{:else}
					<section class={`customer-grid ${rightSidebarCollapsed ? 'customer-grid-collapsed' : ''}`}>
						<div class="px-4 py-6 md:px-10 md:py-9">
							<div class="mx-auto max-w-5xl">
								<p class="text-sm uppercase tracking-wide text-[var(--muted)]">
									Order #{orderId}
									<span class="ml-3 rounded border border-[var(--line)] px-2 py-1 normal-case tracking-normal font-sans"
										>Wholesale</span
									>
									<span class="ml-3 normal-case tracking-normal font-sans">Client: {client}</span>
								</p>
								<div class="mt-5 flex flex-wrap items-start justify-between gap-4">
									<div>
										<h1 class="font-display text-4xl leading-tight md:text-5xl">{t.customerUpdate}</h1>
										<p class="mt-3 text-lg">{t.updateDesc}</p>
									</div>
									<div class="page-actions">
										<button class="ghost-button" type="button" onclick={saveDraft}>{t.saveDraft}</button>
										<button class="secondary-button" type="button">{t.preview}</button>
									</div>
								</div>

								<div class="mt-8 rounded-md border border-[var(--line)] bg-white p-4 text-sm leading-relaxed shadow-sm">
									<strong>{t.whatsIncluded}</strong>
									<p class="mt-1 text-[var(--muted)]">{t.includedDesc}</p>
								</div>

								<label class="mt-8 block">
									<span class="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
										{currentLocale === 'id' ? 'Pesan' : 'Message'}
									</span>
									<textarea
										class="customer-textarea shadow-inner"
										bind:value={customerUpdate}
									></textarea>
								</label>
							</div>
						</div>

						{#if !rightSidebarCollapsed}
							<aside class="side-panel customer-side">
								<div class="flex items-center justify-between gap-4 mb-2">
									<h2 class="font-display text-2xl">{t.whatsIncluded}</h2>
									<button
										class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition bg-transparent border-0 p-0 cursor-pointer"
										type="button"
										aria-label="Close right panel"
										onclick={() => (rightSidebarCollapsed = true)}
									>
										<i class="ri-close-line text-lg"></i>
									</button>
								</div>
								<div class="mt-7 space-y-6">
									<div>
										<h3 class="font-semibold">{currentLocale === 'id' ? 'Ringkasan pesanan' : 'Order summary'}</h3>
										<p class="mt-1 text-sm text-[var(--muted)]">8 items, {totalQty} total quantity</p>
									</div>
									<div>
										<h3 class="font-semibold">{currentLocale === 'id' ? 'Lini masa' : 'Timeline'}</h3>
										<p class="mt-1 text-sm text-[var(--muted)]">Production start and ETA</p>
									</div>
									<div>
										<h3 class="font-semibold">{currentLocale === 'id' ? 'Catatan' : 'Notes'}</h3>
										<p class="mt-1 text-sm text-[var(--muted)]">Special requests or next steps</p>
									</div>
								</div>

								<div class="mt-9 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] p-4 shadow-sm">
									<h3 class="font-display text-xl">{t.preview}</h3>
									<p class="mt-4 text-sm font-medium">{t.emailTo}: Mia Chen &lt;mia@driftwoodcollective.com&gt;</p>
									<p class="mt-1 text-sm">{t.emailSubject}: Update on your order #{orderId}</p>
									
									<!-- Real-time email preview text rendering instead of dummy bars -->
									<div class="mt-4 rounded border border-[var(--line)] bg-white p-3 text-xs font-sans whitespace-pre-wrap leading-relaxed shadow-inner max-h-[220px] overflow-auto">
										{customerUpdate}
									</div>
								</div>
							</aside>
						{/if}
					</section>
				{/if}
			</div>

			<!-- Conditionally render the footer only for Steps 2, 3, and 4. On Step 1 the actions are directly on the intake card -->
			{#if currentStep > 1}
				<footer class="action-footer">
					<div class="action-footer-inner">
						<div class="footer-status">
							<span class={`status-dot border-2 flex items-center justify-center rounded-full w-9 h-9 ${remainingAnswers && currentStep === 2 ? 'status-warn border-[var(--warning)] text-[var(--warning)]' : 'border-[var(--ready-ink)] text-[var(--ready-ink)]'}`}>
								{#if currentStep === 2 && remainingAnswers}
									<i class="ri-question-mark font-bold text-sm" aria-hidden="true"></i>
								{:else}
									<i class="ri-check-line font-bold text-base" aria-hidden="true"></i>
								{/if}
							</span>
							<div>
								<p class="font-semibold">
									{#if currentStep === 2}
										{remainingAnswers} {remainingAnswers === 1 ? 'answer' : 'answers'} remaining
									{:else if currentStep === 3}
										Ready to send to production
									{:else}
										{sent ? 'Marked as sent' : 'Ready to copy'}
									{/if}
								</p>
								{#if currentStep === 4}
									<p class="text-sm text-[var(--muted)]">No real email is sent by Artisan.</p>
								{/if}
							</div>
						</div>

						<div class="footer-actions">
							{#if currentStep > 1}
								<button class="secondary-button" type="button" onclick={previousStep}>
									{currentLocale === 'id' ? 'Sebelumnya' : 'Previous'}
								</button>
							{/if}
							{#if currentStep === 2}
								<div class="flex items-center gap-3">
									{#if remainingAnswers > 0}
										<span class="text-xs text-[var(--warning-ink)] bg-[var(--warning-bg)] border border-[var(--warning)] px-2 py-1 rounded">
											{currentLocale === 'id' ? 'Selesaikan pertanyaan untuk melanjutkan' : 'Resolve blockers to continue'}
										</span>
									{/if}
									<button class="primary-button flex items-center justify-center font-bold" type="button" disabled={!allAnswered} onclick={continueToSheets}>
										{currentLocale === 'id' ? 'Lanjutkan ke lembar kerja' : 'Continue to sheets'} <i class="ri-arrow-right-line ml-1" aria-hidden="true"></i>
									</button>
								</div>
							{:else}
								{#if currentStep === 3}
									<button class="primary-button flex items-center justify-center font-bold" type="button" onclick={() => setStep(4)}>
										{currentLocale === 'id' ? 'Lanjutkan ke pembaruan pelanggan' : 'Continue to customer update'} <i class="ri-arrow-right-line ml-1" aria-hidden="true"></i>
									</button>
								{:else}
									<button class="secondary-button flex items-center gap-1.5" type="button" onclick={copyCustomerUpdate}>
										<i class="ri-file-copy-line" aria-hidden="true"></i> {t.copyUpdate}
									</button>
									<button class="primary-button flex items-center gap-1.5 font-bold" type="button" onclick={markSent}>
										<i class="ri-send-plane-line" aria-hidden="true"></i> {t.markSent}
									</button>
								{/if}
							{/if}
						</div>
					</div>
				</footer>
			{/if}
		</section>
	</div>

	<!-- Original Order Drawer -->
	{#if showOriginalDrawer}
		<button
			class="drawer-backdrop"
			type="button"
			aria-label="Close drawer"
			onclick={() => (showOriginalDrawer = false)}
		></button>
		<div class="drawer">
			<div class="drawer-header">
				<h2 class="font-display text-2xl">{t.viewOriginal}</h2>
				<button class="icon-button font-bold" type="button" aria-label="Close drawer" onclick={() => (showOriginalDrawer = false)}>
					<i class="ri-close-line text-lg" aria-hidden="true"></i>
				</button>
			</div>
			<div class="drawer-content">
				<div class="rounded bg-[var(--surface-soft)] p-4 border border-[var(--line)] shadow-inner">
					<p class="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Pasted Source Content</p>
					<pre class="font-mono text-xs whitespace-pre-wrap leading-5 select-text">{intakeText}</pre>
				</div>
				<div class="mt-4 text-xs text-[var(--muted)]">
					Source Channel: {selectedSource} {uploadedFiles.length > 0 ? `(Files: ${uploadedFiles.join(', ')})` : ''}
				</div>
			</div>
		</div>
	{/if}

	{#if toast}
		<div class="fixed bottom-28 left-1/2 -translate-x-1/2 rounded-full bg-[var(--ink)] px-5 py-3 text-sm text-white shadow-xl animate-fade-in">
			{toast}
		</div>
	{/if}
</main>
