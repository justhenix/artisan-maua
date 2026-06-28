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
	import AppShell from '$lib/components/artisan/AppShell.svelte';
	import { fallbackCatalog, type CatalogItem } from '$lib/data/fallbackCatalog';

	let { data }: { data: any } = $props();

	type Step = 1 | 2 | 3 | 4;
	type Tab = 'production' | 'packing' | 'customer';

	type Blocker = {
		id: string;
		impact: 'High impact' | 'Medium impact';
		impactKey: 'highImpact' | 'mediumImpact';
		question: string;
		questionKey: 'starburstQuestion' | 'horseQuestion';
		evidence: string;
		source: string;
		risk: string;
		riskKey: 'starburstRisk' | 'horseRisk';
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
		imageUrl?: string;
	};

	type Locale = 'en' | 'id';
	type AppMessages = typeof enMessages;

	const storageKey = 'artisan-demo-flow-v3';
	let selectedOrderId = $state('HB-250416');
	const orderId = $derived(selectedOrderId);
	let client = $state('Driftwood Collective');

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

	function parseMessyInput(text: string): LineItem[] {
		const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
		if (lines.length === 0) return [];

		const parsedItems: LineItem[] = [];
		const cleanField = (f: string) => f.replace(/^["']|["']$/g, '').trim();

		const firstLine = lines[0];
		const isCsv = firstLine.includes(',') && lines.some(l => l.includes(','));
		const isTsv = firstLine.includes('\t') && lines.some(l => l.includes('\t'));

		if (isCsv || isTsv) {
			const sep = isTsv ? '\t' : ',';
			const parseRow = (rowText: string): string[] => {
				const result: string[] = [];
				let current = '';
				let inQuotes = false;
				for (let i = 0; i < rowText.length; i++) {
					const char = rowText[i];
					if (char === '"') {
						inQuotes = !inQuotes;
					} else if (char === sep && !inQuotes) {
						result.push(current);
						current = '';
					} else {
						current += char;
					}
				}
				result.push(current);
				return result.map(cleanField);
			};

			const headerRow = parseRow(lines[0]);
			let itemIdx = -1;
			let qtyIdx = -1;
			let finishIdx = -1;
			let priceIdx = -1;
			let notesIdx = -1;
			let imageIdx = -1;

			headerRow.forEach((col, idx) => {
				const c = col.toLowerCase();
				if (c.includes('item') || c.includes('description') || c.includes('style') || c.includes('code') || c.includes('product') || c === 'name') {
					if (itemIdx === -1) itemIdx = idx;
				} else if (c.includes('qty') || c.includes('quantity') || c.includes('count') || c === 'q') {
					if (qtyIdx === -1) qtyIdx = idx;
				} else if (c.includes('finish') || c.includes('material') || c.includes('metal')) {
					if (finishIdx === -1) finishIdx = idx;
				} else if (c.includes('price') || c.includes('rate') || c.includes('cost')) {
					if (priceIdx === -1) priceIdx = idx;
				} else if (c.includes('note') || c.includes('instruction') || c.includes('comment')) {
					if (notesIdx === -1) notesIdx = idx;
				} else if (c.includes('image') || c.includes('pic') || c.includes('photo') || c.includes('url') || c.includes('file')) {
					if (imageIdx === -1) imageIdx = idx;
				}
			});

			const startRowIdx = (itemIdx !== -1 || qtyIdx !== -1) ? 1 : 0;
			let finalItemIdx = itemIdx !== -1 ? itemIdx : 0;
			let finalQtyIdx = qtyIdx !== -1 ? qtyIdx : 1;
			let finalFinishIdx = finishIdx !== -1 ? finishIdx : 2;
			let finalNotesIdx = notesIdx !== -1 ? notesIdx : 3;
			let finalPriceIdx = priceIdx;
			let finalImageIdx = imageIdx;

			for (let i = startRowIdx; i < lines.length; i++) {
				if (lines[i].startsWith('---') || lines[i].startsWith('===')) continue;
				const cols = parseRow(lines[i]);
				if (cols.length < 2) continue;

				const itemText = cols[finalItemIdx] || '';
				if (!itemText) continue;

				const qtyText = cols[finalQtyIdx] || '1';
				const qty = parseInt(qtyText.replace(/[^\d]/g, ''), 10) || 1;

				const finish = cols[finalFinishIdx] || 'Silver';
				const notes = cols[finalNotesIdx] || '';
				
				let unitPrice = 0;
				if (finalPriceIdx !== undefined && finalPriceIdx !== -1 && cols[finalPriceIdx]) {
					unitPrice = parseFloat(cols[finalPriceIdx].replace(/[^\d.]/g, '')) || 0;
				}

				let imageUrl = '';
				if (finalImageIdx !== undefined && finalImageIdx !== -1 && cols[finalImageIdx]) {
					imageUrl = cols[finalImageIdx];
				}

				const id = `item-${Math.random().toString(36).substr(2, 9)}`;

				parsedItems.push({
					id,
					item: itemText,
					styleCode: '',
					qty,
					finish,
					notes,
					source: isCsv ? 'CSV row' : 'TSV row',
					unitPrice,
					imageUrl
				});
			}
		}

		if (parsedItems.length === 0) {
			lines.forEach((line) => {
				if (
					line.startsWith('From:') || 
					line.startsWith('Subject:') || 
					line.startsWith('PO#') || 
					line.startsWith('Ship to:') || 
					line.startsWith('Item ') || 
					line.startsWith('---') || 
					line.startsWith('===') ||
					line.toLowerCase().includes('csv pasted below')
				) return;

				let matchedCatalog: CatalogItem | undefined;
				for (const cat of catalog) {
					if (
						line.toLowerCase().includes(cat.styleCode.toLowerCase()) ||
						line.toLowerCase().includes(cat.creativeTitle.toLowerCase())
					) {
						matchedCatalog = cat;
						break;
					}
				}

				if (matchedCatalog) {
					const qtyMatch = line.match(/\b(\d+)\b/);
					const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

					let finish = 'Silver';
					const finishes = ['Silver', 'Gold', 'Vermeil', 'Brass', 'Mother of Pearl'];
					for (const f of finishes) {
						if (line.toLowerCase().includes(f.toLowerCase())) {
							finish = f === 'Vermeil' ? 'Gold Vermeil' : f;
							break;
						}
					}

					const priceMatch = line.match(/\$(\d+(\.\d{2})?)/);
					const unitPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;

					let notes = '';
					const noteQuotes = line.match(/["']([^"']+)["']/);
					if (noteQuotes) {
						notes = noteQuotes[1];
					} else {
						const parts = line.split(/\s{2,}/);
						if (parts.length > 2) {
							notes = parts[parts.length - 1];
						}
					}

					let imageUrl = '';
					const imgMatch = line.match(/\b\S+\.(png|jpg|jpeg)\b/i);
					if (imgMatch) {
						imageUrl = imgMatch[0];
					}

					parsedItems.push({
						id: `item-${Math.random().toString(36).substr(2, 9)}`,
						item: matchedCatalog.creativeTitle,
						styleCode: matchedCatalog.styleCode,
						qty,
						finish,
						notes,
						source: 'Pasted text',
						unitPrice,
						imageUrl
					});
				}
			});
		}

		parsedItems.forEach((item) => {
			if (!item.styleCode) {
				const name = item.item.toLowerCase();
				const exactMatch = catalog.find(
					c => c.creativeTitle.toLowerCase() === name || c.styleCode.toLowerCase() === name
				);
				if (exactMatch) {
					item.styleCode = exactMatch.styleCode;
					item.item = exactMatch.creativeTitle;
				} else {
					if (name.includes('horse') && name.includes('pin')) {
						if (name.includes('medium')) {
							item.styleCode = 'HB-HORSE-M';
							item.item = 'Horse Pin Medium';
						} else if (name.includes('small')) {
							item.styleCode = 'HB-HORSE-S';
							item.item = 'Horse Pin Small';
						} else if (name.includes('large')) {
							item.styleCode = 'HB-HORSE-L';
							item.item = 'Horse Pin Large';
						} else {
							item.styleCode = '';
							item.item = 'Horse Pin (Size Unresolved)';
						}
					} else if (name.includes('starburst')) {
						if (name.includes('mini')) {
							item.styleCode = 'HB-SB-MINI';
							item.item = 'Bali Starburst Mini';
						} else if (name.includes('small')) {
							item.styleCode = 'HB-SB-SMALL';
							item.item = 'Bali Starburst Small';
						} else if (name.includes('large')) {
							item.styleCode = 'HB-SB-LARGE';
							item.item = 'Bali Starburst Large';
						} else if (name.includes('stud')) {
							item.styleCode = 'HB-SB-STUD';
							item.item = 'Starburst Studs';
						} else {
							item.styleCode = '';
							item.item = 'Bali Starburst (Size Unresolved)';
						}
					} else if (name.includes('mountain')) {
						item.styleCode = 'HB-MTN-P';
						item.item = 'Mountain Pendant';
					} else if (name.includes('wave') && name.includes('cuff')) {
						item.styleCode = 'HB-WAVE-C';
						item.item = 'Wave Cuff';
					} else if (name.includes('stacking') && name.includes('ring')) {
						item.styleCode = 'HB-TSR-2';
						item.item = 'Thin Stacking Ring';
					} else if (name.includes('cable') && name.includes('chain')) {
						item.styleCode = 'HB-CC-18';
						item.item = 'Cable Chain 18"';
					}
				}
			}
		});

		return parsedItems;
	}

	function loadSampleType(source: (typeof sourceTypes)[number]) {
		selectedSource = source;
		intakeText = samples[source];
		uploadedFiles = [];
		sampleUsed = true;
		resetDemoState();
		markAutoSaved();
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
		markAutoSaved();
	}

	const catalog = $derived<CatalogItem[]>(
		data.catalogItems && data.catalogItems.length > 0 ? data.catalogItems : fallbackCatalog
	);

	const initialBlockers = (): Blocker[] => [
		{
			id: 'starburst-size',
			impact: 'High impact',
			impactKey: 'highImpact',
			question: 'Which Starburst size should Bali make?',
			questionKey: 'starburstQuestion',
			evidence: 'mini star',
			source: 'Pasted DM',
			risk: 'Size changes casting, stone layout, packing count, and production time.',
			riskKey: 'starburstRisk',
			options: ['Mini', 'Small', 'Large'],
			answer: ''
		},
		{
			id: 'horse-pin-size',
			impact: 'Medium impact',
			impactKey: 'mediumImpact',
			question: 'Which Horse Pin size is this?',
			questionKey: 'horseQuestion',
			evidence: 'new smaller horse pin',
			source: 'Copied PO text',
			risk: 'Horse Pin sizes map to different style codes and wholesale packing labels.',
			riskKey: 'horseRisk',
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
	let showWelcomeModal = $state(false);

	let orders = $state<any[]>([]);
	let activeView = $state<'dashboard' | 'workbench'>('dashboard');
	let orderStatus = $state('Review');
	let milestones = $state({
		moldsChecked: false,
		silverCast: false,
		qualityChecked: false,
		readyForShipping: false
	});

	let dbLoaded = false;
	$effect(() => {
		if (!dbLoaded && data.orders && data.orders.length > 0) {
			orders = data.orders;
			
			// Load the default selected order
			const defaultOrder = data.orders.find((o: any) => o.id === selectedOrderId) || data.orders[0];
			if (defaultOrder) {
				selectedOrderId = defaultOrder.id;
				client = defaultOrder.clientName;
				intakeText = defaultOrder.sourceText;
				customerUpdate = defaultOrder.customerUpdate;
				uploadedFiles = defaultOrder.uploadedFiles;
				orderStatus = defaultOrder.status;
				milestones = defaultOrder.milestones || { moldsChecked: false, silverCast: false, qualityChecked: false, readyForShipping: false };
				
				lineItems = data.allItems.filter((item: any) => item.poId === selectedOrderId);
				blockers = data.allBlockers.filter((bl: any) => bl.poId === selectedOrderId);
				restoreSession(selectedOrderId);
			}
			
			dbLoaded = true;
		}
	});

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

	function extractEmail(text: string) {
		return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';
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
	const packedCount = $derived(Object.values(packedItems).filter(Boolean).length);
	const customerEmail = $derived(extractEmail(intakeText));

	const reviewOrders = $derived(orders.filter(o => o.status === 'Review').length);
	const productionOrders = $derived(orders.filter(o => o.status === 'Production' || o.status === 'Packing').length);
	const completedOrders = $derived(orders.filter(o => o.status === 'Completed').length);

	const maxStep = $derived(allAnswered ? Math.max(completedSteps, 3) as Step : completedSteps as Step);

	// Session Restoration
	function restoreSession(orderId: string) {
		if (!browser) return;
		const saved = sessionStorage.getItem(`${storageKey}-${orderId}`);
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
				sessionStorage.removeItem(`${storageKey}-${orderId}`);
			}
		}
	}



	$effect(() => {
		if (!browser) return;
		sessionStorage.setItem(
			`${storageKey}-${selectedOrderId}`,
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
		markAutoSaved();
		showToast(t.sampleOrderLoaded);
	}

	function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const files = Array.from(target.files);
			uploadedFiles = [...uploadedFiles, ...files.map(f => f.name)];
			intakeText = `[${t.filesSource}: ${uploadedFiles.join(', ')}]\n\n` + samples[selectedSource];
			resetDemoState();
			markAutoSaved();
			showToast(`${files.length} ${t.fileUploaded}`);
		}
	}

	function handleComposerPaste(event: ClipboardEvent) {
		const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
			file.type.startsWith('image/')
		);
		if (files.length === 0) return;

		event.preventDefault();
		const imageNames = files.map((file, index) => {
			const extension = file.type.split('/')[1] || 'png';
			return file.name || `Clipboard image ${uploadedFiles.length + index + 1}.${extension}`;
		});
		uploadedFiles = [...uploadedFiles, ...imageNames];
		intakeText = `[${t.filesSource}: ${uploadedFiles.join(', ')}]\n\n${intakeText.trim() || samples[selectedSource]}`;
		resetDemoState();
		markAutoSaved();
		showToast(`${files.length} ${t.clipboardImageAttached}`);
	}

	function handleFileDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
			const files = Array.from(event.dataTransfer.files);
			uploadedFiles = [...uploadedFiles, ...files.map(f => f.name)];
			intakeText = `[${t.filesSource}: ${uploadedFiles.join(', ')}]\n\n` + samples[selectedSource];
			resetDemoState();
			markAutoSaved();
			showToast(`${files.length} ${t.fileUploaded}`);
		}
	}
	function processOrder() {
		if (!intakeText.trim()) {
			intakeText = samples[selectedSource];
		}
		processClicked = true;
		resetDemoState();

		const isDefaultSample = Object.values(samples).some(s => s.trim() === intakeText.trim()) && !uploadedFiles.length;

		if (!isDefaultSample) {
			const parsed = parseMessyInput(intakeText);
			if (parsed.length > 0) {
				parsed.forEach((item) => {
					if (item.styleCode) {
						const cat = catalog.find(c => c.styleCode === item.styleCode);
						if (cat && cat.imageUrl && !item.imageUrl) {
							item.imageUrl = cat.imageUrl;
						}
					}
				});
				lineItems = parsed;

				const activeBlockers: Blocker[] = [];
				const hasStarburstUnresolved = parsed.some(item => !item.styleCode && item.item.toLowerCase().includes('starburst'));
				const hasHorseUnresolved = parsed.some(item => !item.styleCode && item.item.toLowerCase().includes('horse'));

				if (hasStarburstUnresolved) {
					activeBlockers.push({
						id: 'starburst-size',
						impact: 'High impact',
						impactKey: 'highImpact',
						question: 'Which Starburst size should Bali make?',
						questionKey: 'starburstQuestion',
						evidence: parsed.find(item => item.item.toLowerCase().includes('starburst'))?.notes || 'Bali Starburst',
						source: parsed.find(item => item.item.toLowerCase().includes('starburst'))?.source || 'Source',
						risk: 'Size changes casting, stone layout, packing count, and production time.',
						riskKey: 'starburstRisk',
						options: ['Mini', 'Small', 'Large'],
						answer: ''
					});
				}

				if (hasHorseUnresolved) {
					activeBlockers.push({
						id: 'horse-pin-size',
						impact: 'Medium impact',
						impactKey: 'mediumImpact',
						question: 'Which Horse Pin size is this?',
						questionKey: 'horseQuestion',
						evidence: parsed.find(item => item.item.toLowerCase().includes('horse'))?.notes || 'Horse Pin',
						source: parsed.find(item => item.item.toLowerCase().includes('horse'))?.source || 'Source',
						risk: 'Horse Pin sizes map to different style codes and wholesale packing labels.',
						riskKey: 'horseRisk',
						options: ['Small', 'Medium', 'Large'],
						answer: ''
					});
				}

				blockers = activeBlockers;

				customerUpdate = `Hi Mia,

Thank you for your order. We reviewed the details and everything needed for production is now ready.

Order summary
- ${parsed.length} items
- Total quantity: ${parsed.reduce((sum, item) => sum + item.qty, 0)}
- Finishes: ${Array.from(new Set(parsed.map(item => item.finish))).join(', ')}

Timeline
- Production start: June 3, 2026
- Estimated completion: June 20, 2026
- Need by: July 10, 2026

We will send another update once production begins. Please reach out if anything needs to change.

Thank you,
Heather Benjamin Jewelry`;
			}
		} else {
			if (lineItems.length === 0) {
				lineItems = initialLineItems();
				blockers = initialBlockers();
			}
			lineItems.forEach((item) => {
				if (item.styleCode) {
					const cat = catalog.find(c => c.styleCode === item.styleCode);
					if (cat && cat.imageUrl) {
						item.imageUrl = cat.imageUrl;
					}
				}
			});
		}

		markAutoSaved();
		setStep(2);
	}

	function setStep(step: Step) {
		currentStep = step;
		if (step > completedSteps) {
			completedSteps = step;
		}
		if (!browser) return;
		window.requestAnimationFrame(() => contentPanel?.scrollTo({ top: 0, left: 0 }));
	}

	function previousStep() {
		if (currentStep > 1) {
			setStep((currentStep - 1) as Step);
		}
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
		markAutoSaved();
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

	async function syncToDatabase() {
		if (!browser) return;
		try {
			await fetch('/api/order-sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					orderId: selectedOrderId,
					client,
					blockers,
					lineItems,
					customerUpdate,
					uploadedFiles,
					sourceText: intakeText,
					status: orderStatus,
					milestones
				})
			});
		} catch (err) {
			console.error('Failed to sync to database:', err);
		}
	}

	function selectOrder(orderId: string) {
		const order = orders.find(o => o.id === orderId);
		if (!order) return;
		selectedOrderId = orderId;
		client = order.clientName;
		intakeText = order.sourceText;
		customerUpdate = order.customerUpdate;
		uploadedFiles = order.uploadedFiles;
		orderStatus = order.status;
		milestones = order.milestones || { moldsChecked: false, silverCast: false, qualityChecked: false, readyForShipping: false };
		
		lineItems = data.allItems.filter((item: any) => item.poId === selectedOrderId);
		blockers = data.allBlockers.filter((bl: any) => bl.poId === selectedOrderId);
		
		activeView = 'workbench';
		
		// Map status to Wizard Steps
		if (orderStatus === 'Review') {
			currentStep = 2;
		} else if (orderStatus === 'Production') {
			currentStep = 3;
			activeTab = 'production';
		} else if (orderStatus === 'Packing') {
			currentStep = 3;
			activeTab = 'packing';
		} else if (orderStatus === 'Completed') {
			currentStep = 4;
		} else {
			currentStep = 1;
		}
		restoreSession(orderId);
	}

	function createNewOrder() {
		const newId = `HB-25${Math.floor(1000 + Math.random() * 9000)}`;
		const newOrder = {
			id: newId,
			poNumber: newId,
			clientName: 'New Boutique Partner',
			status: 'Review',
			sourceText: '',
			customerUpdate: '',
			uploadedFiles: [],
			milestones: { moldsChecked: false, silverCast: false, qualityChecked: false, readyForShipping: false },
			createdAt: Date.now(),
			updatedAt: Date.now()
		};
		
		orders = [newOrder, ...orders];
		selectedOrderId = newId;
		client = newOrder.clientName;
		intakeText = '';
		customerUpdate = '';
		uploadedFiles = [];
		orderStatus = 'Review';
		milestones = { moldsChecked: false, silverCast: false, qualityChecked: false, readyForShipping: false };
		lineItems = [];
		blockers = [];
		
		activeView = 'workbench';
		currentStep = 1;
		
		markDirty();
		markAutoSaved();
	}

	function getMilestoneCompletedCount(ms: any) {
		if (!ms) return 0;
		let count = 0;
		if (ms.moldsChecked) count++;
		if (ms.silverCast) count++;
		if (ms.qualityChecked) count++;
		if (ms.readyForShipping) count++;
		return count;
	}

	function onMilestoneChange() {
		if (milestones.moldsChecked && milestones.silverCast && milestones.qualityChecked && milestones.readyForShipping) {
			orderStatus = 'Completed';
			setStep(4);
		} else if (milestones.readyForShipping) {
			orderStatus = 'Packing';
			setStep(3);
			activeTab = 'packing';
		} else if (milestones.moldsChecked || milestones.silverCast) {
			orderStatus = 'Production';
			setStep(3);
			activeTab = 'production';
		} else {
			orderStatus = 'Review';
			setStep(2);
		}
		
		const order = orders.find(o => o.id === selectedOrderId);
		if (order) {
			order.milestones = { ...milestones };
			order.status = orderStatus;
			order.updatedAt = Date.now();
		}
		markDirty();
		markAutoSaved();
	}

	function onOrderStatusChange() {
		if (orderStatus === 'Completed') {
			milestones = { moldsChecked: true, silverCast: true, qualityChecked: true, readyForShipping: true };
			setStep(4);
		} else if (orderStatus === 'Packing') {
			milestones.moldsChecked = true;
			milestones.silverCast = true;
			milestones.qualityChecked = true;
			milestones.readyForShipping = false;
			setStep(3);
			activeTab = 'packing';
		} else if (orderStatus === 'Production') {
			if (!milestones.moldsChecked && !milestones.silverCast) {
				milestones.moldsChecked = true;
			}
			milestones.qualityChecked = false;
			milestones.readyForShipping = false;
			setStep(3);
			activeTab = 'production';
		} else if (orderStatus === 'Review') {
			milestones = { moldsChecked: false, silverCast: false, qualityChecked: false, readyForShipping: false };
			setStep(2);
		}
		
		const order = orders.find(o => o.id === selectedOrderId);
		if (order) {
			order.status = orderStatus;
			order.milestones = { ...milestones };
			order.updatedAt = Date.now();
		}
		markDirty();
		markAutoSaved();
	}

	function markDirty() {
		sheetDirty = true;
	}

	function markAutoSaved() {
		lastSaved = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
		sheetDirty = false;
		syncToDatabase();
	}

	function updateLineItem(id: string, field: 'styleCode' | 'qty' | 'notes' | 'unitPrice', value: string | number) {
		const item = lineItems.find((entry) => entry.id === id);
		if (!item) return;
		if (field === 'qty') {
			item.qty = Number(value) || 0;
		} else if (field === 'unitPrice') {
			item.unitPrice = Number(value) || 0;
		} else {
			item[field] = String(value);
		}
		markDirty();
		markAutoSaved();
	}

	function setPackedItem(id: string, checked: boolean) {
		packedItems = { ...packedItems, [id]: checked };
		markDirty();
		markAutoSaved();
	}

	function updateIntakeText(value: string) {
		intakeText = value;
		markAutoSaved();
	}

	function setProductionGrouping(grouping: 'material' | 'category') {
		productionGrouping = grouping;
		markAutoSaved();
	}

	function updateCustomerUpdate(value: string) {
		customerUpdate = value;
		markAutoSaved();
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
						'',
						''
					]
				]
			: [];

		return [
			[t.item, t.styleCode, t.qty, t.unitPrice || 'Price', t.materialFinish, t.technicalInstructions, t.orderNotes || 'Notes'],
			...warningRows,
			...lineItems.map((item) => [
				item.item,
				item.styleCode,
				item.qty,
				item.unitPrice || 0,
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

	function openEmailDraft() {
		if (!browser) return;
		const subject = `${t.customerUpdate}: ${orderId}`;
		const mailto = `mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(customerUpdate)}`;
		window.location.href = mailto;
		showToast(t.emailDraftOpened);
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

<main class="h-screen overflow-hidden bg-(--bg) text-(--ink)">
	<AppShell
		{t}
		{currentLocale}
		currentPath={page.url.pathname}
		headerLastSaved={lastSaved}
		headerRightSidebarCollapsed={rightSidebarCollapsed}
		headerOnToggleRightSidebar={() => (rightSidebarCollapsed = !rightSidebarCollapsed)}
		onReplayTour={startTour}
		mainClass={`${activeView === 'dashboard' ? 'app-main-dashboard' : ''} ${activeView === 'workbench' && currentStep > 1 ? 'app-main-workbench-status' : ''}`}
	>
		{#if activeView === 'dashboard'}
				<div class="flex-1 overflow-y-auto bg-gray-50/50 p-6 md:p-10 font-sans">
					<div class="max-w-6xl mx-auto">
						<div class="flex items-center justify-between mb-8">
							<div>
								<h1 class="font-display text-3xl font-bold tracking-tight text-(--ink)">{t.ordersDashboard}</h1>
								<p class="text-sm text-(--muted)">{t.ordersDashboardDesc}</p>
							</div>
							<button
								onclick={createNewOrder}
								class="flex items-center gap-2 px-4 py-2.5 rounded bg-(--brand) text-white hover:bg-(--brand-dark) text-sm font-semibold transition cursor-pointer border-0 shadow-sm"
							>
								<i class="ri-add-line text-base"></i>
								{t.newPurchaseOrder}
							</button>
						</div>

						<!-- Summary Stats Cards -->
						<div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
							<div class="rounded-lg border border-(--line) bg-white p-4 shadow-sm">
								<p class="text-xs font-semibold text-(--muted) uppercase tracking-wider">{t.needsReview}</p>
								<div class="mt-3 flex items-end justify-between gap-4">
									<strong class="font-display text-3xl leading-none">{reviewOrders}</strong>
									<span class="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">{t.blockerFirst}</span>
								</div>
							</div>
							<div class="rounded-lg border border-(--line) bg-white p-4 shadow-sm">
								<p class="text-xs font-semibold text-(--muted) uppercase tracking-wider">{t.inProgress}</p>
								<div class="mt-3 flex items-end justify-between gap-4">
									<strong class="font-display text-3xl leading-none">{productionOrders}</strong>
									<span class="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800">{t.baliTasks}</span>
								</div>
							</div>
							<div class="rounded-lg border border-(--line) bg-white p-4 shadow-sm">
								<p class="text-xs font-semibold text-(--muted) uppercase tracking-wider">{t.completed}</p>
								<div class="mt-3 flex items-end justify-between gap-4">
									<strong class="font-display text-3xl leading-none">{completedOrders}</strong>
									<span class="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">{t.readyHistory}</span>
								</div>
							</div>
						</div>

						<!-- Kanban Grid -->
						<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
							{#each ['Review', 'Production', 'Packing', 'Completed'] as colStatus}
								<div class="flex flex-col bg-(--surface-soft) rounded-lg p-4 border border-(--line) min-h-100">
									<div class="flex items-center justify-between mb-4 pb-2 border-b border-(--line)">
										<div class="flex items-center gap-2">
											<span class={`w-2.5 h-2.5 rounded-full ${
												colStatus === 'Review' ? 'bg-amber-500' :
												colStatus === 'Production' ? 'bg-blue-500' :
												colStatus === 'Packing' ? 'bg-purple-500' : 'bg-emerald-500'
											}`}></span>
											<h3 class="font-semibold text-sm text-(--ink)">
												{colStatus === 'Review' ? t.reviewRequired :
												 colStatus === 'Production' ? t.inProduction :
												 colStatus === 'Packing' ? t.fulfillmentPacking : t.completedShipped}
											</h3>
										</div>
										<span class="rounded bg-white px-2 py-0.5 text-xs border border-(--line) font-medium text-(--muted)">
											{orders.filter(o => o.status === colStatus).length}
										</span>
									</div>

									<div class="flex-1 space-y-4 overflow-y-auto max-h-150 pr-1">
										{#each orders.filter(o => o.status === colStatus) as order (order.id)}
											<button
												onclick={() => selectOrder(order.id)}
												class="w-full text-left bg-white rounded border border-(--line) hover:border-(--brand) hover:shadow-sm p-4 transition cursor-pointer focus:outline-none flex flex-col gap-3"
											>
												<div class="flex items-center justify-between">
													<span class="text-xs font-mono font-medium text-(--muted)">{order.id}</span>
												</div>

												<div>
													<h4 class="font-semibold text-sm text-(--ink) leading-tight">{order.clientName}</h4>
													<p class="text-[11px] text-(--muted) mt-1">
														{t.updated}: {new Date(order.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
													</p>
												</div>

												<!-- Checklist milestones progress -->
												<div class="space-y-1">
													<div class="flex items-center justify-between text-[11px] text-(--muted)">
														<span>{t.baliMilestones}</span>
														<span class="font-medium">{getMilestoneCompletedCount(order.milestones)}/4</span>
													</div>
													<div class="w-full h-1.5 bg-gray-100 rounded overflow-hidden">
														<div 
															class={`h-full transition-all ${
																order.status === 'Review' ? 'bg-amber-400' :
																order.status === 'Production' ? 'bg-blue-500' :
																order.status === 'Packing' ? 'bg-purple-500' : 'bg-emerald-500'
															}`}
															style={`width: ${(getMilestoneCompletedCount(order.milestones) / 4) * 100}%`}
														></div>
													</div>
												</div>
											</button>
										{/each}

										{#if orders.filter(o => o.status === colStatus).length === 0}
											<div class="h-20 flex items-center justify-center border border-dashed border-(--line) rounded text-xs text-(--muted) border-gray-200 text-gray-400">
												{t.noOrders}
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{:else}
				<!-- Status Milestone Tracker Banner -->
				<div class="bg-(--surface-soft) border-b border-(--line) px-4 md:px-10 py-3 flex flex-wrap items-center justify-between gap-4 text-xs shadow-sm font-sans shrink-0">
					<button onclick={() => (activeView = 'dashboard')} class="flex items-center gap-1.5 text-xs text-(--muted) hover:text-(--brand) transition cursor-pointer border-0 bg-transparent p-0 font-medium">
						<i class="ri-arrow-left-line"></i>
						{t.backToDashboard}
					</button>

					<div class="flex items-center gap-3">
						<span class="text-xs uppercase tracking-wider font-semibold text-(--muted)">{t.workflow}:</span>
						<select 
							bind:value={orderStatus} 
							onchange={onOrderStatusChange}
							class="rounded border border-(--line) bg-white px-2 py-0.5 text-xs font-semibold focus:border-(--brand) outline-none cursor-pointer"
						>
							<option value="Review">{t.reviewRequiredOption}</option>
							<option value="Production">{t.inProductionOption}</option>
							<option value="Packing">{t.fulfillmentPackingOption}</option>
							<option value="Completed">{t.completedShippedOption}</option>
						</select>
					</div>

					<div class="flex items-center gap-6 flex-wrap">
						<span class="text-xs uppercase tracking-wider font-semibold text-(--muted)">{t.baliMilestones}:</span>
						
						<label class="flex items-center gap-2 cursor-pointer font-medium select-none text-xs text-(--ink)">
							<input 
								type="checkbox" 
								bind:checked={milestones.moldsChecked} 
								onchange={onMilestoneChange}
								class="rounded border-(--line) text-(--brand) focus:ring-(--brand) h-3.5 w-3.5"
							/>
							<span>{t.moldsVerified}</span>
						</label>

						<label class="flex items-center gap-2 cursor-pointer font-medium select-none text-xs text-(--ink)">
							<input 
								type="checkbox" 
								bind:checked={milestones.silverCast} 
								onchange={onMilestoneChange}
								class="rounded border-(--line) text-(--brand) focus:ring-(--brand) h-3.5 w-3.5"
							/>
							<span>{t.silverCast}</span>
						</label>

						<label class="flex items-center gap-2 cursor-pointer font-medium select-none text-xs text-(--ink)">
							<input 
								type="checkbox" 
								bind:checked={milestones.qualityChecked} 
								onchange={onMilestoneChange}
								class="rounded border-(--line) text-(--brand) focus:ring-(--brand) h-3.5 w-3.5"
							/>
							<span>{t.qcPassed}</span>
						</label>

						<label class="flex items-center gap-2 cursor-pointer font-medium select-none text-xs text-(--ink)">
							<input 
								type="checkbox" 
								bind:checked={milestones.readyForShipping} 
								onchange={onMilestoneChange}
								class="rounded border-(--line) text-(--brand) focus:ring-(--brand) h-3.5 w-3.5"
							/>
							<span>{t.readyToShip}</span>
						</label>
					</div>
				</div>

				<div class="step-scroll border-b border-(--line) bg-white px-4 md:px-10">
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
							<span class={`step-label ${step.id > maxStep ? 'text-(--muted) opacity-60' : 'font-semibold'}`}>
								{stepLabel(step.id)}
							</span>
						</button>
						{#if index < steps.length - 1}
							<div class="hidden h-px flex-1 bg-(--line) md:block"></div>
						{/if}
					{/each}
				</div>
			</div>

			<div class="min-h-0 overflow-auto" bind:this={contentPanel}>
				{#if currentStep === 1}
					<section class={`grid min-h-full transition-all duration-300 ${rightSidebarCollapsed ? 'xl:grid-cols-1' : 'xl:grid-cols-[1fr_368px]'}`}>
						<div class="px-4 py-6 md:px-10 md:py-10">
							<div class="mx-auto max-w-5xl">
								<h1 class="font-display text-4xl leading-tight md:text-5xl">{t.addWholesaleOrder}</h1>
								<p class="mt-4 max-w-3xl whitespace-pre-line text-lg leading-8">{t.intakeDesc}</p>

								<div class="mt-8 rounded-lg border border-(--line) bg-white p-6 shadow-sm">
									<!-- Unified Intake Composer -->
									<div 
										class={`relative border rounded-lg p-1 min-h-75 transition-all duration-300 flex flex-col bg-(--surface-soft) ${isDragging ? 'border-(--brand) bg-(--brand)/5 ring-4 ring-(--brand)/10' : 'border-(--line) bg-(--surface-soft) focus-within:border-(--brand) focus-within:bg-white'}`}
										role="region"
										aria-label="Unified order composer"
										ondragenter={(e) => { e.preventDefault(); isDragging = true; }}
										ondragover={(e) => { e.preventDefault(); isDragging = true; }}
										ondragleave={() => { isDragging = false; }}
										ondrop={handleFileDrop}
										onpaste={handleComposerPaste}
									>
										<!-- Drop Overlay -->
										{#if isDragging}
											<div class="absolute inset-0 bg-(--brand)/10 flex flex-col items-center justify-center pointer-events-none rounded-lg z-20 border-2 border-dashed border-(--brand)">
												<i class="ri-upload-cloud-2-line text-4xl text-(--brand) animate-bounce"></i>
												<strong class="text-sm mt-2 text-(--brand-dark)">Drop files anywhere to attach</strong>
											</div>
										{/if}

										<!-- Textarea -->
										<textarea
											id="intake-scratchpad"
											class="flex-1 w-full min-h-80 resize-none p-4 font-mono text-sm leading-6 outline-none bg-transparent border-0"
											placeholder="Paste purchase order details, email text, DM conversations, spreadsheet rows... or attach files below."
											value={intakeText}
											oninput={(event) => updateIntakeText((event.currentTarget as HTMLTextAreaElement).value)}
										></textarea>

										<!-- Bottom controls bar inside the box -->
										<div class="flex flex-wrap items-center justify-between border-t border-(--line) p-3 bg-white/50 rounded-b-lg gap-2">
											<!-- File Attach controls and active file badges -->
											<div class="flex flex-wrap items-center gap-2">
												<!-- Attach Button -->
												<label class="relative cursor-pointer flex items-center justify-center w-8 h-8 rounded-full hover:bg-(--surface-muted) text-(--muted) hover:text-(--ink) transition">
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
													<div class="flex flex-wrap gap-1.5 max-w-100">
														{#each uploadedFiles as file, index (file + '-' + index)}
															<div class="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 font-medium">
																<i class="ri-file-text-line text-emerald-600"></i>
																<span class="max-w-30 truncate">{file}</span>
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
											<span class="text-[10px] uppercase tracking-wider font-semibold text-(--muted)">
												{uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) attached` : 'Text + files supported'}
											</span>
										</div>
									</div>

									<div class="mt-6 flex flex-wrap items-center justify-between gap-4">
										<div id="try-sample-container" class="text-xs text-(--muted) flex flex-wrap items-center gap-2 font-medium">
											<span>{t.trySample}:</span>
											<button
												type="button"
												class="underline hover:text-(--brand) transition cursor-pointer"
												onclick={() => loadSampleType('sourceEmail')}
											>
												{t.sourceEmail}
											</button>
											<span class="opacity-50">·</span>
											<button
												type="button"
												class="underline hover:text-(--brand) transition cursor-pointer"
												onclick={() => loadSampleType('sourceDm')}
											>
												{t.sourceDm}
											</button>
											<span class="opacity-50">·</span>
											<button
												type="button"
												class="underline hover:text-(--brand) transition cursor-pointer"
												onclick={() => loadSampleType('sourceSpreadsheet')}
											>
												{t.sourceSpreadsheet}
											</button>
											<span class="opacity-50">·</span>
											<button
												type="button"
												class="underline hover:text-(--brand) transition cursor-pointer"
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

								<p class="mt-4 flex items-center gap-2 text-sm text-(--muted)">
									<i class="ri-shield-check-line text-base text-(--brand)" aria-hidden="true"></i>
									{t.safetyNote}
								</p>
							</div>
						</div>

						{#if !rightSidebarCollapsed}
							<aside class="border-l border-(--line) bg-white px-8 py-10">
								<div class="flex items-center justify-between gap-4 mb-7">
									<h2 class="font-display text-2xl">{t.whatHappensNext}</h2>
									<button
										class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-(--surface-soft) text-(--muted) hover:text-(--ink) transition bg-transparent border-0 p-0 cursor-pointer"
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
										<span class={`flex items-center justify-center font-bold text-sm rounded-full w-8 h-8 border ${step1_item1 ? 'bg-emerald-600 text-white border-transparent' : 'border-(--line) bg-(--surface-soft) text-(--muted)'}`}>
											{#if step1_item1}
												<i class="ri-check-line text-sm font-bold"></i>
											{:else}
												1
											{/if}
										</span>
										<div>
											<h3 class={step1_item1 ? 'text-(--ink) font-semibold' : 'text-sm font-semibold'}>{t.extractTitle}</h3>
											<p class="text-xs text-(--muted) mt-1">{t.extractDesc}</p>
										</div>
									</div>

									<!-- Checklist Item 2 -->
									<div class={`next-card transition-all duration-300 ${step1_item2 ? 'border-emerald-200 bg-emerald-50/20' : ''}`}>
										<span class={`flex items-center justify-center font-bold text-sm rounded-full w-8 h-8 border ${step1_item2 ? 'bg-emerald-600 text-white border-transparent' : 'border-(--line) bg-(--surface-soft) text-(--muted)'}`}>
											{#if step1_item2}
												<i class="ri-check-line text-sm font-bold"></i>
											{:else}
												2
											{/if}
										</span>
										<div>
											<h3 class={step1_item2 ? 'text-(--ink) font-semibold' : 'text-sm font-semibold'}>{t.reviewSampleTitle}</h3>
											<p class="text-xs text-(--muted) mt-1">
												{t.reviewSampleDesc}
											</p>
										</div>
									</div>

									<!-- Checklist Item 3 -->
									<div class={`next-card transition-all duration-300 ${step1_item3 ? 'border-emerald-200 bg-emerald-50/20' : ''}`}>
										<span class={`flex items-center justify-center font-bold text-sm rounded-full w-8 h-8 border ${step1_item3 ? 'bg-emerald-600 text-white border-transparent' : 'border-(--line) bg-(--surface-soft) text-(--muted)'}`}>
											{#if step1_item3}
												<i class="ri-check-line text-sm font-bold"></i>
											{:else}
												3
											{/if}
										</span>
										<div>
											<h3 class={step1_item3 ? 'text-(--ink) font-semibold' : 'text-sm font-semibold'}>{t.startProcessingTitle}</h3>
											<p class="text-xs text-(--muted) mt-1">
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
										<p class="text-sm uppercase tracking-wide text-(--muted)">
											Order #{orderId}
											<span class="ml-3 rounded border border-(--line) px-2 py-1 normal-case tracking-normal font-sans"
												>Wholesale</span
											>
											<span class="ml-3 normal-case tracking-normal">Client: {client}</span>
										</p>
										<h1 class="mt-5 font-display text-4xl leading-tight md:text-5xl">{t.reviewOrder}</h1>
										<p class="mt-3 text-lg">{t.foundItems}</p>
										<p class="mt-1 text-sm text-(--muted)">
											{#if remainingAnswers > 0}
												{reviewCountLabel(remainingAnswers)}
											{:else}
												{t.allResolved}
											{/if}
										</p>
										<p class="mt-4 text-sm text-(--muted)">
											{t.sourceEvidence}: {uploadedFiles.length > 0 ? `${t.uploaded} ${uploadedFiles.join(', ')}` : t.pastedText}
										</p>
									</div>

									<div class="page-actions">
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
										class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-(--surface-soft) text-(--muted) hover:text-(--ink) transition bg-transparent border-0 p-0 cursor-pointer"
										type="button"
										aria-label={t.closeRightPanel}
										onclick={() => (rightSidebarCollapsed = true)}
									>
										<i class="ri-close-line text-lg"></i>
									</button>
								</div>
								<p class="text-sm text-(--muted)">
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
												<h3 class={isUnlocked ? 'text-(--ink) font-semibold' : ''}>{doc}</h3>
												<p class="text-xs text-(--muted) mt-1">
													{allAnswered
														? doc === t.customerUpdate
															? t.draftIncludesNotes
															: t.readyAfterReview
														: doc === t.productionSheet
															? formatMessage(t.blockedByAnswers, { count: remainingAnswers })
															: t.blockedByProductionSheet}
												</p>
											</div>
											<span aria-hidden="true" class={`text-lg transition-all duration-300 ${isUnlocked ? 'text-emerald-600 scale-110' : 'text-(--muted)'}`}>
												{#if isUnlocked}
													<i class="ri-checkbox-circle-fill animate-scale-in block" aria-hidden="true"></i>
												{:else}
													<i class="ri-lock-line" aria-hidden="true"></i>
												{/if}
											</span>
										</div>
									{/each}
								</div>
								<div class="mt-6 rounded-md border border-(--info-line) bg-(--info) p-4 text-sm leading-relaxed text-blue-900 flex gap-2">
									<i class="ri-information-line text-lg text-blue-600 shrink-0" aria-hidden="true"></i>
									<span>{t.infoNote}</span>
								</div>
							</aside>
						{/if}
					</section>
				{:else if currentStep === 3}
					<section class="px-4 py-6 md:px-8 md:py-8">
						<div class="mx-auto max-w-7xl">
							<div class="flex flex-wrap items-start justify-between gap-5 border-b border-(--line) pb-6">
								<div>
									<p class="text-sm uppercase tracking-wide text-(--muted)">
										Order #{orderId}
										<span class="ml-3 rounded border border-(--line) px-2 py-1 normal-case tracking-normal font-sans"
											>Wholesale</span
										>
										<span class="ml-3 normal-case tracking-normal">Client: {client}</span>
									</p>
									<h1 class="mt-5 font-display text-4xl leading-tight md:text-5xl">{t.sheets}</h1>
									<p class="mt-3">{t.sheetsDesc}</p>
									<p class="mt-5 inline-flex items-center gap-1.5 rounded-md border border-(--ready) bg-(--ready-bg) px-3 py-2 text-sm text-(--ready-ink) font-semibold">
										<i class="ri-checkbox-circle-line text-base" aria-hidden="true"></i>
										{t.answersComplete}
									</p>
								</div>
							</div>

							<div id="sheets-tabs" class="mt-9 flex gap-8 border-b border-(--line)">
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

							<div class={`output-grid mt-7 ${rightSidebarCollapsed ? 'output-grid-collapsed' : ''}`}>
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
											onGroupingChange={setProductionGrouping}
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
										<p class="mt-1 text-sm text-(--muted)">{t.editDraftDirectly}</p>
										<CustomerUpdateEditor
											label={t.message}
											value={customerUpdate}
											onInput={updateCustomerUpdate}
											textareaClass="mt-5 h-[420px] w-full resize-none rounded-md border border-(--line) bg-(--surface-soft) p-4 leading-7 outline-none focus:border-(--brand) focus:bg-white"
										/>
									{/if}
								</div>

								{#if !rightSidebarCollapsed}
									<aside class="output-side shadow-sm">
										<div class="mb-5 border-b border-(--line) pb-4">
											<div class="flex items-center justify-between gap-4 mb-3">
												<h2 class="font-display text-lg font-bold text-(--brand-dark)">{t.orderSummary}</h2>
												<button
													class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-(--surface-soft) text-(--muted) hover:text-(--ink) transition bg-transparent border-0 p-0 cursor-pointer"
													type="button"
													style="margin-right: -6px;"
													aria-label={t.closeRightPanel}
													onclick={() => (rightSidebarCollapsed = true)}
												>
													<i class="ri-close-line text-lg"></i>
												</button>
											</div>
											<div class="space-y-2.5 text-xs">
												<div class="flex justify-between">
													<span class="text-(--muted)">{t.lineItems}</span>
													<strong class="font-semibold">{lineItems.length}</strong>
												</div>
												<div class="flex justify-between">
													<span class="text-(--muted)">{t.totalQuantity}</span>
													<strong class="font-semibold">{totalQty}</strong>
												</div>
												<div class="flex flex-col">
													<span class="text-(--muted) mb-0.5">{t.finishes}</span>
													<strong class="font-semibold leading-normal">{finishSummary}</strong>
												</div>
												{#if activeTab === 'packing'}
													<div class="mt-3 border-t border-(--line) pt-3">
														<div class="flex justify-between items-center mb-1">
															<span class="text-(--muted)">{t.packed}</span>
															<strong class="font-bold text-emerald-700">{packedCount} / {lineItems.length}</strong>
														</div>
														<div class="h-1.5 w-full bg-(--surface-soft) rounded-full overflow-hidden border border-(--line)">
															<div class="h-full bg-emerald-600 rounded-full transition-all duration-300" style="width: {(packedCount / lineItems.length) * 100}%"></div>
														</div>
													</div>
												{/if}
											</div>
										</div>

										<div>
											<h2 class="font-display text-xs font-bold text-(--muted) uppercase tracking-wider mb-3">{t.readyNext}</h2>
											{#if activeTab === 'production'}
												<button class="side-action transition flex items-center justify-between gap-3 w-full bg-white hover:border-(--brand) text-left cursor-pointer border border-(--line) rounded-lg p-4" type="button" onclick={() => downloadCsv('production')}>
													<div>
														<strong class="block font-bold text-sm text-(--ink)">{t.downloadProductionSheet}</strong>
														<span class="block text-[10px] text-(--muted) mt-0.5">{t.csvFormat}</span>
													</div>
													<i class="ri-download-2-line text-lg text-(--brand)" aria-hidden="true"></i>
												</button>
											{:else if activeTab === 'packing'}
												<button class="side-action transition flex items-center justify-between gap-3 w-full bg-white hover:border-(--brand) text-left cursor-pointer border border-(--line) rounded-lg p-4" type="button" onclick={() => downloadCsv('packing')}>
													<div>
														<strong class="block font-bold text-sm text-(--ink)">{t.downloadPackingChecklist}</strong>
														<span class="block text-[10px] text-(--muted) mt-0.5">{t.csvFormat}</span>
													</div>
													<i class="ri-download-2-line text-lg text-(--brand)" aria-hidden="true"></i>
												</button>
											{:else}
												<button class="side-action transition flex items-center justify-between gap-3 w-full bg-white hover:border-(--brand) text-left cursor-pointer border border-(--line) rounded-lg p-4" type="button" onclick={copyCustomerUpdate}>
													<div>
														<strong class="block font-bold text-sm text-(--ink)">{t.copyUpdate}</strong>
														<span class="block text-[10px] text-(--muted) mt-0.5">{t.plainText}</span>
													</div>
													<i class="ri-file-copy-2-line text-lg text-(--brand)" aria-hidden="true"></i>
												</button>
											{/if}
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
								<p class="text-sm uppercase tracking-wide text-(--muted)">
									Order #{orderId}
									<span class="ml-3 rounded border border-(--line) px-2 py-1 normal-case tracking-normal font-sans"
										>Wholesale</span
									>
									<span class="ml-3 normal-case tracking-normal font-sans">Client: {client}</span>
								</p>
								<div class="mt-5 flex flex-wrap items-center justify-between gap-4">
									<div>
										<h1 class="font-display text-4xl leading-tight md:text-5xl">{t.customerUpdate}</h1>
										<p class="mt-3 text-lg">{t.updateDesc}</p>
									</div>
									<div class="flex items-center gap-3">
										<button class="secondary-button flex items-center justify-center gap-1.5" type="button" onclick={copyCustomerUpdate}>
											<i class="ri-file-copy-line" aria-hidden="true"></i> {t.copyUpdate}
										</button>
										<button class="secondary-button flex items-center justify-center gap-1.5" type="button" onclick={openEmailDraft}>
											<i class="ri-mail-send-line" aria-hidden="true"></i> {t.openEmailDraft}
										</button>
									</div>
								</div>

								<div id="customer-update-editor" class="mt-8">
									<CustomerUpdateEditor
										label={t.message}
										value={customerUpdate}
										onInput={updateCustomerUpdate}
										labelClass="text-sm font-semibold text-(--muted)"
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
							<span class={`status-dot border-2 flex items-center justify-center rounded-full w-9 h-9 ${remainingAnswers && currentStep === 2 ? 'status-warn border-(--warning) text-(--warning)' : 'border-(--ready-ink) text-(--ready-ink)'}`}>
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
									<p class="text-sm text-(--muted)">{t.noRealEmail}</p>
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
								<div class="continue-action">
									{#if remainingAnswers > 0}
										<span id="continue-warning" class="footer-warning-bubble" role="status">
											{t.resolveToContinue}
										</span>
									{/if}
									<button
										id="continue-to-sheets-btn"
										class="primary-button flex items-center justify-center font-bold"
										type="button"
										disabled={!allAnswered}
										aria-describedby={remainingAnswers > 0 ? 'continue-warning' : undefined}
										onclick={continueToSheets}
									>
										{t.continueToSheets} <i class="ri-arrow-right-line ml-1" aria-hidden="true"></i>
									</button>
								</div>
							{:else}
								{#if currentStep === 3}
									<button id="continue-to-update-btn" class="primary-button flex items-center justify-center font-bold" type="button" onclick={() => setStep(4)}>
										{t.continueToCustomerUpdate} <i class="ri-arrow-right-line ml-1" aria-hidden="true"></i>
									</button>
								{:else}
									<button id="mark-sent-btn" class="primary-button flex items-center justify-center gap-1.5 font-bold" type="button" onclick={markSent}>
										<i class="ri-send-plane-line" aria-hidden="true"></i> {t.markSent}
									</button>
								{/if}
							{/if}
						</div>
					</div>
				</footer>
			{/if}
			{/if}
	</AppShell>

	{#if showOriginalDrawer}
		<OriginalOrderDrawer
			{t}
			{intakeText}
			sourceDetail={`${t.sourceChannel}: ${sourceLabel(selectedSource)} ${uploadedFiles.length > 0 ? `(${t.uploaded}: ${uploadedFiles.join(', ')})` : ''}`}
			onClose={() => (showOriginalDrawer = false)}
		/>
	{/if}

	{#if toast}
		<div class="fixed bottom-28 left-1/2 -translate-x-1/2 rounded-full bg-(--ink) px-5 py-3 text-sm text-white shadow-xl animate-fade-in" aria-live="polite">
			{toast}
		</div>
	{/if}
	{#if showWelcomeModal}
		<div transition:fade={{ duration: 200 }} class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
			<!-- Modal Container -->
			<div transition:scale={{ duration: 250, start: 0.95 }} class="relative bg-white rounded-lg border border-(--line) shadow-2xl max-w-lg w-full mx-4 overflow-hidden flex flex-col max-h-[90vh]">
				<!-- Top Close button -->
				<button 
					type="button" 
					class="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-(--surface-soft) text-(--muted) hover:text-(--ink) transition border-0 cursor-pointer p-0"
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
						<div class="flex items-center justify-center w-14 h-14 rounded-xl bg-(--surface-soft) text-(--brand) shadow-sm border border-(--line) shrink-0">
							<i class="ri-sparkling-2-line text-2xl"></i>
						</div>
						
						<!-- Header Text -->
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1.5 text-[10px] text-(--muted) font-semibold">
								<span class="px-2 py-0.5 rounded bg-(--brand)/10 text-(--brand) font-semibold tracking-wide">
									What's new
								</span>
								<span>
									{t.welcomeSubtitle}
								</span>
							</div>
							<h2 class="font-display text-xl md:text-2xl tracking-tight text-(--ink) leading-snug">
								{t.welcomeHeading}
							</h2>
						</div>
					</div>

					<p class="text-sm text-(--muted) leading-relaxed">
						{t.welcomeSubheading}
					</p>

					<!-- Features list -->
					<ul class="mt-6 space-y-4">
						<li class="flex gap-3.5 items-start text-[13px] leading-relaxed text-(--ink)">
							<span class="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
								<i class="ri-check-line text-xs font-bold"></i>
							</span>
							<div>
								<strong class="font-semibold text-(--brand-dark)">{t.welcomeLabel1}</strong> · {t.welcomeFeature1}
							</div>
						</li>
						<li class="flex gap-3.5 items-start text-[13px] leading-relaxed text-(--ink)">
							<span class="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
								<i class="ri-check-line text-xs font-bold"></i>
							</span>
							<div>
								<strong class="font-semibold text-(--brand-dark)">{t.welcomeLabel2}</strong> · {t.welcomeFeature2}
							</div>
						</li>
						<li class="flex gap-3.5 items-start text-[13px] leading-relaxed text-(--ink)">
							<span class="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
								<i class="ri-check-line text-xs font-bold"></i>
							</span>
							<div>
								<strong class="font-semibold text-(--brand-dark)">{t.welcomeLabel3}</strong> · {t.welcomeFeature3}
							</div>
						</li>
						<li class="flex gap-3.5 items-start text-[13px] leading-relaxed text-(--ink)">
							<span class="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
								<i class="ri-check-line text-xs font-bold"></i>
							</span>
							<div>
								<strong class="font-semibold text-(--brand-dark)">{t.welcomeLabel4}</strong> · {t.welcomeFeature4}
							</div>
						</li>
					</ul>
				</div>

				<!-- Modal Footer -->
				<div class="border-t border-(--line) bg-(--surface-soft) p-4 flex items-center justify-between gap-3 shrink-0">
					<button 
						type="button" 
						class="text-xs text-(--muted) hover:text-(--ink) font-semibold transition cursor-pointer px-4 py-2.5 rounded hover:bg-(--surface-muted) bg-transparent border-0"
						onclick={closeWelcomeModal}
					>
						{t.skipGuide}
					</button>
					<button 
						type="button" 
						class="bg-(--brand) hover:bg-(--brand-dark) text-white text-xs font-bold py-2.5 px-6 rounded shadow transition duration-150 flex items-center gap-1.5 cursor-pointer border-0"
						onclick={handleLetsGo}
					>
						{t.letsGo} <i class="ri-arrow-right-line"></i>
					</button>
				</div>
			</div>
		</div>
	{/if}
</main>


