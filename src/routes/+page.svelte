<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { driver } from 'driver.js';
	import 'driver.js/dist/driver.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { localizeHref } from '$lib/paraglide/runtime';
	import type { Pathname } from '$app/types';
	import CustomerUpdateEditor from '$lib/components/artisan/CustomerUpdateEditor.svelte';
	import OriginalOrderDrawer from '$lib/components/artisan/OriginalOrderDrawer.svelte';
	import PackingChecklistTable from '$lib/components/artisan/PackingChecklistTable.svelte';
	import ProductionSheetTable from '$lib/components/artisan/ProductionSheetTable.svelte';
	import ReadyChecklist from '$lib/components/artisan/ReadyChecklist.svelte';
	import ReviewBlockerList from '$lib/components/artisan/ReviewBlockerList.svelte';
	import enMessages from '../../messages/en.json';
	import idMessages from '../../messages/id.json';

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

	type Locale = 'en' | 'id';
	type AppMessages = typeof enMessages;

	const storageKey = 'artisan-demo-flow-v3';
	const orderId = 'HB-250416';
	const client = 'Driftwood Collective';

	const messageCatalog: Record<Locale, AppMessages> = {
		en: enMessages,
		id: idMessages
	};
	const sourceTypes = ['sourceEmail', 'sourceDm', 'sourceSpreadsheet', 'sourcePoText'] as const;
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

	const samples: Record<(typeof sourceTypes)[number], string> = {
		sourceEmail: `From: Mia Chen <mia@driftwoodcollective.com>
Subject: Re: New pieces for Summer

Hi Heather,
Here's what we're hoping to get for our July drop.
PO#: DC-0725
Ship to: Driftwood Collective, 123 Ocean Ave, Santa Cruz, CA 95060

Item                   Qty   Finish             Notes
---------------------------------------------------------------
Horse Pin Medium       12    Silver             Please match last order
Mountain Pendant       6     Mother of Pearl    Can we get with longer chain?
Starburst Studs        24    Gold Vermeil       12 pr per card?`,

		sourceDm: `Mia Chen [Instagram DM 6/1 14:22]
Hey Heather! Do you have more wave cuffs in stock?
We'd love to order 4 of the Wave Cuff in Silver (6.5" if possible).
Also, we want to add 8 of the Bali Starburst (Large) studs in Silver. If you're out of stock, ok to sub similar.
Let me know if we can add these to our July PO!`,

		sourceSpreadsheet: `Item,Qty,Material/Finish,Notes
Cable Chain 18",10,Silver,Need by 7/10
Thin Stacking Ring,20,Silver,Size 7 & 8 mix
Horse Pin,6,Silver,Awaiting size resolution`,

		sourcePoText: `PURCHASE ORDER
DRIFTWOOD COLLECTIVE
PO Number: DC-0725
Date: June 27, 2026

Bill To: Driftwood Collective Account Payables
Ship To: Driftwood Collective, 123 Ocean Ave, Santa Cruz, CA 95060

Line  Item Code      Description                  Qty  Unit Price
-----------------------------------------------------------------
1     HB-HORSE-M     Horse Pin Medium             12   $32.00
2     HB-MTN-P       Mountain Pendant             6    $42.00
3     HB-WAVE-C      Wave Cuff                    4    $75.00
4     HB-SB-STUD     Starburst Studs (Gold)       24   $38.00
5     HB-TSR-2       Thin Stacking Ring           20   $12.00`
	};

	function detectSource(text: string): (typeof sourceTypes)[number] {
		const cleanText = text.trim();
		if (!cleanText) return 'sourcePoText';
		
		if (cleanText.includes('From:') || cleanText.includes('Subject:')) {
			return 'sourceEmail';
		}
		if (
			cleanText.toLowerCase().includes('dm') || 
			cleanText.toLowerCase().includes('instagram') || 
			cleanText.toLowerCase().includes('sent via') ||
			/\[.*\]/.test(cleanText)
		) {
			return 'sourceDm';
		}
		if (cleanText.includes(',') && (cleanText.toLowerCase().includes('item,qty') || cleanText.toLowerCase().includes('qty,material') || cleanText.toLowerCase().includes('item,qty,material'))) {
			return 'sourceSpreadsheet';
		}
		return 'sourcePoText';
	}

	function loadSampleType(source: (typeof sourceTypes)[number]) {
		selectedSource = source;
		intakeText = samples[source];
		uploadedFiles = [];
		sampleUsed = true;
		resetDemoState();
		showToast(t.sampleOrderLoaded);
	}

	function removeUploadedFile(index: number) {
		uploadedFiles = uploadedFiles.filter((_, i) => i !== index);
		if (uploadedFiles.length === 0) {
			intakeText = '';
		} else {
			intakeText = `[${t.filesSource}: ${uploadedFiles.join(', ')}]\n\n` + samples[selectedSource];
		}
		resetDemoState();
	}

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
	let selectedSource = $state<(typeof sourceTypes)[number]>('sourceEmail');
	let intakeText = $state(samples.sourceEmail);
	let blockers = $state<Blocker[]>(initialBlockers());
	let lineItems = $state<LineItem[]>(initialLineItems());
	let activeTab = $state<Tab>('production');
	let customerUpdate = $state(initialCustomerUpdate);
	let sheetDirty = $state(false);
	let lastSaved = $state('10:42 AM');
	let exportOpen = $state(false);
	let toast = $state('');
	let toastTimeout: number | undefined;
	let sent = $state(false);
	let contentPanel = $state<HTMLDivElement | undefined>();
	let sidebarCollapsed = $state(false);
	let mobileSidebarOpen = $state(false);
	let showWelcomeModal = $state(false);

	// New States
	let uploadedFiles = $state<string[]>([]);
	let showOriginalDrawer = $state(false);
	let productionGrouping = $state<'material' | 'category'>('material'); // Production group toggle
	let packedItems = $state<Record<string, boolean>>({}); // Checkbox state for Packing checklist
	let completedSteps = $state<number>(1);
	let rightSidebarCollapsed = $state(false);
	let activeIngestTab = $state<'paste' | 'upload'>('paste');
	let sampleUsed = $state(false);
	let processClicked = $state(false);
	let isDragging = $state(false);
	let readyItemsExpanded = $state(false);
	const step1_item1 = $derived(intakeText.trim().length > 0 || uploadedFiles.length > 0);
	const step1_item2 = $derived(sampleUsed);
	const step1_item3 = $derived(processClicked);

	const isIndonesian = $derived(page.url.pathname.startsWith('/id'));
	const currentLocale = $derived<Locale>(isIndonesian ? 'id' : 'en');
	const t = $derived(messageCatalog[currentLocale]);

	function formatMessage(template: string, values: Record<string, string | number>) {
		return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
	}

	function answerCountLabel(count: number) {
		return count === 1 ? t.oneAnswerRemaining : formatMessage(t.answersRemaining, { count });
	}

	function reviewCountLabel(count: number) {
		return formatMessage(t.reviewUnresolvedCount, { count });
	}

	function stepLabel(step: Step) {
		if (step === 1) return t.addOrder;
		if (step === 2) return t.reviewOrder;
		if (step === 3) return t.sheets;
		return t.customerUpdate;
	}

	function sourceLabel(source: (typeof sourceTypes)[number]) {
		return t[source];
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

	const maxStep = $derived(allAnswered ? Math.max(completedSteps, 3) as Step : completedSteps as Step);

	// Session Restoration
	if (browser) {
		const saved = sessionStorage.getItem(storageKey);
		if (saved) {
			try {
				const parsed = JSON.parse(saved) as any;
				currentStep = parsed.currentStep ?? 1;
				selectedSource = sourceTypes.includes(parsed.selectedSource)
					? parsed.selectedSource
					: 'sourceEmail';
				intakeText = parsed.intakeText ?? samples.sourceEmail;
				blockers = parsed.blockers ?? initialBlockers();
				lineItems = parsed.lineItems ?? initialLineItems();
				activeTab = parsed.activeTab ?? 'production';
				customerUpdate = parsed.customerUpdate ?? initialCustomerUpdate;
				sheetDirty = parsed.sheetDirty ?? false;
				lastSaved = parsed.lastSaved ?? '10:42 AM';
				sent = parsed.sent ?? false;
				uploadedFiles = parsed.uploadedFiles ?? [];
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
			if (option === 'Mini') return t.starburstMiniDetail;
			if (option === 'Small') return t.starburstSmallDetail;
			if (option === 'Large') return t.starburstLargeDetail;
		}
		if (blockerId === 'horse-pin-size') {
			if (option === 'Small') return t.horseSmallDetail;
			if (option === 'Medium') return t.horseMediumDetail;
			if (option === 'Large') return t.horseLargeDetail;
		}
		return '';
	}

	function showToast(message: string) {
		toast = message;
		if (!browser) return;
		if (toastTimeout) {
			window.clearTimeout(toastTimeout);
		}
		toastTimeout = window.setTimeout(() => {
			if (toast === message) toast = '';
		}, 3600);
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
		readyItemsExpanded = false;
	}

	function useSampleOrder() {
		intakeText = samples[selectedSource];
		uploadedFiles = [];
		sampleUsed = true;
		resetDemoState();
		showToast(t.sampleOrderLoaded);
	}

	function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const files = Array.from(target.files);
			uploadedFiles = [...uploadedFiles, ...files.map(f => f.name)];
			intakeText = `[${t.filesSource}: ${uploadedFiles.join(', ')}]\n\n` + samples[selectedSource];
			resetDemoState();
			showToast(`${files.length} ${t.fileUploaded}`);
		}
	}
	function handleFileDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
			const files = Array.from(event.dataTransfer.files);
			uploadedFiles = [...uploadedFiles, ...files.map(f => f.name)];
			intakeText = `[${t.filesSource}: ${uploadedFiles.join(', ')}]\n\n` + samples[selectedSource];
			resetDemoState();
			showToast(`${files.length} ${t.fileUploaded}`);
		}
	}
	function processOrder() {
		if (!intakeText.trim()) {
			intakeText = samples[selectedSource];
		}
		processClicked = true;
		resetDemoState();
		setStep(2);
	}

	function setStep(step: Step) {
		currentStep = step;
		if (step > completedSteps) {
			completedSteps = step;
		}
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
				starburst.notes = `${t.resolvedSize}: ${answer}`;
			}
		}
		if (blockerId === 'horse-pin-size') {
			const horse = lineItems.find((item) => item.id === 'horse-unclear');
			if (horse) {
				horse.item = `Horse Pin ${answer}`;
				horse.styleCode = `HB-HORSE-${answer.charAt(0).toUpperCase()}`;
				horse.notes = `${t.resolvedSize}: ${answer}`;
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

	const materialProductionGroups = $derived([
		{ name: t.silverProduction, items: silverProduction },
		{ name: t.goldProduction, items: goldProduction },
		{ name: t.otherMaterials, items: otherProduction }
	]);

	const categoryProductionGroups = $derived([
		{ name: t.pinsAndBrim, items: pinsProduction },
		{ name: t.traditionalJewelry, items: traditionalProduction },
		{ name: t.otherAccessories, items: otherCatProduction }
	]);

	function markDirty() {
		sheetDirty = true;
	}

	function updateLineItem(id: string, field: 'styleCode' | 'qty' | 'notes', value: string | number) {
		const item = lineItems.find((entry) => entry.id === id);
		if (!item) return;
		if (field === 'qty') {
			item.qty = Number(value) || 0;
		} else {
			item[field] = String(value);
		}
		markDirty();
	}

	function setPackedItem(id: string, checked: boolean) {
		packedItems = { ...packedItems, [id]: checked };
		markDirty();
	}

	function updateCustomerUpdate(value: string) {
		customerUpdate = value;
	}

	function saveChanges() {
		lastSaved = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
		sheetDirty = false;
		showToast(t.changesSaved);
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
						t.pendingResolution,
						reviewCountLabel(remainingAnswers),
						'',
						'',
						'',
						''
					]
				]
			: [];

		return [
			[t.item, t.styleCode, t.qty, t.materialFinish, t.technicalInstructions, t.sourceEvidence],
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
		const warningRows = remainingAnswers
			? [
					[
						t.pendingResolution,
						reviewCountLabel(remainingAnswers),
						'',
						''
					]
				]
			: [];

		return [
			[t.item, t.qty, t.packed, t.notes],
			...warningRows,
			...lineItems.map((item) => [
				item.item,
				item.qty,
				t.packagingSpecifics,
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
		showToast(kind === 'production' ? t.productionCsvDownloaded : t.packingCsvDownloaded);
	}

	async function copyTable() {
		const rows = activeTab === 'packing' ? packingRows() : productionRows();
		await navigator.clipboard.writeText(
			rows.map((row) => row.map((cell) => sanitizeExportCell(cell)).join('\t')).join('\n')
		);
		exportOpen = false;
		showToast(t.tableCopied);
	}

	async function copyCustomerUpdate() {
		await navigator.clipboard.writeText(customerUpdate);
		showToast(t.customerUpdateCopied);
	}

	function saveDraft() {
		lastSaved = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
		showToast(t.draftSaved);
	}

	function markSent() {
		sent = true;
		showToast(t.markedAsSentToast);
	}

	function waitForElement(selector: string, callback: () => void, attempts = 0) {
		if (!browser) return;
		if (document.querySelector(selector)) {
			callback();
		} else if (attempts < 50) {
			setTimeout(() => waitForElement(selector, callback, attempts + 1), 50);
		}
	}

	// Onboarding Tour logic
	function startTour() {
		// Reset page step and demo answers before tour starts
		setStep(1);
		resetDemoState();
		intakeText = samples.sourceEmail;
		selectedSource = 'sourceEmail';

		waitForElement('#intake-scratchpad', () => {
			const d = driver({
				showProgress: true,
				nextBtnText: t.tourNext,
				prevBtnText: t.tourBack,
				doneBtnText: t.tourDone,
				animate: true, // Animations enabled as viewport fits clean and scroll-free
				steps: [
					{ 
						element: '#sidebar-logo', 
						popover: { 
							title: t.tourWelcomeTitle,
							description: t.tourWelcomeDesc,
							side: 'right', 
							align: 'start' 
						} 
					},
					{ 
						element: '#intake-scratchpad', 
						popover: { 
							title: t.tourIntakeTitle,
							description: t.tourIntakeDesc,
							side: 'bottom' 
						} 
					},
					{ 
						element: '#try-sample-container', 
						popover: { 
							title: t.tourSampleTitle,
							description: t.tourSampleDesc,
							side: 'top' 
						} 
					},
					{ 
						element: '#process-order-btn', 
						popover: { 
							title: t.tourProcessTitle,
							description: t.tourProcessDesc,
							side: 'top',
							onNextClick: () => {
								processOrder();
								waitForElement('#blockers-section', () => {
									d.moveNext();
								});
							}
						} 
					},
					{
						element: '#blockers-section',
						popover: {
							title: t.tourReviewBlockersTitle,
							description: t.tourReviewBlockersDesc,
							side: 'top',
							onNextClick: () => {
								chooseAnswer('starburst-size', 'Large');
								chooseAnswer('horse-pin-size', 'Medium');
								setTimeout(() => {
									d.moveNext();
								}, 400);
							},
							onPrevClick: () => {
								setStep(1);
								resetDemoState();
								waitForElement('#process-order-btn', () => {
									d.movePrevious();
								});
							}
						}
					},
					{
						element: '#ready-checklist-section',
						popover: {
							title: t.tourReadyChecklistTitle,
							description: t.tourReadyChecklistDesc,
							side: 'top',
							onNextClick: () => {
								d.moveNext();
							},
							onPrevClick: () => {
								d.movePrevious();
							}
						}
					},
					{
						element: '#continue-to-sheets-btn',
						popover: {
							title: t.tourContinueToSheetsTitle,
							description: t.tourContinueToSheetsDesc,
							side: 'top',
							onNextClick: () => {
								continueToSheets();
								waitForElement('#sheets-tabs', () => {
									d.moveNext();
								});
							},
							onPrevClick: () => {
								d.movePrevious();
							}
						}
					},
					{
						element: '#sheets-tabs',
						popover: {
							title: t.tourSheetsTabsTitle,
							description: t.tourSheetsTabsDesc,
							side: 'bottom',
							onNextClick: () => {
								d.moveNext();
							},
							onPrevClick: () => {
								setStep(2);
								waitForElement('#continue-to-sheets-btn', () => {
									d.movePrevious();
								});
							}
						}
					},
					{
						element: '#export-dropdown-btn',
						popover: {
							title: t.tourExportTitle,
							description: t.tourExportDesc,
							side: 'bottom',
							onNextClick: () => {
								d.moveNext();
							},
							onPrevClick: () => {
								d.movePrevious();
							}
						}
					},
					{
						element: '#continue-to-update-btn',
						popover: {
							title: t.tourContinueToUpdateTitle,
							description: t.tourContinueToUpdateDesc,
							side: 'top',
							onNextClick: () => {
								setStep(4);
								waitForElement('#customer-update-editor', () => {
									d.moveNext();
								});
							},
							onPrevClick: () => {
								d.movePrevious();
							}
						}
					},
					{
						element: '#customer-update-editor',
						popover: {
							title: t.tourCustomerUpdateTitle,
							description: t.tourCustomerUpdateDesc,
							side: 'top',
							onNextClick: () => {
								d.moveNext();
							},
							onPrevClick: () => {
								setStep(3);
								waitForElement('#continue-to-update-btn', () => {
									d.movePrevious();
								});
							}
						}
					},
					{
						element: '#mark-sent-btn',
						popover: {
							title: t.tourMarkSentTitle,
							description: t.tourMarkSentDesc,
							side: 'top',
							onDoneClick: () => {
								markSent();
								d.destroy();
							},
							onPrevClick: () => {
								d.movePrevious();
							}
						}
					}
				]
			});
			d.drive();
		});
	}

	onMount(() => {
		// Launch welcome modal automatically on first load
		const onboarded = localStorage.getItem('artisan-onboarded-v3');
		if (!onboarded) {
			showWelcomeModal = true;
		}
	});

	function handleLetsGo() {
		showWelcomeModal = false;
		localStorage.setItem('artisan-onboarded-v3', 'true');
		setTimeout(() => {
			startTour();
		}, 300);
	}

	function closeWelcomeModal() {
		showWelcomeModal = false;
		localStorage.setItem('artisan-onboarded-v3', 'true');
	}

	// Packing Helpers
	function getPackagingSpecifics(styleCode: string): string {
		if (!styleCode) return t.standardPouch;
		if (styleCode.includes('STUD') || styleCode.includes('MINI') || styleCode.includes('SMALL') || styleCode.includes('LARGE')) {
			return t.earringCardPouch;
		}
		if (styleCode.includes('HORSE') || styleCode.includes('MTN')) {
			return t.premiumGiftBox;
		}
		if (styleCode.includes('WAVE')) {
			return t.velvetPouchGiftBox;
		}
		return t.standardJewelryPouch;
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
				aria-label={t.closeSidebar}
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
								aria-label={t.closeSidebar}
								onclick={toggleSidebar}
							>
								<i class="ri-sidebar-fold-line text-lg"></i>
							</button>
							<div class="absolute right-10 top-1/2 -translate-y-1/2 bg-[var(--surface-muted)] text-[var(--ink)] text-[10px] font-semibold px-2 py-1 rounded shadow border border-[var(--line)] whitespace-nowrap z-50 hidden group-hover:block">
								{t.closeSidebar}
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
							aria-label={t.openSidebar}
							onclick={toggleSidebar}
						>
							<i class="ri-sidebar-unfold-line text-lg"></i>
						</button>
							<div class="absolute left-12 top-1/2 -translate-y-1/2 ml-2 bg-[var(--surface-muted)] text-[var(--ink)] text-[10px] font-semibold px-2 py-1 rounded shadow border border-[var(--line)] whitespace-nowrap z-50 hidden group-hover:block">
								{t.openSidebar}
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
							<span class="sidebar-label">{t.catalog}</span>
						</span>
						<span class="sidebar-label rounded bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--muted)]">{t.later}</span>
					</button>
					{#if sidebarCollapsed}
						<div class="absolute left-14 top-1/2 -translate-y-1/2 ml-2 bg-[var(--surface-muted)] text-[var(--ink)] text-[10px] font-semibold px-2 py-1 rounded shadow border border-[var(--line)] whitespace-nowrap z-50 hidden group-hover:block">
							{t.catalog}
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

		</aside>

		<section class="app-main">
			<header class="app-header flex items-center justify-between px-6 py-3 border-b border-[var(--line)] bg-white">
				<div class="flex items-center gap-4">
					<button class="icon-button header-toggle" type="button" aria-label={t.toggleSidebar} onclick={toggleSidebar}>
						<i class="ri-menu-line text-lg" aria-hidden="true"></i>
					</button>
					<span class="text-xs text-[var(--muted)]">{t.lastSaved} {lastSaved}</span>
				</div>
				<div class="flex items-center gap-4">
					<!-- i18n Language Segment Control -->
					<div class="flex items-center gap-1 border border-[var(--line)] rounded bg-[var(--surface-soft)] p-0.5 text-xs shadow-sm">
						<i class="ri-translate-2 text-[var(--muted)] px-1 text-sm"></i>
						<a
							href={resolve(localizeHref(page.url.pathname, { locale: 'en' }) as Pathname)}
							class={`px-2 py-1 rounded font-semibold text-xs transition-all ${currentLocale === 'en' ? 'bg-[var(--brand)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
						>
							{t.english}
						</a>
						<a
							href={resolve(localizeHref(page.url.pathname, { locale: 'id' }) as Pathname)}
							class={`px-2 py-1 rounded font-semibold text-xs transition-all ${currentLocale === 'id' ? 'bg-[var(--brand)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
						>
							{t.indonesia}
						</a>
					</div>

					<!-- Right Sidebar Toggle Button -->
					<div class="relative group">
						<button
							class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition bg-transparent border-0 p-0 cursor-pointer"
							type="button"
							aria-label={rightSidebarCollapsed ? t.openRightPanel : t.closeRightPanel}
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
								? t.openRightPanel
								: t.closeRightPanel}
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
								{stepLabel(step.id)}
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
									<!-- Unified Intake Composer -->
									<div 
										class={`relative border rounded-lg p-1 min-h-[300px] transition-all duration-300 flex flex-col bg-[var(--surface-soft)] ${isDragging ? 'border-[var(--brand)] bg-[var(--brand)]/5 ring-4 ring-[var(--brand)]/10' : 'border-[var(--line)] bg-[var(--surface-soft)] focus-within:border-[var(--brand)] focus-within:bg-white'}`}
										role="region"
										aria-label="Unified order composer"
										ondragenter={(e) => { e.preventDefault(); isDragging = true; }}
										ondragover={(e) => { e.preventDefault(); isDragging = true; }}
										ondragleave={() => { isDragging = false; }}
										ondrop={handleFileDrop}
									>
										<!-- Drop Overlay -->
										{#if isDragging}
											<div class="absolute inset-0 bg-[var(--brand)]/10 flex flex-col items-center justify-center pointer-events-none rounded-lg z-20 border-2 border-dashed border-[var(--brand)]">
												<i class="ri-upload-cloud-2-line text-4xl text-[var(--brand)] animate-bounce"></i>
												<strong class="text-sm mt-2 text-[var(--brand-dark)]">Drop files anywhere to attach</strong>
											</div>
										{/if}

										<!-- Textarea -->
										<textarea
											id="intake-scratchpad"
											class="flex-1 w-full min-h-[220px] resize-none p-4 font-mono text-sm leading-6 outline-none bg-transparent border-0"
											placeholder="Paste purchase order details, email text, DM conversations, spreadsheet rows... or attach files below."
											bind:value={intakeText}
										></textarea>

										<!-- Bottom controls bar inside the box -->
										<div class="flex flex-wrap items-center justify-between border-t border-[var(--line)] p-3 bg-white/50 rounded-b-lg gap-2">
											<!-- File Attach controls and active file badges -->
											<div class="flex flex-wrap items-center gap-2">
												<!-- Attach Button -->
												<label class="relative cursor-pointer flex items-center justify-center w-8 h-8 rounded-full hover:bg-[var(--surface-muted)] text-[var(--muted)] hover:text-[var(--ink)] transition">
													<span class="sr-only">Attach files</span>
													<i class="ri-attachment-line text-lg"></i>
													<input 
														type="file" 
														class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
														multiple 
														onchange={handleFileUpload} 
													/>
												</label>

												<!-- File Badges -->
												{#if uploadedFiles.length > 0}
													<div class="flex flex-wrap gap-1.5 max-w-[400px]">
														{#each uploadedFiles as file, index (file + '-' + index)}
															<div class="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 font-medium">
																<i class="ri-file-text-line text-emerald-600"></i>
																<span class="max-w-[120px] truncate">{file}</span>
																<button 
																	type="button" 
																	class="hover:text-red-600 text-emerald-600 transition font-bold" 
																	aria-label="Remove attachment"
																	onclick={() => removeUploadedFile(index)}
																>
																	<i class="ri-close-line"></i>
																</button>
															</div>
														{/each}
													</div>
												{/if}
											</div>

											<!-- Character counter or simple note -->
											<span class="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)]">
												{uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) attached` : 'Text + files supported'}
											</span>
										</div>
									</div>

									<div class="mt-6 flex flex-wrap items-center justify-between gap-4">
										<div id="try-sample-container" class="text-xs text-[var(--muted)] flex flex-wrap items-center gap-2 font-medium">
											<span>{t.trySample}:</span>
											<button
												type="button"
												class="underline hover:text-[var(--brand)] transition cursor-pointer"
												onclick={() => loadSampleType('sourceEmail')}
											>
												{t.sourceEmail}
											</button>
											<span class="opacity-50">·</span>
											<button
												type="button"
												class="underline hover:text-[var(--brand)] transition cursor-pointer"
												onclick={() => loadSampleType('sourceDm')}
											>
												{t.sourceDm}
											</button>
											<span class="opacity-50">·</span>
											<button
												type="button"
												class="underline hover:text-[var(--brand)] transition cursor-pointer"
												onclick={() => loadSampleType('sourceSpreadsheet')}
											>
												{t.sourceSpreadsheet}
											</button>
											<span class="opacity-50">·</span>
											<button
												type="button"
												class="underline hover:text-[var(--brand)] transition cursor-pointer"
												onclick={() => loadSampleType('sourcePoText')}
											>
												{t.sourcePoText}
											</button>
										</div>
										<button id="process-order-btn" class="primary-button flex items-center justify-center font-bold" type="button" onclick={processOrder}>
											{t.processOrder} <i class="ri-arrow-right-line ml-1" aria-hidden="true"></i>
										</button>
									</div>
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
									<h2 class="font-display text-2xl">{t.whatHappensNext}</h2>
									<button
										class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition bg-transparent border-0 p-0 cursor-pointer"
										type="button"
										aria-label={t.closeRightPanel}
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
											<h3 class={step1_item2 ? 'text-[var(--ink)] font-semibold' : 'text-sm font-semibold'}>{t.reviewSampleTitle}</h3>
											<p class="text-xs text-[var(--muted)] mt-1">
												{t.reviewSampleDesc}
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
											<h3 class={step1_item3 ? 'text-[var(--ink)] font-semibold' : 'text-sm font-semibold'}>{t.startProcessingTitle}</h3>
											<p class="text-xs text-[var(--muted)] mt-1">
												{t.startProcessingDesc}
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
												{reviewCountLabel(remainingAnswers)}
											{:else}
												{t.allResolved}
											{/if}
										</p>
										<p class="mt-4 text-sm text-[var(--muted)]">
											{t.sourceEvidence}: {uploadedFiles.length > 0 ? `${t.uploaded} ${uploadedFiles.join(', ')}` : t.pastedText}
										</p>
									</div>

									<div class="page-actions">
										<button class="ghost-button" type="button" onclick={() => showToast(t.progressSaved)}>
											{t.saveProgress}
										</button>
										<button class="secondary-button" type="button" onclick={() => (showOriginalDrawer = true)}>{t.viewOriginal}</button>
									</div>
								</div>

								<div id="blockers-section">
									<ReviewBlockerList
										{blockers}
										{remainingAnswers}
										{t}
										{getOptionDetail}
										onAnswer={chooseAnswer}
									/>
								</div>

								<div id="ready-checklist-section">
									<ReadyChecklist
										items={readyItems}
										expanded={readyItemsExpanded}
										summary={formatMessage(t.readySummary, { count: readyItems.length })}
										{t}
										onToggle={(expanded) => (readyItemsExpanded = expanded)}
									/>
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
										aria-label={t.closeRightPanel}
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
															? t.draftIncludesNotes
															: t.readyAfterReview
														: doc === t.productionSheet
															? formatMessage(t.blockedByAnswers, { count: remainingAnswers })
															: t.blockedByProductionSheet}
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
										<button id="export-dropdown-btn" class="secondary-button flex items-center" type="button" onclick={() => (exportOpen = !exportOpen)}>
											{t.exportBtn} <i class="ri-arrow-down-s-line ml-1" aria-hidden="true"></i>
										</button>
										{#if exportOpen}
											<div class="absolute right-0 z-10 mt-2 w-56 rounded-md border border-[var(--line)] bg-white p-2 shadow-xl animate-fade-in">
												<button class="menu-item font-sans text-sm" type="button" onclick={() => downloadCsv('production')}>
													{t.downloadProductionCsv}
												</button>
												<button class="menu-item font-sans text-sm" type="button" onclick={() => downloadCsv('packing')}>
													{t.downloadPackingCsv}
												</button>
												<button class="menu-item font-sans text-sm" type="button" onclick={copyTable}>{t.copyTable}</button>
											</div>
										{/if}
									</div>
								</div>
							</div>

							<div class="sheet-stats">
								<div>
									<span>{t.lineItems}</span>
									<strong>{lineItems.length}</strong>
								</div>
								<div>
									<span>{t.totalQuantity}</span>
									<strong>{totalQty}</strong>
								</div>
								<div>
									<span>{t.finishes}</span>
									<strong>{finishSummary}</strong>
								</div>
								<div>
									<span>{t.unresolved}</span>
									<strong>{remainingAnswers}</strong>
								</div>
							</div>

							<div id="sheets-tabs" class="mt-9 flex gap-8 border-b border-[var(--line)]">
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
										<ProductionSheetTable
											{t}
											{orderId}
											{client}
											grouping={productionGrouping}
											materialGroups={materialProductionGroups}
											categoryGroups={categoryProductionGroups}
											{catalog}
											onGroupingChange={(grouping) => (productionGrouping = grouping)}
											onUpdateItem={updateLineItem}
										/>
									{:else if activeTab === 'packing'}
										<PackingChecklistTable
											{t}
											{orderId}
											{client}
											{lineItems}
											{packedItems}
											{getPackagingSpecifics}
											{isBackordered}
											onTogglePacked={setPackedItem}
										/>
									{:else}
										<h2 class="font-display text-2xl">{t.customerUpdateDraft}</h2>
										<p class="mt-1 text-sm text-[var(--muted)]">{t.editDraftDirectly}</p>
										<CustomerUpdateEditor
											label={t.message}
											value={customerUpdate}
											onInput={updateCustomerUpdate}
											textareaClass="mt-5 h-[420px] w-full resize-none rounded-md border border-[var(--line)] bg-[var(--surface-soft)] p-4 leading-7 outline-none focus:border-[var(--brand)] focus:bg-white"
										/>
									{/if}
								</div>

								{#if !rightSidebarCollapsed}
									<aside class="output-side shadow-sm">
										<div class="flex items-center justify-between gap-4 mb-2">
											<h2 class="font-display text-2xl">{t.readyNext}</h2>
											<button
												class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition bg-transparent border-0 p-0 cursor-pointer"
												type="button"
												aria-label={t.closeRightPanel}
												onclick={() => (rightSidebarCollapsed = true)}
											>
												<i class="ri-close-line text-lg"></i>
											</button>
										</div>
										<p class="text-sm text-[var(--muted)]">
											{t.documentsUseEdits}
										</p>
										<div class="mt-5 space-y-4">
											<button class="side-action transition flex items-center justify-between gap-3" type="button" onclick={() => downloadCsv('production')}>
												<div>
													<strong>{t.downloadProductionSheet}</strong>
													<span class="block text-xs text-[var(--muted)] mt-1">{t.csvFormat}</span>
												</div>
												<i class="ri-download-2-line text-xl text-[var(--brand)]" aria-hidden="true"></i>
											</button>
											<button class="side-action transition flex items-center justify-between gap-3" type="button" onclick={() => downloadCsv('packing')}>
												<div>
													<strong>{t.downloadPackingChecklist}</strong>
													<span class="block text-xs text-[var(--muted)] mt-1">{t.csvFormat}</span>
												</div>
												<i class="ri-download-2-line text-xl text-[var(--brand)]" aria-hidden="true"></i>
											</button>
											<button class="side-action transition flex items-center justify-between gap-3" type="button" onclick={copyCustomerUpdate}>
												<div>
													<strong>{t.copyUpdate}</strong>
													<span class="block text-xs text-[var(--muted)] mt-1">{t.plainText}</span>
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
					<section class="px-4 py-6 md:px-10 md:py-9">
						<div>
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
									</div>
								</div>

								<div id="customer-update-editor" class="mt-8">
									<CustomerUpdateEditor
										label={t.message}
										value={customerUpdate}
										onInput={updateCustomerUpdate}
										labelClass="text-sm font-semibold text-[var(--muted)]"
									/>
								</div>
							</div>
						</div>
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
										{answerCountLabel(remainingAnswers)}
									{:else if currentStep === 3}
										{t.readyToProduction}
									{:else}
										{sent ? t.markedAsSent : t.readyToCopy}
									{/if}
								</p>
								{#if currentStep === 4}
									<p class="text-sm text-[var(--muted)]">{t.noRealEmail}</p>
								{/if}
							</div>
						</div>

						<div class="footer-actions">
							{#if currentStep > 1}
								<button class="secondary-button" type="button" onclick={previousStep}>
									{t.previous}
								</button>
							{/if}
							{#if currentStep === 2}
								<div class="flex items-center gap-3">
									{#if remainingAnswers > 0}
										<span class="text-xs text-[var(--warning-ink)] bg-[var(--warning-bg)] border border-[var(--warning)] px-2 py-1 rounded">
											{t.resolveToContinue}
										</span>
									{/if}
									<button id="continue-to-sheets-btn" class="primary-button flex items-center justify-center font-bold" type="button" disabled={!allAnswered} onclick={continueToSheets}>
										{t.continueToSheets} <i class="ri-arrow-right-line ml-1" aria-hidden="true"></i>
									</button>
								</div>
							{:else}
								{#if currentStep === 3}
									<button id="continue-to-update-btn" class="primary-button flex items-center justify-center font-bold" type="button" onclick={() => setStep(4)}>
										{t.continueToCustomerUpdate} <i class="ri-arrow-right-line ml-1" aria-hidden="true"></i>
									</button>
								{:else}
									<button class="secondary-button flex items-center justify-center gap-1.5" type="button" onclick={copyCustomerUpdate}>
										<i class="ri-file-copy-line" aria-hidden="true"></i> {t.copyUpdate}
									</button>
									<button id="mark-sent-btn" class="primary-button flex items-center justify-center gap-1.5 font-bold" type="button" onclick={markSent}>
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

	{#if showOriginalDrawer}
		<OriginalOrderDrawer
			{t}
			{intakeText}
			sourceDetail={`${t.sourceChannel}: ${sourceLabel(selectedSource)} ${uploadedFiles.length > 0 ? `(${t.uploaded}: ${uploadedFiles.join(', ')})` : ''}`}
			onClose={() => (showOriginalDrawer = false)}
		/>
	{/if}

	{#if toast}
		<div class="fixed bottom-28 left-1/2 -translate-x-1/2 rounded-full bg-[var(--ink)] px-5 py-3 text-sm text-white shadow-xl animate-fade-in" aria-live="polite">
			{toast}
		</div>
	{/if}
	{#if showWelcomeModal}
		<div transition:fade={{ duration: 200 }} class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
			<!-- Modal Container -->
			<div transition:scale={{ duration: 250, start: 0.95 }} class="relative bg-white rounded-lg border border-[var(--line)] shadow-2xl max-w-lg w-full mx-4 overflow-hidden flex flex-col max-h-[90vh]">
				<!-- Top Close button -->
				<button 
					type="button" 
					class="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition border-0 cursor-pointer p-0"
					aria-label={t.closeDrawer}
					onclick={closeWelcomeModal}
				>
					<i class="ri-close-line text-xl"></i>
				</button>

				<!-- Modal Content -->
				<div class="p-6 md:p-8 overflow-y-auto">
					<!-- Header Section (Side-by-Side) -->
					<div class="flex items-start gap-4 mb-6">
						<!-- Icon Box -->
						<div class="flex items-center justify-center w-14 h-14 rounded-xl bg-[var(--surface-soft)] text-[var(--brand)] shadow-sm border border-[var(--line)] shrink-0">
							<i class="ri-sparkling-2-line text-2xl"></i>
						</div>
						
						<!-- Header Text -->
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1.5 text-[10px] text-[var(--muted)] font-semibold">
								<span class="px-2 py-0.5 rounded bg-[var(--brand)]/10 text-[var(--brand)] font-semibold tracking-wide">
									What's new
								</span>
								<span>
									{t.welcomeSubtitle}
								</span>
							</div>
							<h2 class="font-display text-xl md:text-2xl tracking-tight text-[var(--ink)] leading-snug">
								{t.welcomeHeading}
							</h2>
						</div>
					</div>

					<p class="text-sm text-[var(--muted)] leading-relaxed">
						{t.welcomeSubheading}
					</p>

					<!-- Features list -->
					<ul class="mt-6 space-y-4">
						<li class="flex gap-3.5 items-start text-[13px] leading-relaxed text-[var(--ink)]">
							<span class="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
								<i class="ri-check-line text-xs font-bold"></i>
							</span>
							<div>
								<strong class="font-semibold text-[var(--brand-dark)]">{t.welcomeLabel1}</strong> · {t.welcomeFeature1}
							</div>
						</li>
						<li class="flex gap-3.5 items-start text-[13px] leading-relaxed text-[var(--ink)]">
							<span class="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
								<i class="ri-check-line text-xs font-bold"></i>
							</span>
							<div>
								<strong class="font-semibold text-[var(--brand-dark)]">{t.welcomeLabel2}</strong> · {t.welcomeFeature2}
							</div>
						</li>
						<li class="flex gap-3.5 items-start text-[13px] leading-relaxed text-[var(--ink)]">
							<span class="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
								<i class="ri-check-line text-xs font-bold"></i>
							</span>
							<div>
								<strong class="font-semibold text-[var(--brand-dark)]">{t.welcomeLabel3}</strong> · {t.welcomeFeature3}
							</div>
						</li>
						<li class="flex gap-3.5 items-start text-[13px] leading-relaxed text-[var(--ink)]">
							<span class="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
								<i class="ri-check-line text-xs font-bold"></i>
							</span>
							<div>
								<strong class="font-semibold text-[var(--brand-dark)]">{t.welcomeLabel4}</strong> · {t.welcomeFeature4}
							</div>
						</li>
					</ul>
				</div>

				<!-- Modal Footer -->
				<div class="border-t border-[var(--line)] bg-[var(--surface-soft)] p-4 flex items-center justify-between gap-3 shrink-0">
					<button 
						type="button" 
						class="text-xs text-[var(--muted)] hover:text-[var(--ink)] font-semibold transition cursor-pointer px-4 py-2.5 rounded hover:bg-[var(--surface-muted)] bg-transparent border-0"
						onclick={closeWelcomeModal}
					>
						{t.skipGuide}
					</button>
					<button 
						type="button" 
						class="bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-xs font-bold py-2.5 px-6 rounded shadow transition duration-150 flex items-center gap-1.5 cursor-pointer border-0"
						onclick={handleLetsGo}
					>
						{t.letsGo} <i class="ri-arrow-right-line"></i>
					</button>
				</div>
			</div>
		</div>
	{/if}
</main>
