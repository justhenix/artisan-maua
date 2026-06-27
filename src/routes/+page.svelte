<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { driver } from 'driver.js';
	import 'driver.js/dist/driver.css';

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
	let uploadedFile = $state<string>('');
	let showOriginalDrawer = $state(false);
	let silverSpotRate = $state(1.05); // Global silver spot price slider
	let productionGrouping = $state<'material' | 'category'>('material'); // Production group toggle
	let packedItems = $state<Record<string, boolean>>({}); // Checkbox state for Packing checklist
	let completedSteps = $state<number>(1);

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

	// Dynamic Blocker & Ready Tracking
	const remainingAnswers = $derived(blockers.filter((blocker) => !blocker.answer).length);
	const allAnswered = $derived(remainingAnswers === 0);

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
				uploadedFile = parsed.uploadedFile ?? '';
				silverSpotRate = parsed.silverSpotRate ?? 1.05;
				productionGrouping = parsed.productionGrouping ?? 'material';
				packedItems = parsed.packedItems ?? {};
				completedSteps = parsed.completedSteps ?? 1;
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
				uploadedFile,
				silverSpotRate,
				productionGrouping,
				packedItems,
				completedSteps
			})
		);
	});

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
		uploadedFile = '';
		resetDemoState();
		showToast('Sample order loaded.');
	}

	function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const file = target.files[0];
			uploadedFile = file.name;
			intakeText = `[File Source: ${file.name}]\n\n` + sampleOrder;
			resetDemoState();
			showToast(`Uploaded ${file.name}. Click Process to begin.`);
		}
	}

	function processOrder() {
		if (!intakeText.trim()) {
			intakeText = sampleOrder;
		}
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
			animate: false, // Disables animations to prevent lag/offset in scrollable viewports
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
				<div class="sidebar-title">
					<p class="font-display text-2xl leading-tight">Artisan</p>
					<p class="text-sm text-[var(--muted)]">Order-to-Production Assistant</p>
				</div>
			</div>

			<nav class="mt-10 space-y-2 flex-1">
				<button
					class="flex w-full items-center gap-3 rounded-md bg-[var(--nav-active)] px-4 py-3 text-left font-semibold"
					type="button"
				>
					<i class="ri-file-list-3-line text-lg" aria-hidden="true"></i>
					<span class="sidebar-label">Orders</span>
				</button>
				<button
					class="flex w-full items-center justify-between rounded-md px-4 py-3 text-left text-[var(--ink)]"
					type="button"
				>
					<span class="flex items-center gap-3">
						<i class="ri-book-open-line text-lg" aria-hidden="true"></i>
						<span class="sidebar-label">Catalog</span>
					</span>
					<span class="sidebar-label rounded bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--muted)]">Later</span>
				</button>

				<button
					id="replay-tour-btn"
					class="flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-[var(--ink)] hover:bg-[var(--surface-soft)] transition"
					type="button"
					onclick={startTour}
				>
					<i class="ri-question-line text-lg" aria-hidden="true"></i>
					<span class="sidebar-label">Replay Tour</span>
				</button>
			</nav>

			{#if !sidebarCollapsed}
				<div class="mt-auto border-t border-[var(--line)] pt-6 space-y-4" id="silver-auditor">
					<div class="rounded-md bg-[var(--surface-soft)] p-4 border border-[var(--line)] shadow-sm">
						<h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Silver Spot Auditor</h3>
						<div class="mt-3 flex items-center justify-between">
							<span class="text-sm text-[var(--ink)] font-medium">Silver Spot Rate:</span>
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
			<header class="app-header">
				<button class="icon-button" type="button" aria-label="Toggle sidebar" onclick={toggleSidebar}>
					<i class="ri-menu-line text-lg" aria-hidden="true"></i>
				</button>
				<span>Last saved {lastSaved}</span>
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
							<span class="step-label">{step.id > maxStep ? '' : step.label}</span>
						</button>
						{#if index < steps.length - 1}
							<div class="hidden h-px flex-1 bg-[var(--line)] md:block"></div>
						{/if}
					{/each}
				</div>
			</div>

			<div class="min-h-0 overflow-auto" bind:this={contentPanel}>
				{#if currentStep === 1}
					<section class="grid min-h-full xl:grid-cols-[1fr_368px]">
						<div class="px-4 py-6 md:px-10 md:py-10">
							<div class="mx-auto max-w-4xl">
								<h1 class="font-display text-4xl leading-tight md:text-5xl">Add messy order</h1>
								<p class="mt-4 max-w-3xl text-lg leading-8">
									Paste a purchase order, email, DM, copied spreadsheet rows, or PDF text.
									Artisan finds line items and flags unclear production details.
								</p>

								<div class="mt-8 rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
									<div class="flex flex-wrap gap-2">
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

									<label class="mt-4 block">
										<span class="sr-only">Paste messy order text</span>
										<textarea
											id="intake-scratchpad"
											class="h-[260px] w-full resize-none rounded-md border border-[var(--line)] bg-[var(--surface-soft)] p-4 font-mono text-sm leading-6 outline-none transition focus:border-[var(--brand)] focus:bg-white"
											bind:value={intakeText}
										></textarea>
									</label>

									<div class="mt-4 flex flex-wrap items-center justify-between gap-4">
										<label
											class="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-[var(--line)] px-5 py-3 text-sm text-[var(--muted)] hover:border-[var(--brand)] transition"
										>
											<input class="sr-only" type="file" onchange={handleFileUpload} />
											<i class="ri-upload-2-line text-xl" aria-hidden="true"></i>
											<span>
												<strong class="block text-[var(--ink)]">Upload file instead</strong>
												PDF, CSV, XLSX, PNG, JPG, TXT
											</span>
										</label>

										<button id="try-sample-btn" class="secondary-button" type="button" onclick={useSampleOrder}>
											Try sample order
										</button>
									</div>
								</div>

								<p class="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]">
									<i class="ri-shield-check-line text-base text-[var(--brand)] animate-pulse" aria-hidden="true"></i>
									Use fictional or redacted data only.
								</p>
							</div>
						</div>

						<aside class="border-l border-[var(--line)] bg-white px-8 py-10">
							<h2 class="font-display text-2xl">What happens next</h2>
							<div class="mt-7 space-y-5">
								<div class="next-card">
									<span>1</span>
									<div>
										<h3>Extract line items</h3>
										<p>Products, quantities, finishes, and notes are pulled from messy input.</p>
									</div>
								</div>
								<div class="next-card">
									<span>2</span>
									<div>
										<h3>Answer unclear details</h3>
										<p>Questions appear only when production details are unclear.</p>
									</div>
								</div>
								<div class="next-card">
									<span>3</span>
									<div>
										<h3>Create sheets</h3>
										<p>Production sheet, packing checklist, and customer update become ready.</p>
									</div>
								</div>
							</div>
						</aside>
					</section>
				{:else if currentStep === 2}
					<section class="grid min-h-full xl:grid-cols-[1fr_352px]">
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
										<h1 class="mt-5 font-display text-4xl leading-tight md:text-5xl">Review order</h1>
										<p class="mt-3 text-lg">Artisan found 8 items</p>
										<p class="mt-1">
											{#if remainingAnswers > 0}
												{remainingAnswers} production {remainingAnswers === 1 ? 'detail needs' : 'details need'}
												answers before sheets can be created.
											{:else}
												All production details have been resolved. You are ready to view sheets.
											{/if}
										</p>
										<p class="mt-4 text-sm text-[var(--muted)]">Source: {uploadedFile ? `Uploaded ${uploadedFile}` : 'Pasted text'}</p>
									</div>

									<div class="page-actions">
										<button class="ghost-button" type="button" onclick={() => showToast('Progress saved.')}>
											Save progress
										</button>
										<button class="secondary-button" type="button" onclick={() => (showOriginalDrawer = true)}>View original order</button>
									</div>
								</div>

								<!-- Outdated spot auditor alert banner -->
								{#if pricingWarnings.length > 0}
									<div class="mt-6 rounded-md border border-[var(--warning)] bg-[var(--warning-bg)] p-4 text-sm text-[var(--warning-ink)] leading-relaxed shadow-sm flex items-start gap-2.5">
										<i class="ri-error-warning-line text-lg text-[var(--warning)] shrink-0 mt-0.5" aria-hidden="true"></i>
										<div>
											<strong>Outdated Pricing Flagged:</strong> {pricingWarnings.length} {pricingWarnings.length === 1 ? 'item is' : 'items are'} attempting to order at outdated historical rates. Live calculations based on current spot rate of <strong>${silverSpotRate.toFixed(2)}/g</strong> exceed the PO prices. Bali team might reject or lose margin.
										</div>
									</div>
								{/if}

								<h2 class="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
									Needs your answer ({remainingAnswers})
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
														Source evidence: “{blocker.evidence}” · {blocker.source}
													</p>
												</div>
												<div class="flex flex-wrap gap-3">
													{#each blocker.options as option (option)}
														<button
															class={`choice-button transition ${blocker.answer === option ? 'choice-button-active' : ''}`}
															type="button"
															onclick={() => chooseAnswer(blocker.id, option)}
														>
															{option}
														</button>
													{/each}
												</div>
											</div>
											<details class="border-t border-[var(--line)] px-4 py-3 text-sm">
												<summary class="cursor-pointer font-medium">Production risk</summary>
												<p class="mt-2 text-[var(--muted)]">{blocker.risk}</p>
											</details>
										</article>
									{/each}
								</div>

								<h2 class="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
									Looks ready ({readyItems.length})
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

						<aside class="side-panel">
							<h2 class="font-display text-2xl">Your documents</h2>
							<p class="mt-2 text-[var(--muted)]">
								{allAnswered ? 'Ready for review.' : 'Locked until the questions are answered.'}
							</p>
							<div class="mt-6 space-y-4">
								{#each ['Production Sheet', 'Packing Checklist', 'Customer Update'] as doc (doc)}
									<div class="document-card document-card-compact shadow-sm">
										<div>
											<h3>{doc}</h3>
											<p>
												{allAnswered
													? doc === 'Customer Update'
														? 'Draft includes notes'
														: 'Ready after review'
													: doc === 'Production Sheet'
														? `Blocked by ${remainingAnswers} answers`
														: 'Blocked by production sheet'}
											</p>
										</div>
										<span aria-hidden="true" class="text-lg text-[var(--brand)]">
											{#if allAnswered}
												<i class="ri-checkbox-circle-line" aria-hidden="true"></i>
											{:else}
												<i class="ri-lock-line" aria-hidden="true"></i>
											{/if}
										</span>
									</div>
								{/each}
							</div>
							<div class="mt-6 rounded-md border border-[var(--info-line)] bg-[var(--info)] p-4 text-sm leading-relaxed text-blue-900 flex gap-2">
								<i class="ri-information-line text-lg text-blue-600 shrink-0" aria-hidden="true"></i>
								<span>You can view the original order anytime while reviewing details.</span>
							</div>
						</aside>
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
									<h1 class="mt-5 font-display text-4xl leading-tight md:text-5xl">Sheets</h1>
									<p class="mt-3">
										Clean production and packing documents generated from messy order input.
									</p>
									<p class="mt-5 inline-flex items-center gap-1.5 rounded-md border border-[var(--ready)] bg-[var(--ready-bg)] px-3 py-2 text-sm text-[var(--ready-ink)] font-semibold">
										<i class="ri-checkbox-circle-line text-base" aria-hidden="true"></i>
										All required answers complete.
									</p>
								</div>

								<div class="page-actions">
									<button class="secondary-button" type="button" disabled={!sheetDirty} onclick={saveChanges}>
										Save changes
									</button>
									<div class="relative">
										<button class="secondary-button flex items-center" type="button" onclick={() => (exportOpen = !exportOpen)}>
											Export <i class="ri-arrow-down-s-line ml-1" aria-hidden="true"></i>
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
									['production', 'Production sheet'],
									['packing', 'Packing checklist'],
									['customer', 'Customer update']
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

							<div class="output-grid">
								<div class="output-card shadow-sm">
									{#if activeTab === 'production'}
										<div class="mb-5 flex flex-wrap items-center justify-between gap-4">
											<div>
												<h2 class="font-display text-2xl">Production sheet</h2>
												<p class="mt-1 text-sm text-[var(--muted)]">
													Heather Benjamin Jewelry · Order {orderId} · {client}
												</p>
											</div>
											<!-- Grouping Mode Selector -->
											<div class="flex items-center gap-2 border border-[var(--line)] rounded bg-[var(--surface-soft)] p-1 text-xs">
												<span class="px-2 text-[var(--muted)] font-medium">Group by:</span>
												<button
													class={`px-2 py-1 rounded transition font-semibold ${productionGrouping === 'material' ? 'bg-white shadow-sm border border-[var(--line)] text-[var(--brand-dark)]' : 'text-[var(--muted)]'}`}
													type="button"
													onclick={() => (productionGrouping = 'material')}
												>
													Material Finish
												</button>
												<button
													class={`px-2 py-1 rounded transition font-semibold ${productionGrouping === 'category' ? 'bg-white shadow-sm border border-[var(--line)] text-[var(--brand-dark)]' : 'text-[var(--muted)]'}`}
													type="button"
													onclick={() => (productionGrouping = 'category')}
												>
													Style Category
												</button>
											</div>
										</div>

										<div class="space-y-8">
											{#if productionGrouping === 'material'}
												<!-- GROUP BY MATERIAL -->
												{#each [
													{ name: 'Silver Production (Perak Murni)', items: silverProduction },
													{ name: 'Gold Vermeil Production (Lapisan Emas)', items: goldProduction },
													{ name: 'Other Materials Production', items: otherProduction }
												] as group}
													{#if group.items.length > 0}
														<div class="border border-[var(--line)] rounded-md overflow-hidden bg-white shadow-sm">
															<div class="bg-[var(--surface-muted)] px-4 py-2 border-b border-[var(--line)]">
																<h3 class="text-sm font-bold uppercase tracking-wider text-[var(--brand-dark)]">{group.name}</h3>
															</div>
															<table class="w-full text-left text-sm">
																<thead class="bg-[var(--surface-soft)] border-b border-[var(--line)]">
																	<tr>
																		<th class="w-24 px-3 py-2 text-xs font-bold text-[var(--muted)]">Style code</th>
																		<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">Item description</th>
																		<th class="w-16 px-3 py-2 text-xs font-bold text-[var(--muted)]">Qty</th>
																		<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">Technical Instructions (EN/ID)</th>
																		<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">Order Notes</th>
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
													{ name: 'Pins & Brim Pinches', items: pinsProduction },
													{ name: 'Traditional Jewelry', items: traditionalProduction },
													{ name: 'Other Accessories', items: otherCatProduction }
												] as group}
													{#if group.items.length > 0}
														<div class="border border-[var(--line)] rounded-md overflow-hidden bg-white shadow-sm">
															<div class="bg-[var(--surface-muted)] px-4 py-2 border-b border-[var(--line)]">
																<h3 class="text-sm font-bold uppercase tracking-wider text-[var(--brand-dark)]">{group.name}</h3>
															</div>
															<table class="w-full text-left text-sm">
																<thead class="bg-[var(--surface-soft)] border-b border-[var(--line)]">
																	<tr>
																		<th class="w-24 px-3 py-2 text-xs font-bold text-[var(--muted)]">Style code</th>
																		<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">Item description</th>
																		<th class="w-16 px-3 py-2 text-xs font-bold text-[var(--muted)]">Qty</th>
																		<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">Technical Instructions (EN/ID)</th>
																		<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">Order Notes</th>
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
											<h2 class="font-display text-2xl">Packing checklist</h2>
											<p class="mt-1 text-sm text-[var(--muted)]">
												Bali Fulfillment & Packing Check · Order {orderId} · {client}
											</p>
										</div>
										<div class="mt-5 overflow-hidden rounded-md border border-[var(--line)] bg-white shadow-sm">
											<table class="w-full text-left text-sm">
												<thead class="bg-[var(--surface-soft)] border-b border-[var(--line)]">
													<tr>
														<th class="w-12 px-3 py-3 text-center text-xs font-bold text-[var(--muted)]">Packed</th>
														<th class="px-3 py-3 text-xs font-bold text-[var(--muted)]">Item</th>
														<th class="w-20 px-3 py-3 text-center text-xs font-bold text-[var(--muted)]">Qty</th>
														<th class="px-3 py-3 text-xs font-bold text-[var(--muted)]">Packaging Specifics</th>
														<th class="px-3 py-3 text-xs font-bold text-[var(--muted)]">Fulfillment Flags</th>
														<th class="px-3 py-3 text-xs font-bold text-[var(--muted)]">Order Notes</th>
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

								<aside class="output-side shadow-sm">
									<h2 class="font-display text-2xl">Ready next</h2>
									<p class="mt-2 text-sm text-[var(--muted)]">
										Documents use current in-app edits.
									</p>
									<div class="mt-5 space-y-4">
										<button class="side-action transition flex items-center justify-between gap-3" type="button" onclick={() => downloadCsv('production')}>
											<div>
												<strong>Download production sheet</strong>
												<span class="block text-xs text-[var(--muted)] mt-1">CSV format</span>
											</div>
											<i class="ri-download-2-line text-xl text-[var(--brand)]" aria-hidden="true"></i>
										</button>
										<button class="side-action transition flex items-center justify-between gap-3" type="button" onclick={() => downloadCsv('packing')}>
											<div>
												<strong>Download packing checklist</strong>
												<span class="block text-xs text-[var(--muted)] mt-1">CSV format</span>
											</div>
											<i class="ri-download-2-line text-xl text-[var(--brand)]" aria-hidden="true"></i>
										</button>
										<button class="side-action transition flex items-center justify-between gap-3" type="button" onclick={copyCustomerUpdate}>
											<div>
												<strong>Copy customer update</strong>
												<span class="block text-xs text-[var(--muted)] mt-1">Plain text</span>
											</div>
											<i class="ri-file-copy-2-line text-xl text-[var(--brand)]" aria-hidden="true"></i>
										</button>
									</div>
								</aside>
							</div>
						</div>
					</section>
				{:else}
					<section class="customer-grid">
						<div class="px-4 py-6 md:px-10 md:py-9">
							<div class="mx-auto max-w-5xl">
								<p class="text-sm uppercase tracking-wide text-[var(--muted)]">
									Order #{orderId}
									<span class="ml-3 rounded border border-[var(--line)] px-2 py-1 normal-case tracking-normal font-sans"
										>Wholesale</span
									>
									<span class="ml-3 normal-case tracking-normal">Client: {client}</span>
								</p>
								<div class="mt-5 flex flex-wrap items-start justify-between gap-4">
									<div>
										<h1 class="font-display text-4xl leading-tight md:text-5xl">Update customer</h1>
										<p class="mt-3 text-lg">Edit the customer update before copying or marking sent.</p>
									</div>
									<div class="page-actions">
										<button class="ghost-button" type="button" onclick={saveDraft}>Save draft</button>
										<button class="secondary-button" type="button">Preview</button>
									</div>
								</div>

								<div class="mt-8 rounded-md border border-[var(--line)] bg-white p-4 text-sm leading-relaxed shadow-sm">
									<strong>What's included in this update</strong>
									<p class="mt-1 text-[var(--muted)]">
										Order summary, timeline, production status, and any notes or next steps.
									</p>
								</div>

								<label class="mt-8 block">
									<span class="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
										Message
									</span>
									<textarea
										class="customer-textarea shadow-inner"
										bind:value={customerUpdate}
									></textarea>
								</label>
							</div>
						</div>

						<aside class="side-panel customer-side">
							<h2 class="font-display text-2xl">Included in this update</h2>
							<div class="mt-7 space-y-6">
								<div>
									<h3 class="font-semibold">Order summary</h3>
									<p class="mt-1 text-sm text-[var(--muted)]">8 items, {totalQty} total quantity</p>
								</div>
								<div>
									<h3 class="font-semibold">Timeline</h3>
									<p class="mt-1 text-sm text-[var(--muted)]">Production start and ETA</p>
								</div>
								<div>
									<h3 class="font-semibold">Notes</h3>
									<p class="mt-1 text-sm text-[var(--muted)]">Special requests or next steps</p>
								</div>
							</div>

							<div class="mt-9 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] p-4 shadow-sm">
								<h3 class="font-display text-xl">Preview</h3>
								<p class="mt-4 text-sm font-medium">To: Mia Chen &lt;mia@driftwoodcollective.com&gt;</p>
								<p class="mt-1 text-sm">Subject: Update on your order #{orderId}</p>
								
								<!-- Real-time email preview text rendering instead of dummy bars -->
								<div class="mt-4 rounded border border-[var(--line)] bg-white p-3 text-xs font-sans whitespace-pre-wrap leading-relaxed shadow-inner max-h-[220px] overflow-auto">
									{customerUpdate}
								</div>
							</div>
						</aside>
					</section>
				{/if}
			</div>

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
								{#if currentStep === 1}
									{uploadedFile ? `Ready: 1 uploaded file (${uploadedFile})` : 'Ready: 1 pasted source'}
								{:else if currentStep === 2}
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
							<button class="secondary-button" type="button" onclick={previousStep}>Previous</button>
						{/if}
						{#if currentStep === 2}
							<button class="primary-button flex items-center justify-center" type="button" disabled={!allAnswered} onclick={continueToSheets}>
								Continue to sheets <i class="ri-arrow-right-line ml-1" aria-hidden="true"></i>
							</button>
						{:else}
							{#if currentStep === 1}
								<button id="process-order-btn" class="primary-button flex items-center justify-center" type="button" onclick={processOrder}>
									Process order <i class="ri-arrow-right-line ml-1" aria-hidden="true"></i>
								</button>
							{:else if currentStep === 3}
								<button class="primary-button flex items-center justify-center" type="button" onclick={() => setStep(4)}>
									Continue to customer update <i class="ri-arrow-right-line ml-1" aria-hidden="true"></i>
								</button>
							{:else}
								<button class="secondary-button flex items-center gap-1" type="button" onclick={copyCustomerUpdate}>
									<i class="ri-file-copy-line" aria-hidden="true"></i> Copy update
								</button>
								<button class="primary-button flex items-center gap-1" type="button" onclick={markSent}>
									<i class="ri-send-plane-line" aria-hidden="true"></i> Mark as sent
								</button>
							{/if}
						{/if}
					</div>
				</div>
			</footer>
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
				<h2 class="font-display text-2xl">Original Order Source</h2>
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
					Source Channel: {selectedSource} {uploadedFile ? `(File: ${uploadedFile})` : ''}
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
