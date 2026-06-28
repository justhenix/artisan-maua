<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { driver } from 'driver.js';
	import 'driver.js/dist/driver.css';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
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
	import { buildBaliHandoffPdfRows, buildBaliHandoffText } from '$lib/artisan/baliHandoff';
	import { fixtureBlockers, fixtureLineItems } from '$lib/artisan/fixtures';
	import { generateCustomerUpdate } from '$lib/artisan/customerUpdate';
	import { rowsToCopyTable, rowsToCsv } from '$lib/artisan/exports';
	import { createPdfDocument, createBaliHandoffPdf } from '$lib/artisan/pdf';
	import { buildPackingRows, buildProductionRows } from '$lib/artisan/sheets';
	import { canCreateSheets, confidenceStateFor, unresolvedRequiredCount, unresolvedWarnings, allRequiredFieldsResolved } from '$lib/artisan/review';
	import type { ReviewBlocker, SheetLineItem, TableCell } from '$lib/artisan/types';
	import { createWorkbookXlsx } from '$lib/artisan/xlsx';

	let { data }: { data: any } = $props();

	type Step = 1 | 2 | 3 | 4;
	type Tab = 'production' | 'packing' | 'customer';

	type Blocker = ReviewBlocker;
	type LineItem = SheetLineItem;

	type Locale = 'en' | 'id';
	type AppMessages = typeof enMessages;

	const storageKey = 'artisan-demo-flow-v3';
	let selectedOrderId = $state('HB-259689');
	const orderId = $derived(selectedOrderId);
	let client = $state('La Jolla Artisan Boutique');

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

	const sampleOrder = `From: La Jolla Artisan Boutique buyer [redacted]
Subject: PO HB-259689 - late-summer resort delivery

Hi Heather,
Please prep this for our late-summer resort delivery.
Shipping details confirmed separately [redacted].

Item                                      Qty   Finish             Notes
---------------------------------------------------------------------------
Medium Silver Elephant Pin               12    Sterling Silver    Match approved sample card
hb1 hat stud / mini star                  24                       Buyer wrote "small starburst hat stud"
Mountain Pendant                          8                        New request, finish/material missing
Black Lip Star with Bird of Prey Dangle   6                        star bird dangle
Golden Bird of Prey Hat Stud              10    Gold               new smaller golden bird of prey

Production note for Bali:
Group sterling silver pieces for the next casting batch; hold unresolved variants until Heather confirms.

Packing note:
Pack hat studs on individual cards; pendants in cotton pouches.`;

	const samples: Record<(typeof sourceTypes)[number], string> = {
		sourceEmail: `From: La Jolla Artisan Boutique buyer [redacted]
Subject: PO HB-259689 - late-summer resort delivery

Hi Heather,
Please prep this for our late-summer resort delivery.
Shipping details confirmed separately [redacted].

Item                                      Qty   Finish             Notes
---------------------------------------------------------------------------
Medium Silver Elephant Pin               12    Sterling Silver    Match approved sample card
hb1 hat stud / mini star                  24                       Buyer wrote "small starburst hat stud"
Mountain Pendant                          8                        New request, finish/material missing
Black Lip Star with Bird of Prey Dangle   6                        star bird dangle
Golden Bird of Prey Hat Stud              10    Gold               new smaller golden bird of prey`,

		sourceDm: `La Jolla buyer [redacted channel note]
Please add 6 Black Lip Star with Bird of Prey Dangle pieces.
Buyer note says "star bird dangle" but does not specify gold or silver.
Also add 10 Golden Bird of Prey Hat Studs; buyer wrote "new smaller golden bird of prey".`,

		sourceSpreadsheet: `Item,Qty,Material/Finish,Notes
Medium Silver Elephant Pin,12,Sterling Silver,Match approved sample card
hb1 hat stud / mini star,24,,small starburst hat stud
Mountain Pendant,8,,finish/material missing
Black Lip Star with Bird of Prey Dangle,6,,star bird dangle
Golden Bird of Prey Hat Stud,10,Gold,new smaller golden bird of prey`,

		sourcePoText: `PURCHASE ORDER
LA JOLLA ARTISAN BOUTIQUE
PO Number: HB-259689
Date: June 18, 2026

Buyer and shipping details: redacted for demo

Line  Item Code      Description                  Qty  Unit Price
-----------------------------------------------------------------
1     HB-40523-SIL   Medium Silver Elephant Pin   12   $185.00
2     hb1           hat stud / mini star          24
3     new           Mountain Pendant              8
4     TBD           Star with Bird Dangle         6
5     TBD           Golden Bird of Prey Hat Stud  10`
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
		const sections: { filename: string; content: string }[] = [];
		const lines = text.split(/\r?\n/);
		let currentFilename = '';
		let currentLines: string[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line === '---' && i + 1 < lines.length && lines[i + 1].trim().toLowerCase().startsWith('source file:')) {
				if (currentLines.length > 0) {
					sections.push({
						filename: currentFilename,
						content: currentLines.join('\n')
					});
					currentLines = [];
				}
				const sourceFileLine = lines[i + 1].trim();
				currentFilename = sourceFileLine.substring(12).trim();
				i++; // Skip "Source file:"
			} else if (line.startsWith('---------------------')) {
				continue;
			} else {
				currentLines.push(lines[i]);
			}
		}
		if (currentLines.length > 0) {
			sections.push({
				filename: currentFilename,
				content: currentLines.join('\n')
			});
		}

		let allParsedItems: LineItem[] = [];

		for (const section of sections) {
			const sectionTrimmed = section.content.trim();
			if (!sectionTrimmed) continue;

			const sectionLines = sectionTrimmed.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
			if (sectionLines.length === 0) continue;

			const parsedItems: LineItem[] = [];
			const cleanField = (f: string) => f.replace(/^["']|["']$/g, '').trim();

			const firstLine = sectionLines[0];
			const isCsv = firstLine.includes(',') && sectionLines.some(l => l.includes(','));
			const isTsv = firstLine.includes('\t') && sectionLines.some(l => l.includes('\t'));

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

				const headerRow = parseRow(sectionLines[0]);
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

				for (let i = startRowIdx; i < sectionLines.length; i++) {
					if (sectionLines[i].startsWith('---') || sectionLines[i].startsWith('===') || sectionLines[i].toLowerCase().startsWith('source type:')) continue;
					const cols = parseRow(sectionLines[i]);
					if (cols.length < 2) continue;

					const itemText = cols[finalItemIdx] || '';
					if (!itemText) continue;

					const qtyText = cols[finalQtyIdx] || '1';
					const qty = parseInt(qtyText.replace(/[^\d]/g, ''), 10) || 1;

					const finish = cols[finalFinishIdx] || '';
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
						source: section.filename || (isCsv ? 'CSV row' : 'TSV row'),
						unitPrice,
						imageUrl
					});
				}
			}

			if (parsedItems.length === 0) {
				sectionLines.forEach((line) => {
					if (
						line.startsWith('From:') ||
						line.startsWith('Subject:') ||
						line.startsWith('PO#') ||
						line.startsWith('Ship to:') ||
						line.startsWith('Item ') ||
						line.startsWith('---') ||
						line.startsWith('===') ||
						line.toLowerCase().startsWith('source type:') ||
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

						let finish = '';
						const finishes = ['Silver', 'Gold', 'Vermeil', 'Brass', 'Mother of Pearl'];
						for (const f of finishes) {
							if (line.toLowerCase().includes(f.toLowerCase())) {
								finish = f === 'Vermeil' ? 'Gold Vermeil' : f;
								break;
							}
						}

						const priceMatch = line.match(/\$([\d,]+(\.\d{2})?)/);
						const unitPrice = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0;

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
							source: section.filename || 'Pasted text',
							unitPrice,
							imageUrl
						});
					}
				});
			}

			allParsedItems = [...allParsedItems, ...parsedItems];
		}

		allParsedItems.forEach((item) => {
			if (!item.styleCode) {
				const name = item.item.toLowerCase();
				const exactMatch = catalog.find(
					c => c.creativeTitle.toLowerCase() === name || c.styleCode.toLowerCase() === name
				);
				if (exactMatch) {
					item.styleCode = exactMatch.styleCode;
					item.item = exactMatch.creativeTitle;
				} else {
					// Dynamic matching fallback: find items in catalog sharing keywords
					const inputWords = name.split(/[\s,.\-_/]+/).filter(w => w.length > 2 && !['and', 'with', 'for', 'the', 'pin', 'stud', 'pendant', 'ring', 'cuff', 'chain', 'size', 'medium', 'small', 'large', 'mini', 'golden', 'silver'].includes(w));
					
					let bestMatch: CatalogItem | undefined;
					let maxMatchedWords = 0;
					
					for (const cat of catalog) {
						const catTitle = cat.creativeTitle.toLowerCase();
						const catCode = cat.styleCode.toLowerCase();
						
						let matches = 0;
						for (const word of inputWords) {
							if (catTitle.includes(word) || catCode.includes(word)) {
								matches++;
							}
						}
						
						if (matches > maxMatchedWords) {
							maxMatchedWords = matches;
							bestMatch = cat;
						}
					}
					
					if (bestMatch && maxMatchedWords > 0) {
						// Size variant matching
						let resolvedStyle = bestMatch.styleCode;
						let resolvedTitle = bestMatch.creativeTitle;
						
						if (name.includes('horse') && name.includes('pin')) {
							if (name.includes('medium')) {
								resolvedStyle = 'HB-HORSE-M';
								resolvedTitle = 'Horse Pin Medium';
							} else if (name.includes('small')) {
								resolvedStyle = 'HB-HORSE-S';
								resolvedTitle = 'Horse Pin Small';
							} else if (name.includes('large')) {
								resolvedStyle = 'HB-HORSE-L';
								resolvedTitle = 'Horse Pin Large';
							} else {
								resolvedStyle = '';
								resolvedTitle = 'Horse Pin (Size Unresolved)';
							}
						} else if (name.includes('starburst')) {
							if (name.includes('mini')) {
								resolvedStyle = 'HB-SB-MINI';
								resolvedTitle = 'Bali Starburst Mini';
							} else if (name.includes('small')) {
								resolvedStyle = 'HB-SB-SMALL';
								resolvedTitle = 'Bali Starburst Small';
							} else if (name.includes('large')) {
								resolvedStyle = 'HB-SB-LARGE';
								resolvedTitle = 'Bali Starburst Large';
							} else if (name.includes('stud')) {
								resolvedStyle = 'HB-SB-STUD';
								resolvedTitle = 'Starburst Studs';
							} else {
								resolvedStyle = '';
								resolvedTitle = 'Bali Starburst (Size Unresolved)';
							}
						} else {
							// Search for size variants in catalog
							const searchKey = bestMatch.creativeTitle.split(' ')[0].toLowerCase();
							const variants = catalog.filter(c => c.creativeTitle.toLowerCase().includes(searchKey));
							if (variants.length > 1) {
								const matchedVariant = variants.find(v => {
									const vTitle = v.creativeTitle.toLowerCase();
									return (name.includes('mini') && vTitle.includes('mini')) ||
									       (name.includes('small') && vTitle.includes('small')) ||
									       (name.includes('medium') && vTitle.includes('medium')) ||
									       (name.includes('large') && vTitle.includes('large'));
								});
								if (matchedVariant) {
									resolvedStyle = matchedVariant.styleCode;
									resolvedTitle = matchedVariant.creativeTitle;
								}
							}
						}
						
						item.styleCode = resolvedStyle;
						item.item = resolvedTitle;
					}
				}
			}
			if (item.styleCode && !catalog.some((entry) => entry.styleCode === item.styleCode)) {
				item.styleCode = '';
			}
			const warnings = unresolvedWarnings(item);
			item.unresolvedFields = warnings;
			item.confidenceState = warnings.length > 0 ? 'unresolved' : 'resolved';
		});

		return allParsedItems;
	}

	function loadSampleType(source: (typeof sourceTypes)[number]) {
		selectedSource = source;
		intakeText = samples[source];
		uploadedFiles = [];
		uploadedFileObjects = [];
		sampleUsed = true;
		client = 'La Jolla Artisan Boutique';
		selectedOrderId = 'HB-259689';
		resetDemoState();
		markAutoSaved();
		showToast(t.sampleOrderLoaded);
	}

	function removeUploadedFile(index: number) {
		uploadedFiles = uploadedFiles.filter((_, i) => i !== index);
		uploadedFileObjects = uploadedFileObjects.filter((_, i) => i !== index);
		sampleUsed = false;
		clearExtractionState('');
		markAutoSaved();
	}

	const catalog = $derived<CatalogItem[]>(
		data.catalogItems && data.catalogItems.length > 0 ? data.catalogItems : fallbackCatalog
	);

	const initialBlockers = (): Blocker[] => fixtureBlockers();

	const initialLineItems = (): LineItem[] => fixtureLineItems();

	const initialCustomerUpdate = generateCustomerUpdate({
		client: 'La Jolla Artisan Boutique',
		lineItems: fixtureLineItems(),
		unresolvedCount: fixtureBlockers().length
	});

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
			
			// Load from URL or default selected order
			const urlOrderId = page.url.searchParams.get('orderId');
			const targetOrderId = urlOrderId && data.orders.some((o: any) => o.id === urlOrderId) ? urlOrderId : selectedOrderId;
			const defaultOrder = data.orders.find((o: any) => o.id === targetOrderId) || data.orders[0];
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

				// Override step from URL if present
				const urlStep = page.url.searchParams.get('step');
				if (urlStep) {
					const s = parseInt(urlStep, 10);
					if (s >= 1 && s <= 4) {
						currentStep = s as Step;
					}
				}
			}
			
			dbLoaded = true;
		}
	});

	$effect(() => {
		if (!browser) return;
		if (!dbLoaded) return;
		
		const url = new URL(window.location.href);
		if (url.searchParams.get('step') !== String(currentStep) || url.searchParams.get('orderId') !== selectedOrderId) {
			url.searchParams.set('step', String(currentStep));
			url.searchParams.set('orderId', selectedOrderId);
			goto(url.pathname + url.search, { replaceState: true, noScroll: true, keepFocus: true });
		}
	});

	// New States
	let uploadedFiles = $state<string[]>([]);
	let uploadedFileObjects = $state<File[]>([]);
	let showOriginalDrawer = $state(false);
	let productionGrouping = $state<'material' | 'category'>('material'); // Production group toggle
	let packedItems = $state<Record<string, boolean>>({}); // Checkbox state for Packing checklist
	let completedSteps = $state<number>(1);
	let rightSidebarCollapsed = $state(false);
	let sampleUsed = $state(false);
	let processClicked = $state(false);
	let isProcessing = $state(false);
	let isDragging = $state(false);
	let readyItemsExpanded = $state(false);
	let handoffCreated = $state(false);
	let handoffShared = $state(false);
	let extractionNotice = $state('');
	const step1_item1 = $derived(intakeText.trim().length > 0 || uploadedFiles.length > 0);
	const step1_item2 = $derived(sampleUsed);
	const step1_item3 = $derived(processClicked);

	$effect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			const target = event.target as HTMLElement;
			if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
				return;
			}
			
			const isAltR = event.altKey && (event.key === 'r' || event.key === 'R');
			if (event.key === ']' || isAltR) {
				event.preventDefault();
				if (activeView === 'workbench') {
					rightSidebarCollapsed = !rightSidebarCollapsed;
				}
			}
		}
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	const maxUploadBytes = 8 * 1024 * 1024;
	const allowedUploadExtensions = new Set(['pdf', 'csv', 'txt']);
	const allowedUploadTypes = new Set([
		'application/pdf',
		'text/csv',
		'text/plain'
	]);

	function isAllowedUpload(file: File) {
		const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
		return (
			file.size > 0 &&
			file.size <= maxUploadBytes &&
			allowedUploadExtensions.has(extension) &&
			(!file.type || allowedUploadTypes.has(file.type))
		);
	}

	function acceptedUploadFiles(files: File[]) {
		const accepted = files.filter(isAllowedUpload);
		if (accepted.length !== files.length) {
			showToast(t.uploadRejected || 'Some files were rejected by type or size');
		}
		return accepted;
	}

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
	const remainingAnswers = $derived(unresolvedRequiredCount(blockers));
	const allAnswered = $derived(canCreateSheets(blockers));
	const canContinueToSheets = $derived(lineItems.length > 0 && allAnswered);
	const allRequiredResolved = $derived(lineItems.length > 0 && allRequiredFieldsResolved(lineItems, blockers));
	const handoffReady = $derived(allRequiredResolved);

	const prodProgress = $derived(lineItems.length === 0 ? 0 : blockers.length === 0 ? 100 : (blockers.filter(b => b.answer).length / blockers.length) * 100);
	const packingProgress = $derived(canContinueToSheets ? 100 : 0);
	const customerProgress = $derived(canContinueToSheets ? 100 : 0);

	const readyItems = $derived(
		lineItems.filter(item => {
			if (item.id === 'star-dangle-unclear') {
				const b = blockers.find(x => x.id === 'star-bird-finish');
				return b && b.answer !== '';
			}
			if (item.id === 'bird-unclear') {
				const b = blockers.find(x => x.id === 'bird-of-prey-size');
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
	const baliHandoffText = $derived(
		buildBaliHandoffText({
			orderId,
			client,
			items: lineItems,
			blockers,
			packedItems,
			sourceText: intakeText,
			getTechnicalInstructions: technicalInstructionsFor,
			getPackagingSpecifics,
			isBackordered
		})
	);

	const reviewOrders = $derived(orders.filter(o => o.status === 'Review').length);
	const productionOrders = $derived(orders.filter(o => o.status === 'Production' || o.status === 'Packing').length);
	const completedOrders = $derived(orders.filter(o => o.status === 'Completed').length);

	const maxStep = $derived(canContinueToSheets ? Math.max(completedSteps, 3) as Step : completedSteps as Step);

	function hasRequiredRowBlocker(item: LineItem) {
		const warnings = unresolvedWarnings(item);
		return (
			warnings.includes('style code') ||
			warnings.includes('quantity') ||
			warnings.includes('finish/material') ||
			warnings.includes('material/finish') ||
			warnings.includes('finish')
		);
	}

	// Display-only workflow status — reflects current UI step + actual readiness
	const displayWorkflowStatus = $derived(
		sent
			? 'Completed'
			: !allRequiredResolved
				? 'Review required'
				: currentStep === 4
					? 'Customer update ready'
					: currentStep === 3
						? (handoffCreated || handoffShared ? 'Bali handoff ready' : 'Sheets ready')
						: 'Sheets ready'
	);

	const blockingLineCount = $derived(
		lineItems.filter((item) => hasRequiredRowBlocker(item)).length
	);
	const blockingItemsList = $derived(
		lineItems
			.filter((item) => hasRequiredRowBlocker(item))
			.map((item) => {
				const warnings = unresolvedWarnings(item);
				const fields = [
					warnings.includes('style code') ? 'style code' : '',
					warnings.includes('quantity') ? 'quantity' : '',
					(warnings.includes('finish/material') || warnings.includes('material/finish') || warnings.includes('finish')) ? 'material/finish' : ''
				].filter(Boolean);
				return `${item.item} (${fields.join(', ')})`;
			})
	);

	// Order progress checklist states
	const progressOrderReviewed = $derived(currentStep >= 3 || allAnswered);
	const progressProductionSheet = $derived(currentStep >= 3 && allRequiredResolved);
	const progressPackingChecklist = $derived(currentStep >= 3 && allRequiredResolved && (activeTab === 'packing' || packedCount > 0));
	const progressBaliHandoff = $derived(allRequiredResolved && handoffCreated && handoffShared);
	const progressQualityCheck = $derived(milestones.qualityChecked);
	const progressPackingComplete = $derived(packedCount > 0 && packedCount >= lineItems.length);
	const progressCustomerUpdate = $derived(sent);

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
				sampleUsed = parsed.sampleUsed ?? false;
				processClicked = parsed.processClicked ?? false;
				handoffCreated = parsed.handoffCreated ?? false;
				handoffShared = parsed.handoffShared ?? false;
				extractionNotice = parsed.extractionNotice ?? '';
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
				sampleUsed,
				processClicked,
				handoffCreated,
				handoffShared,
				extractionNotice
			})
		);
	});

	function getOptionDetail(blockerId: string, option: string): string {
		if (blockerId === 'bird-of-prey-size') {
			if (option === 'Mini') return t.birdOfPreyMiniDetail;
			if (option === 'Medium') return t.birdOfPreyMediumDetail;
		}
		if (blockerId === 'star-bird-finish') {
			if (option === 'Golden') return t.starBirdGoldenDetail;
			if (option === 'Recycled Sterling Silver') return t.starBirdSilverDetail;
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
		extractionNotice = '';
		sent = false;
		sheetDirty = false;
		activeTab = 'production';
		customerUpdate = initialCustomerUpdate;
		showOriginalDrawer = false;
		packedItems = {};
		readyItemsExpanded = false;
		handoffCreated = false;
		handoffShared = false;
	}

	function clearExtractionState(notice = '') {
		blockers = [];
		lineItems = [];
		extractionNotice = notice;
		sent = false;
		sheetDirty = false;
		activeTab = 'production';
		customerUpdate = '';
		showOriginalDrawer = false;
		packedItems = {};
		readyItemsExpanded = false;
		handoffCreated = false;
		handoffShared = false;
	}

	function fallbackItemEvidence(item: LineItem) {
		return `${item.item} ${item.notes} ${item.source}`.toLowerCase();
	}

	function fallbackBlockersForItems(items: LineItem[]): Blocker[] {
		const nextBlockers: Blocker[] = [];
		for (const item of items) {
			const evidence = fallbackItemEvidence(item);
			if ((evidence.includes('hb1') && evidence.includes('hat stud')) || evidence.includes('mini star') || evidence.includes('small starburst hat stud')) {
				nextBlockers.push({
					id: `${item.id}-exact-style`,
					impact: 'High impact',
					impactKey: 'highImpact',
					question: 'Which exact hat stud / mini star style should Bali make?',
					evidence: 'buyer wrote "small starburst hat stud" - exact hat stud variant unclear',
					source: evidence.includes('small starburst hat stud') ? 'Buyer note' : 'Extracted line item',
					risk: 'Hat stud variants can use different carving templates, sizes, finishes, and packing requirements.',
					options: ['Type exact style'],
					answer: '',
					required: true,
					field: 'style code',
					itemId: item.id
				});
			}
			if (evidence.includes('mountain pendant') || (evidence.includes('mountain') && evidence.includes('new'))) {
				nextBlockers.push({
					id: `${item.id}-finish-material`,
					impact: 'High impact',
					impactKey: 'highImpact',
					question: 'What finish/material should Bali use for Mountain Pendant?',
					evidence: 'handwritten note says "new mountain" but no style code or finish',
					source: 'Extracted line item',
					risk: 'Mountain Pendant cannot be production-ready without source-backed material or finish.',
					options: ['Type material/finish'],
					answer: '',
					required: true,
					field: 'finish/material',
					itemId: item.id
				});
			}
		}
		return nextBlockers;
	}

	function useSampleOrder() {
		intakeText = samples[selectedSource];
		uploadedFiles = [];
		uploadedFileObjects = [];
		sampleUsed = true;
		client = 'La Jolla Artisan Boutique';
		selectedOrderId = 'HB-259689';
		resetDemoState();
		markAutoSaved();
		showToast(t.sampleOrderLoaded);
	}

	function handleFileUpload(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const files = acceptedUploadFiles(Array.from(target.files));
			if (files.length === 0) return;
			uploadedFiles = [...uploadedFiles, ...files.map(f => f.name)];
			uploadedFileObjects = [...uploadedFileObjects, ...files];
			sampleUsed = false;
			clearExtractionState('');
			markAutoSaved();
			showToast(`${files.length} ${t.fileUploaded}`);
		}
	}

	function handleComposerPaste(event: ClipboardEvent) {
		const files = acceptedUploadFiles(
			Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith('image/'))
		);
		if (files.length === 0) return;

		event.preventDefault();
		const imageNames = files.map((file, index) => {
			const extension = file.type.split('/')[1] || 'png';
			return file.name || `Clipboard image ${uploadedFiles.length + index + 1}.${extension}`;
		});
		uploadedFiles = [...uploadedFiles, ...imageNames];
		sampleUsed = false;
		clearExtractionState('Image/PDF extraction needs live AI/OCR. Paste the PO text or use sample order. Uploaded file kept as source metadata.');
		markAutoSaved();
		showToast(`${files.length} ${t.clipboardImageAttached}`);
	}

	function handleFileDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
			const files = acceptedUploadFiles(Array.from(event.dataTransfer.files));
			if (files.length === 0) return;
			uploadedFiles = [...uploadedFiles, ...files.map(f => f.name)];
			uploadedFileObjects = [...uploadedFileObjects, ...files];
			sampleUsed = false;
			clearExtractionState('');
			markAutoSaved();
			showToast(`${files.length} ${t.fileUploaded}`);
		}
	}
	function isShortOrDoIt(text: string): boolean {
		const trimmed = text.trim().toLowerCase().replace(/[.,!]/g, '');
		return (
			trimmed === 'do it' ||
			trimmed === 'doit' ||
			trimmed === 'process' ||
			trimmed === 'go' ||
			trimmed === 'extract' ||
			trimmed.length < 10
		);
	}

	async function processOrder() {
		if (!intakeText.trim() && uploadedFiles.length === 0) {
			return;
		}
		processClicked = true;

		const isDefaultSample = Object.values(samples).some(s => s.trim() === intakeText.trim()) && !uploadedFiles.length;

		if (!isDefaultSample) {
			client = 'Unresolved';
			selectedOrderId = 'Unresolved';
			clearExtractionState('');

			// Read text contents from txt and csv files on the client side
			let combinedText = '';
			let fileContents = '';
			let hasTxtOrCsvOrPdf = false;
			let hasPdf = false;

			for (const file of uploadedFileObjects) {
				const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
				if (['txt', 'csv'].includes(extension)) {
					hasTxtOrCsvOrPdf = true;
					const content = await file.text();
					fileContents += `\n---\nSource file: ${file.name}\nSource type: ${file.type || extension}\n${content}\n------------------------------------------------------\n`;
				} else if (extension === 'pdf') {
					hasTxtOrCsvOrPdf = true;
					hasPdf = true;
				}
			}

			const trimmedText = intakeText.trim();
			if (hasTxtOrCsvOrPdf && fileContents) {
				if (trimmedText && !isShortOrDoIt(trimmedText)) {
					combinedText = trimmedText + '\n' + fileContents;
				} else {
					combinedText = fileContents.trim();
				}
			} else {
				combinedText = trimmedText;
			}

			isProcessing = true;
			let apiSuccess = false;
			try {
				const formData = new FormData();
				formData.append('text', intakeText);
				formData.append('client', client);
				formData.append('sourceChannel', selectedSource);
				for (const file of uploadedFileObjects) {
					formData.append('files', file);
				}

				const res = await fetch('/api/process-order', {
					method: 'POST',
					body: formData
				});
				const data = await res.json();
				if (data.success) {
					lineItems = Array.isArray(data.lineItems) ? data.lineItems : [];
					blockers = Array.isArray(data.blockers) ? data.blockers.map((b: any) => ({
						id: b.id,
						impact: b.impact || 'Medium impact',
						impactKey: b.impact === 'High impact' ? 'highImpact' : 'mediumImpact',
						question: b.question,
						questionKey: b.questionKey,
						evidence: b.evidence || '',
						source: b.source || 'Source',
						risk: b.risk || '',
						riskKey: b.riskKey,
						options: b.options || [],
						answer: b.answer || '',
						required: b.required ?? true,
						field: b.field,
						itemId: b.itemId
					})) : [];
					if (data.client && data.client !== 'Unresolved') client = data.client;
					if (data.poNumber) selectedOrderId = data.poNumber;
					if (data.combinedText) intakeText = data.combinedText;
					extractionNotice = data.helperMessage || (lineItems.length === 0 ? 'Artisan could not read line items from this source. Paste the PO text or use the sample order for the demo.' : '');
					customerUpdate = generateCustomerUpdate({
						client: client || 'Unresolved',
						lineItems,
						unresolvedCount: unresolvedRequiredCount(blockers)
					});
					apiSuccess = true;
				}
			} catch (err) {
				console.warn('Order processing API fell back to local heuristics:', err);
			} finally {
				isProcessing = false;
			}

			if (!apiSuccess) {
				// Fallback client-side PDF scan warning
				if (hasPdf && !fileContents && (!trimmedText || isShortOrDoIt(trimmedText))) {
					extractionNotice = 'This file does not contain readable text. Upload a text-based PDF/CSV/TXT or paste the PO text.';
					lineItems = [];
					blockers = [];
				} else {
					const parsed = parseMessyInput(combinedText);
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
						blockers = fallbackBlockersForItems(parsed);
						if (combinedText) intakeText = combinedText;
						customerUpdate = generateCustomerUpdate({
							client: client || 'Unresolved',
							lineItems: parsed,
							unresolvedCount: unresolvedRequiredCount(blockers)
						});
					} else {
						extractionNotice = 'Artisan could not read line items from this source. Paste the PO text or use the sample order for the demo.';
					}
				}
			}
		} else {
			client = 'La Jolla Artisan Boutique';
			selectedOrderId = 'HB-259689';
			resetDemoState();
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
		if (blockerId === 'bird-of-prey-size') {
			const bird = lineItems.find((item) => item.id === 'bird-unclear');
			if (bird) {
				bird.item = answer === 'Mini' ? 'Mini Golden Bird of Prey Hat Stud' : 'Medium Golden Bird of Prey Hat Stud';
				bird.styleCode = answer === 'Mini' ? 'HB-HB1237GP' : 'HB-HB1239-GP';
				bird.notes = `${t.resolvedSize}: ${answer}`;
				bird.finish = 'Gold Vermeil';
				bird.unitPrice = 0;
				bird.confidenceState = 'resolved';
				bird.unresolvedFields = [];
				bird.imageUrl = answer === 'Mini' 
					? 'https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-09-27at2.37.29PM.png?v=1664311054'
					: 'https://cdn.shopify.com/s/files/1/0277/4286/3462/files/Screenshot2025-12-09at12.22.01AM.png?v=1765261804';
			}
		}
		if (blockerId === 'star-bird-finish') {
			const starBird = lineItems.find((item) => item.id === 'star-dangle-unclear');
			if (starBird) {
				starBird.item = answer === 'Golden' ? 'Black Lip Star with Bird of Prey Dangle - Golden' : 'Black Lip Star with Bird of Prey Dangle - Recycled Sterling Silver';
				starBird.styleCode = answer === 'Golden' ? 'HB-P41239-GP' : 'HB-P41238-SIL';
				starBird.notes = `Resolved finish: ${answer}`;
				starBird.finish = answer === 'Golden' ? 'Gold Vermeil' : 'Silver';
				starBird.unitPrice = 0;
				starBird.confidenceState = 'resolved';
				starBird.unresolvedFields = [];
				starBird.imageUrl = answer === 'Golden'
					? 'https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-09-28at3.35.10PM.png?v=1664400928'
					: 'https://cdn.shopify.com/s/files/1/0277/4286/3462/products/ScreenShot2022-09-28at3.38.04PM.png?v=1664401090';
			}
		}
		customerUpdate = generateCustomerUpdate({
			client,
			lineItems,
			unresolvedCount: unresolvedRequiredCount(blockers)
		});
		handoffShared = false;
		markAutoSaved();
	}

	function continueToSheets() {
		if (!canContinueToSheets) return;
		setStep(3);
		activeTab = 'production';
	}

	function continueToCustomerUpdate() {
		if (!allRequiredResolved) {
			showToast(t.reviewNeededHelp || 'Resolve required production fields first.');
			return;
		}
		setStep(4);
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
		return cat ? (cat.department === 'Hat Jewelry') : false;
	}));
	const traditionalProduction = $derived(lineItems.filter(x => {
		const cat = catalog.find(c => c.styleCode === x.styleCode);
		return cat ? cat.department === 'Body Jewelry' : true;
	}));
	const otherCatProduction = $derived(lineItems.filter(x => {
		const cat = catalog.find(c => c.styleCode === x.styleCode);
		return cat ? cat.department === 'Others' : false;
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
		} catch {
			console.error('Failed to sync to database.');
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
		uploadedFileObjects = [];
		orderStatus = order.status;
		milestones = order.milestones || { moldsChecked: false, silverCast: false, qualityChecked: false, readyForShipping: false };
		
		lineItems = data.allItems.filter((item: any) => item.poId === selectedOrderId);
		blockers = data.allBlockers.filter((bl: any) => bl.poId === selectedOrderId);
		handoffCreated = false;
		handoffShared = false;
		
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
			clientName: 'Unresolved',
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
		uploadedFileObjects = [];
		orderStatus = 'Review';
		milestones = { moldsChecked: false, silverCast: false, qualityChecked: false, readyForShipping: false };
		lineItems = [];
		blockers = [];
		handoffCreated = false;
		handoffShared = false;
		
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

	function updateLineItem(id: string, field: 'styleCode' | 'qty' | 'finish' | 'notes' | 'unitPrice', value: string | number) {
		const item = lineItems.find((entry) => entry.id === id);
		if (!item) return;
		if (field === 'qty') {
			item.qty = Number(value) || 0;
		} else if (field === 'unitPrice') {
			item.unitPrice = Number(value) || 0;
		} else {
			item[field] = String(value);
		}
		const warnings = unresolvedWarnings(item);
		item.unresolvedFields = warnings;
		item.confidenceState = warnings.length > 0 ? 'unresolved' : item.confidenceState === 'needs_review' ? 'needs_review' : 'resolved';
		handoffShared = false;
		markDirty();
		markAutoSaved();
	}

	function setPackedItem(id: string, checked: boolean) {
		packedItems = { ...packedItems, [id]: checked };
		handoffShared = false;
		markDirty();
		markAutoSaved();
	}

	function updateIntakeText(value: string) {
		intakeText = value;
		sampleUsed = Object.values(samples).some(s => s.trim() === value.trim());
		if (!sampleUsed) extractionNotice = '';
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

	function sheetLabels() {
		return {
			item: t.item,
			styleCode: t.styleCode,
			qty: t.qty,
			materialFinish: t.materialFinish,
			confidence: t.confidence || 'Status',
			unresolvedWarnings: t.unresolvedWarnings || 'Unresolved warnings',
			sourceEvidence: t.sourceEvidence,
			technicalInstructions: t.technicalInstructions,
			orderNotes: t.orderNotes || 'Notes',
			packed: t.packed,
			packagingSpecifics: t.packagingSpecifics,
			fulfillmentFlags: t.fulfillmentFlags,
			pendingResolution: t.pendingResolution,
			directShip: t.directShip,
			backorder: t.backorder,
			splitShipAfterCasting: t.splitShipAfterCasting,
			resolved: t.resolved || 'Ready',
			needsReview: t.needsReview || 'Check note',
			unresolved: t.unresolved || 'Needs answer'
		};
	}

	function technicalInstructionsFor(item: LineItem) {
		if (!item.styleCode) return t.pendingResolution;
		const cat = catalog.find((entry) => entry.styleCode === item.styleCode);
		if (!cat) return t.noInstructionsMapped;
		return `${cat.notes_en} / ${cat.notes_id}`;
	}

	function productionRows(): TableCell[][] {
		return buildProductionRows({
			items: lineItems,
			blockers,
			labels: sheetLabels(),
			getTechnicalInstructions: technicalInstructionsFor
		});
	}

	function packingRows(): TableCell[][] {
		return buildPackingRows({
			items: lineItems,
			blockers,
			packedItems,
			labels: sheetLabels(),
			getPackagingSpecifics,
			isBackordered
		});
	}

	function downloadBlob(bytes: BlobPart[], type: string, filename: string) {
		const blob = new Blob(bytes, { type });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
		exportOpen = false;
	}

	function exportBaseName(kind: 'production' | 'packing') {
		return `${orderId}-${kind === 'production' ? 'production-sheet' : 'packing-checklist'}`;
	}

	function createBaliHandoff() {
		if (!handoffReady) {
			showToast(t.reviewNeededHelp || t.resolveToContinue);
			return;
		}
		handoffCreated = true;
		handoffShared = false;
		markAutoSaved();
		showToast(t.baliHandoffCreated || 'Bali handoff created');
	}

	async function copyBaliHandoff() {
		if (!handoffCreated) return;
		await navigator.clipboard.writeText(baliHandoffText);
		showToast(t.baliHandoffCopied || 'Bali handoff copied');
	}

	function downloadBaliHandoffPdf() {
		if (!handoffCreated) return;
		const bytes = createBaliHandoffPdf({
			orderId,
			client,
			items: lineItems,
			blockers,
			packedItems,
			sourceText: intakeText,
			getTechnicalInstructions: technicalInstructionsFor,
			getPackagingSpecifics,
			isBackordered
		});
		downloadBlob([bytes], 'application/pdf', `${orderId}-bali-handoff.pdf`);
		showToast(t.baliHandoffPdfDownloaded || 'Bali handoff PDF downloaded');
	}

	function markBaliHandoffShared() {
		if (!allRequiredResolved || !handoffCreated) return;
		handoffShared = true;
		markAutoSaved();
		showToast(t.baliHandoffShared || 'Bali handoff marked as shared');
	}

	function downloadCsv(kind: 'production' | 'packing') {
		const rows = kind === 'production' ? productionRows() : packingRows();
		downloadBlob([rowsToCsv(rows)], 'text/csv;charset=utf-8', `${exportBaseName(kind)}.csv`);
		showToast(kind === 'production' ? t.productionCsvDownloaded : t.packingCsvDownloaded);
	}

	function downloadXlsx(kind: 'production' | 'packing') {
		const rows = kind === 'production' ? productionRows() : packingRows();
		const bytes = createWorkbookXlsx(rows, kind === 'production' ? t.productionSheet : t.packingChecklist);
		downloadBlob(
			[bytes],
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			`${exportBaseName(kind)}.xlsx`
		);
		showToast(kind === 'production' ? t.productionXlsxDownloaded : t.packingXlsxDownloaded);
	}

	function downloadPdf(kind: 'production' | 'packing') {
		const rows = kind === 'production' ? productionRows() : packingRows();
		const title = `${kind === 'production' ? t.productionSheet : t.packingChecklist} - ${orderId}`;
		const bytes = createPdfDocument(title, rows);
		downloadBlob([bytes], 'application/pdf', `${exportBaseName(kind)}.pdf`);
		showToast(kind === 'production' ? t.productionPdfDownloaded : t.packingPdfDownloaded);
	}

	async function copyTable() {
		const rows = activeTab === 'packing' ? packingRows() : productionRows();
		await navigator.clipboard.writeText(rowsToCopyTable(rows));
		exportOpen = false;
		showToast(t.tableCopied);
	}

	async function copyCustomerUpdate() {
		await navigator.clipboard.writeText(customerUpdate);
		showToast(t.customerUpdateCopied);
	}

	function openEmailClient() {
		const subject = encodeURIComponent(`Update on Heather Benjamin Jewelry Order - PO ${orderId}`);
		const body = encodeURIComponent(customerUpdate);
		window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
		showToast(t.emailDraftOpened);
	}

	function saveCustomerDraft() {
		markDirty();
		markAutoSaved();
		showToast(t.draftSaved || 'Draft saved');
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
		rightSidebarCollapsed = false;
		setStep(1);
		resetDemoState();
		intakeText = samples.sourceEmail;
		selectedSource = 'sourceEmail';

		waitForElement('#sidebar-logo', () => {
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
							align: 'start',
							onNextClick: () => {
								activeView = 'workbench';
								waitForElement('#intake-scratchpad', () => {
									d.moveNext();
								});
							}
						} 
					},
					{ 
						element: '#intake-scratchpad', 
						popover: { 
							title: t.tourIntakeTitle,
							description: t.tourIntakeDesc,
							side: 'bottom',
							onPrevClick: () => {
								activeView = 'dashboard';
								waitForElement('#sidebar-logo', () => {
									d.movePrevious();
								});
							}
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
								chooseAnswer('star-bird-finish', 'Golden');
								chooseAnswer('bird-of-prey-size', 'Medium');
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
								rightSidebarCollapsed = false;
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
								const el = document.getElementById('export-dropdown-btn');
								if (el) el.scrollIntoView({ block: 'nearest' });
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
								const el = document.getElementById('continue-to-update-btn');
								if (el) el.scrollIntoView({ block: 'nearest' });
								d.moveNext();
							},
							onPrevClick: () => {
								const el = document.getElementById('sheets-tabs');
								if (el) el.scrollIntoView({ block: 'nearest' });
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
								rightSidebarCollapsed = false;
								const el = document.getElementById('export-dropdown-btn');
								if (el) el.scrollIntoView({ block: 'nearest' });
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

	function startDashboardTour() {
		activeView = 'dashboard';
		waitForElement('#metric-needs-review', () => {
			const d = driver({
				animate: true,
				showProgress: true,
				allowClose: true,
				nextBtnText: t.tourNext,
				prevBtnText: t.tourBack,
				doneBtnText: t.tourDone,
				steps: [
					{
						element: '#sidebar-logo',
						popover: {
							title: 'Dashboard Overview',
							description: 'Welcome to Artisan - order intake, blocker review, sheets, and customer updates.',
							side: 'right',
							align: 'start'
						}
					},
					{
						element: '#metric-needs-review',
						popover: {
							title: 'Needs Review',
							description: 'Orders awaiting blocker resolution. Each card flags missing sizes, finishes, or variants that need answers before production.',
							side: 'bottom',
							align: 'start'
						}
					},
					{
						element: '#metric-in-progress',
						popover: {
							title: 'In Progress',
							description: 'Orders in active Bali production. Track molds, casting, QC, and shipping milestones per order.',
							side: 'bottom',
							align: 'start'
						}
					},
					{
						element: '#metric-completed',
						popover: {
							title: 'Completed',
							description: 'Finished orders ready for customer handoff or archived for historical reference.',
							side: 'bottom',
							align: 'start'
						}
					},
					{
						element: '#kanban-review',
						popover: {
							title: 'Review Required',
							description: 'New orders land here. Each card shows the client name, last update date, and milestone progress at a glance.',
							side: 'bottom',
							align: 'start'
						}
					},
					{
						element: '#kanban-production',
						popover: {
							title: 'In Production',
							description: 'Orders being fabricated at the Bali studio. Milestone bar tracks progress through casting, QC, and final packing.',
							side: 'bottom',
							align: 'start'
						}
					},
					{
						element: '#kanban-packing',
						popover: {
							title: 'Fulfillment / Packing',
							description: 'Orders in the final packing stage. Verify packaging specifics and fulfillment flags before shipping.',
							side: 'bottom',
							align: 'start'
						}
					},
					{
						element: '#kanban-completed',
						popover: {
							title: 'Completed / Shipped',
							description: 'Shipped orders ready for customer updates and archival.',
							side: 'bottom',
							align: 'start'
						}
					},
					{
						element: '#new-purchase-order-btn',
						popover: {
							title: 'New Purchase Order',
							description: 'Intake a new wholesale order by pasting PO text, email, DM, spreadsheet rows, or order documents. Artisan extracts items and flags unclear production details.',
							side: 'left',
							align: 'start'
						}
					}
				]
			});
			d.drive();
		});
	}

	function handleReplayTour() {
		if (activeView === 'dashboard') {
			startDashboardTour();
		} else {
			startTour();
		}
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
	<title>Artisan</title>
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
		headerRightSidebarCollapsed={activeView === 'workbench' ? rightSidebarCollapsed : undefined}
		headerOnToggleRightSidebar={activeView === 'workbench' ? () => (rightSidebarCollapsed = !rightSidebarCollapsed) : undefined}
		onReplayTour={handleReplayTour}
		onClickLogo={() => (activeView = 'dashboard')}
		{activeView}
		onClickDashboard={() => (activeView = 'dashboard')}
		onClickWorkbench={() => {
			activeView = 'workbench';
			if (lineItems.length === 0) {
				currentStep = 1;
			} else {
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
			}
		}}
		mainClass={`${activeView === 'dashboard' ? 'app-main-dashboard' : ''} ${activeView === 'workbench' ? 'app-main-workbench-status' : ''}`}
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
								id="new-purchase-order-btn"
								onclick={createNewOrder}
								class="flex items-center gap-2 px-4 py-2.5 rounded bg-(--brand) text-white hover:bg-(--brand-dark) text-sm font-semibold transition cursor-pointer border-0 shadow-sm"
							>
								<i class="ri-add-line text-base"></i>
								{t.newPurchaseOrder}
							</button>
						</div>

						<!-- Summary Stats Cards -->
						<div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
							<div id="metric-needs-review" class="rounded-lg border border-(--line) bg-white p-4 shadow-sm">
								<p class="text-xs font-semibold text-(--muted) uppercase tracking-wider">{t.needsReview}</p>
								<div class="mt-3 flex items-end justify-between gap-4">
									<strong class="font-display text-3xl leading-none">{reviewOrders}</strong>
									<span class="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">{t.blockerFirst}</span>
								</div>
							</div>
							<div id="metric-in-progress" class="rounded-lg border border-(--line) bg-white p-4 shadow-sm">
								<p class="text-xs font-semibold text-(--muted) uppercase tracking-wider">{t.inProgress}</p>
								<div class="mt-3 flex items-end justify-between gap-4">
									<strong class="font-display text-3xl leading-none">{productionOrders}</strong>
									<span class="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800">{t.baliTasks}</span>
								</div>
							</div>
							<div id="metric-completed" class="rounded-lg border border-(--line) bg-white p-4 shadow-sm">
								<p class="text-xs font-semibold text-(--muted) uppercase tracking-wider">{t.completed}</p>
								<div class="mt-3 flex items-end justify-between gap-4">
									<strong class="font-display text-3xl leading-none">{completedOrders}</strong>
									<span class="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">{t.readyHistory}</span>
								</div>
							</div>
						</div>

						<!-- Kanban Grid -->
						<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
							{#each ['Review', 'Production', 'Packing', 'Completed'] as colStatus (colStatus)}
								<div id="kanban-{colStatus.toLowerCase()}" class="flex flex-col bg-(--surface-soft) rounded-lg p-4 border border-(--line) min-h-100">
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
						<div class="flex items-center gap-1.5">
							<div class="relative group flex items-center">
								<span class="text-(--muted) hover:text-(--ink) transition cursor-pointer flex items-center justify-center" aria-label="Workflow help">
									<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
										<circle cx="12" cy="12" r="10"></circle>
										<line x1="12" y1="16" x2="12" y2="12"></line>
										<line x1="12" y1="8" x2="12.01" y2="8"></line>
									</svg>
								</span>
								<div class="absolute left-1/2 -translate-x-1/2 top-6 bg-(--surface-muted) text-(--ink) text-[10px] font-semibold px-2.5 py-1.5 rounded shadow border border-(--line) w-64 leading-normal z-50 hidden group-hover:block whitespace-normal">
									{t.workflowHelp}
								</div>
							</div>
							<span class="text-xs uppercase tracking-wider font-semibold text-(--muted)">{t.workflow}:</span>
						</div>
						<span class={`rounded border px-2.5 py-1 text-xs font-semibold ${
							displayWorkflowStatus === 'Review required'
								? 'border-amber-300 bg-amber-50 text-amber-900'
								: displayWorkflowStatus === 'Sheets ready'
									? 'border-blue-200 bg-blue-50 text-blue-800'
									: displayWorkflowStatus === 'Bali handoff ready'
										? 'border-indigo-200 bg-indigo-50 text-indigo-800'
										: displayWorkflowStatus === 'Customer update ready'
											? 'border-emerald-200 bg-emerald-50 text-emerald-800'
											: displayWorkflowStatus === 'Completed'
												? 'border-gray-300 bg-gray-100 text-gray-800'
												: 'border-(--line) bg-white text-(--ink)'
						}`} aria-live="polite">{displayWorkflowStatus}</span>
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

									<p class="mt-3 text-xs text-(--muted)">{t.intakeFileNote}</p>

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
										<button 
											id="process-order-btn" 
											class="primary-button flex items-center justify-center font-bold min-w-[160px]" 
											type="button" 
											onclick={processOrder}
											disabled={isProcessing}
										>
											{#if isProcessing}
												<span class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent inline-block"></span>
												{currentLocale === 'id' ? 'Memproses...' : 'Processing...'}
											{:else}
												{t.processOrder} <i class="ri-arrow-right-line ml-1" aria-hidden="true"></i>
											{/if}
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
										<p class="text-sm font-medium text-(--muted)">
											Order #{orderId}
											<span class="ml-3 rounded border border-(--line) px-2 py-1 normal-case tracking-normal font-sans"
												>Wholesale</span
											>
											<span class="ml-3 normal-case tracking-normal">Client: {client || 'Unresolved'}</span>
										</p>
										<h1 class="mt-5 font-display text-4xl leading-tight md:text-5xl">{t.reviewOrder}</h1>
										<p class="mt-3 text-lg">{formatMessage(t.foundItems, { count: lineItems.length })}</p>
										<p class="mt-1 text-sm text-(--muted)">
											{#if remainingAnswers > 0}
												{reviewCountLabel(remainingAnswers)}
											{:else if lineItems.length > 0}
												{t.allResolved}
											{:else}
												{extractionNotice || 'Artisan could not read line items from this source. Paste the PO text or use the sample order for the demo.'}
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

								{#if lineItems.length === 0}
									<section class="mt-8 rounded-md border border-[var(--line)] bg-white px-4 py-5 text-sm text-[var(--muted)]">
										<p class="font-semibold text-[var(--ink)]">Artisan could not read line items from this source.</p>
										<p class="mt-1">Paste the PO text or use the sample order for the demo.</p>
										{#if uploadedFiles.length > 0}
											<p class="mt-1">Uploaded file kept as source metadata.</p>
										{/if}
									</section>
								{:else}
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
								{/if}
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
													{#if lineItems.length === 0}
														{doc === t.customerUpdate ? t.needsOrderDetails : t.needsLineItems}
													{:else if allAnswered}
														{doc === t.customerUpdate ? t.draftIncludesNotes : t.readyAfterReview}
													{:else}
														{doc === t.productionSheet ? formatMessage(t.blockedByAnswers, { count: remainingAnswers }) : t.blockedByProductionSheet}
													{/if}
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
									<p class="text-sm font-medium text-(--muted)">
										Order #{orderId}
										<span class="ml-3 rounded border border-(--line) px-2 py-1 normal-case tracking-normal font-sans"
											>Wholesale</span
										>
										<span class="ml-3 normal-case tracking-normal">Client: {client}</span>
									</p>
									<h1 class="mt-5 font-display text-4xl leading-tight md:text-5xl">{t.sheets}</h1>
									<p class="mt-3">{t.sheetsDesc}</p>
									{#if allRequiredResolved}
										<p class="mt-5 inline-flex items-center gap-1.5 rounded-md border border-(--ready) bg-(--ready-bg) px-3 py-2 text-sm text-(--ready-ink) font-semibold">
											<i class="ri-checkbox-circle-line text-base" aria-hidden="true"></i>
											{t.answersComplete}
										</p>
									{:else}
										<div class="mt-5 inline-flex items-start gap-2 rounded-md border border-(--warning) bg-(--warning-bg) px-3 py-2 text-sm text-(--warning-ink) font-semibold max-w-2xl">
											<i class="ri-error-warning-line text-base mt-0.5 shrink-0" aria-hidden="true"></i>
											<div>
												<strong class="block">{t.sheetsReviewNeeded || 'Review needed before production'}</strong>
												{#if remainingAnswers > 0}
													<span class="block text-xs font-medium mt-0.5">{answerCountLabel(remainingAnswers)} still required.</span>
												{/if}
												{#if blockingLineCount > 0}
													<span class="block text-xs font-medium mt-0.5">{t.sheetsBlockingRows || 'Blocking rows'}: {blockingItemsList.join(', ')}</span>
												{/if}
											</div>
										</div>
									{/if}
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
											onUpdateItem={(id, field, value) => updateLineItem(id, field, value)}
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

											<!-- Order progress checklist -->
											<div class="mb-4 border-b border-(--line) pb-4">
												<h3 class="text-sm font-bold text-(--ink) mb-2.5">{t.orderProgress}</h3>
												<ul class="space-y-1.5" aria-label="Order progress">
													{#each [
														{ label: t.progressOrderReviewed, done: progressOrderReviewed },
														{ label: t.progressProductionSheet, done: progressProductionSheet },
														{ label: t.progressPackingChecklist, done: progressPackingChecklist },
														{ label: t.progressBaliHandoff, done: progressBaliHandoff },
														{ label: t.progressQualityCheck, done: progressQualityCheck },
														{ label: t.progressPackingComplete, done: progressPackingComplete },
														{ label: t.progressCustomerUpdate, done: progressCustomerUpdate }
													] as row (row.label)}
														<li class="flex items-center gap-2 text-xs">
															<span class={`flex items-center justify-center w-4 h-4 rounded-full shrink-0 border ${row.done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-(--line) bg-white'}`} aria-hidden="true">
																{#if row.done}
																	<i class="ri-check-line text-[10px] font-bold"></i>
																{/if}
															</span>
															<span class={row.done ? 'text-(--ink) font-medium' : 'text-(--muted)'}>{row.label}</span>
														</li>
													{/each}
												</ul>
											</div>

											<div>
												<h2 class="font-display text-xs font-bold text-(--muted) uppercase tracking-wider mb-3">{t.readyNext}</h2>
											{#if activeTab === 'production'}
												<div class="space-y-3">
													<button class="side-action transition flex items-center justify-between gap-3 w-full bg-white hover:border-(--brand) text-left cursor-pointer border border-(--line) rounded-lg p-4" type="button" onclick={() => downloadXlsx('production')}>
														<div>
															<strong class="block font-bold text-sm text-(--ink)">{t.downloadProductionXlsx}</strong>
															<span class="block text-[10px] text-(--muted) mt-0.5">XLSX</span>
														</div>
														<i class="ri-file-excel-2-line text-lg text-(--brand)" aria-hidden="true"></i>
													</button>
													<button class="side-action transition flex items-center justify-between gap-3 w-full bg-white hover:border-(--brand) text-left cursor-pointer border border-(--line) rounded-lg p-4" type="button" onclick={() => downloadPdf('production')}>
														<div>
															<strong class="block font-bold text-sm text-(--ink)">{t.downloadProductionPdf}</strong>
															<span class="block text-[10px] text-(--muted) mt-0.5">PDF</span>
														</div>
														<i class="ri-file-pdf-2-line text-lg text-(--brand)" aria-hidden="true"></i>
													</button>
													<button id="export-dropdown-btn" class="side-action transition flex items-center justify-between gap-3 w-full bg-white hover:border-(--brand) text-left cursor-pointer border border-(--line) rounded-lg p-4" type="button" onclick={() => downloadCsv('production')}>
														<div>
															<strong class="block font-bold text-sm text-(--ink)">{t.downloadProductionSheet}</strong>
															<span class="block text-[10px] text-(--muted) mt-0.5">{t.csvFormat}</span>
														</div>
														<i class="ri-download-2-line text-lg text-(--brand)" aria-hidden="true"></i>
													</button>
													<button class="side-action transition flex items-center justify-between gap-3 w-full bg-white hover:border-(--brand) text-left cursor-pointer border border-(--line) rounded-lg p-4" type="button" onclick={copyTable}>
														<div>
															<strong class="block font-bold text-sm text-(--ink)">{t.copyTable}</strong>
															<span class="block text-[10px] text-(--muted) mt-0.5">{t.plainText}</span>
														</div>
														<i class="ri-file-copy-2-line text-lg text-(--brand)" aria-hidden="true"></i>
													</button>
												</div>
											{:else if activeTab === 'packing'}
												<div class="space-y-3">
													<button class="side-action transition flex items-center justify-between gap-3 w-full bg-white hover:border-(--brand) text-left cursor-pointer border border-(--line) rounded-lg p-4" type="button" onclick={() => downloadXlsx('packing')}>
														<div>
															<strong class="block font-bold text-sm text-(--ink)">{t.downloadPackingXlsx}</strong>
															<span class="block text-[10px] text-(--muted) mt-0.5">XLSX</span>
														</div>
														<i class="ri-file-excel-2-line text-lg text-(--brand)" aria-hidden="true"></i>
													</button>
													<button class="side-action transition flex items-center justify-between gap-3 w-full bg-white hover:border-(--brand) text-left cursor-pointer border border-(--line) rounded-lg p-4" type="button" onclick={() => downloadPdf('packing')}>
														<div>
															<strong class="block font-bold text-sm text-(--ink)">{t.downloadPackingPdf}</strong>
															<span class="block text-[10px] text-(--muted) mt-0.5">PDF</span>
														</div>
														<i class="ri-file-pdf-2-line text-lg text-(--brand)" aria-hidden="true"></i>
													</button>
													<button id="export-dropdown-btn" class="side-action transition flex items-center justify-between gap-3 w-full bg-white hover:border-(--brand) text-left cursor-pointer border border-(--line) rounded-lg p-4" type="button" onclick={() => downloadCsv('packing')}>
														<div>
															<strong class="block font-bold text-sm text-(--ink)">{t.downloadPackingChecklist}</strong>
															<span class="block text-[10px] text-(--muted) mt-0.5">{t.csvFormat}</span>
														</div>
														<i class="ri-download-2-line text-lg text-(--brand)" aria-hidden="true"></i>
													</button>
													<button class="side-action transition flex items-center justify-between gap-3 w-full bg-white hover:border-(--brand) text-left cursor-pointer border border-(--line) rounded-lg p-4" type="button" onclick={copyTable}>
														<div>
															<strong class="block font-bold text-sm text-(--ink)">{t.copyTable}</strong>
															<span class="block text-[10px] text-(--muted) mt-0.5">{t.plainText}</span>
														</div>
														<i class="ri-file-copy-2-line text-lg text-(--brand)" aria-hidden="true"></i>
													</button>
												</div>
											{:else}
												<div class="space-y-3">
													<button id="export-dropdown-btn" class="side-action transition flex items-center justify-between gap-3 w-full bg-white hover:border-(--brand) text-left cursor-pointer border border-(--line) rounded-lg p-4" type="button" onclick={copyCustomerUpdate}>
														<div>
															<strong class="block font-bold text-sm text-(--ink)">{t.copyUpdate}</strong>
															<span class="block text-[10px] text-(--muted) mt-0.5">{t.plainText}</span>
														</div>
														<i class="ri-file-copy-2-line text-lg text-(--brand)" aria-hidden="true"></i>
													</button>
													<button class="side-action transition flex items-center justify-between gap-3 w-full bg-white hover:border-(--brand) text-left cursor-pointer border border-(--line) rounded-lg p-4" type="button" onclick={openEmailClient}>
														<div>
															<strong class="block font-bold text-sm text-(--ink)">{t.openEmail}</strong>
															<span class="block text-[10px] text-(--muted) mt-0.5">Mailto Link</span>
														</div>
														<i class="ri-mail-line text-lg text-(--brand)" aria-hidden="true"></i>
													</button>
												</div>
											{/if}
										</div>
									</aside>
								{/if}
							</div>

													<section class="mt-6 rounded-lg border border-(--line) bg-white p-5 shadow-sm" aria-labelledby="bali-handoff-title">
							<div class="flex flex-wrap items-start justify-between gap-4">
								<div class="max-w-2xl">
									<h2 id="bali-handoff-title" class="font-display text-2xl text-(--ink)">{t.baliHandoff}</h2>
									<p class="mt-2 text-sm leading-6 text-(--muted)">{t.handoffSubtitle}</p>
								</div>
								<div class="flex flex-wrap items-center gap-2">
									<button
										class="primary-button flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
										type="button"
										disabled={!handoffReady || !allRequiredResolved}
										aria-disabled={!handoffReady || !allRequiredResolved}
										aria-describedby={!handoffReady ? 'handoff-blocked-reason' : undefined}
										title={!allRequiredResolved ? (t.reviewNeededHelp || '') : ''}
										onclick={createBaliHandoff}
									>
										<i class="ri-file-list-3-line" aria-hidden="true"></i> {t.createBaliHandoff}
									</button>
									{#if handoffShared}
										<span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
											{t.handoffSharedLocal}
										</span>
									{/if}
								</div>
							</div>

							{#if !handoffReady}
								<p id="handoff-blocked-reason" class="mt-3 text-sm font-semibold text-(--warning-ink)">
									{!allRequiredResolved ? (t.reviewNeededHelp || 'Resolve required production fields first.') : t.handoffBlocked}
								</p>
							{/if}

							{#if handoffCreated}
								<div class="mt-5 border-t border-(--line) pt-5">
									<div class="flex items-center justify-between gap-2">
										<h3 class="font-semibold text-sm text-(--ink)">{t.packetPreview}</h3>
										{#if allRequiredResolved}
											<span class="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
												{t.handoffReadyStatus || 'Ready for Bali handoff'}
											</span>
										{:else}
											<span class="text-xs font-semibold text-(--warning-ink) bg-(--warning-bg) border border-(--warning) rounded px-2 py-0.5">
												{t.handoffReviewStatus || 'Review needed before Bali handoff'}
											</span>
										{/if}
									</div>
									<div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
										<textarea
											class="min-h-64 w-full resize-y rounded-md border border-(--line) bg-(--surface-soft) p-4 font-mono text-xs leading-6 text-(--ink) outline-none focus:border-(--brand) focus:bg-white"
											readonly
											value={baliHandoffText}
											aria-label={t.baliHandoff}
										></textarea>
										<div class="flex flex-wrap gap-2 lg:w-44 lg:flex-col">
											<button
												class="secondary-button flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
												type="button"
												disabled={!handoffCreated}
												onclick={copyBaliHandoff}
											>
												<i class="ri-file-copy-line" aria-hidden="true"></i> {t.copyHandoff}
											</button>
											<button
												class="secondary-button flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
												type="button"
												disabled={!handoffCreated}
												onclick={downloadBaliHandoffPdf}
											>
												<i class="ri-file-pdf-2-line" aria-hidden="true"></i> {t.downloadPdf}
											</button>
											<button
												class="secondary-button flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
												type="button"
												disabled={!handoffCreated || !allRequiredResolved}
												aria-describedby={!allRequiredResolved ? 'handoff-blocked-reason' : undefined}
												onclick={markBaliHandoffShared}
											>
												<i class="ri-checkbox-circle-line" aria-hidden="true"></i> {t.markAsShared}
											</button>
										</div>
									</div>
									<p class="mt-3 text-xs text-(--muted)">
										{#if allRequiredResolved}
											{t.handoffReadyDesc}
										{:else}
											{t.handoffHelperText}
										{/if}
									</p>
								</div>
							{/if}
						</section>
						</div>
					</section>
				{:else}
					<section class="px-4 py-6 md:px-10 md:py-9">
						<div>
							<div class="mx-auto max-w-5xl">
								<p class="text-sm font-medium text-(--muted)">
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
										<button class="secondary-button flex items-center justify-center gap-1.5" type="button" onclick={openEmailClient}>
											<i class="ri-mail-line" aria-hidden="true"></i> {t.openEmail}
										</button>
										<button class="secondary-button flex items-center justify-center gap-1.5" type="button" onclick={saveCustomerDraft}>
											<i class="ri-save-3-line" aria-hidden="true"></i> {t.saveDraft}
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
							<span class={`status-dot border-2 flex items-center justify-center rounded-full w-9 h-9 ${(!allRequiredResolved && (currentStep === 2 || currentStep === 3)) ? 'status-warn border-(--warning) text-(--warning-ink)' : 'border-(--ready-ink) text-(--ready-ink)'}`}>
								{#if !allRequiredResolved && (currentStep === 2 || currentStep === 3)}
									<i class="ri-question-mark font-bold text-sm" aria-hidden="true"></i>
								{:else}
									<i class="ri-check-line font-bold text-base" aria-hidden="true"></i>
								{/if}
							</span>
							<div>
								<p class="font-semibold">
									{#if currentStep === 2}
										{#if lineItems.length === 0}
											Artisan could not read line items from this source.
										{:else}
											{answerCountLabel(remainingAnswers)}
										{/if}
									{:else if currentStep === 3}
										{allRequiredResolved ? t.readyToProduction : (t.sheetsReviewNeeded || 'Review needed before production')}
									{:else}
										{allRequiredResolved ? (sent ? t.markedAsSent : t.readyToCopy) : (t.sheetsReviewNeeded || 'Review needed before production')}
									{/if}
								</p>
								{#if (currentStep === 3 || currentStep === 4) && !allRequiredResolved}
									<p id="footer-required-warning" class="text-sm text-(--warning-ink)">{t.reviewNeededHelp || 'Resolve required blockers and missing production fields.'}</p>
								{/if}
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
									{#if remainingAnswers > 0 || lineItems.length === 0}
										<span id="continue-warning" class="footer-warning-bubble" role="status">
											{lineItems.length === 0 ? 'Paste PO text or use sample order to continue.' : t.resolveToContinue}
										</span>
									{/if}
									<button
										id="continue-to-sheets-btn"
										class="primary-button flex items-center justify-center font-bold"
										type="button"
										disabled={!canContinueToSheets}
										aria-describedby={remainingAnswers > 0 || lineItems.length === 0 ? 'continue-warning' : undefined}
										onclick={continueToSheets}
									>
										{t.continueToSheets} <i class="ri-arrow-right-line ml-1" aria-hidden="true"></i>
									</button>
								</div>
							{:else}
								{#if currentStep === 3}
									<div class="continue-action">
										{#if !allRequiredResolved}
											<span id="continue-update-warning" class="footer-warning-bubble" role="status">
												{t.reviewNeededHelp || 'Resolve required production fields first.'}
											</span>
										{/if}
										<button
											id="continue-to-update-btn"
											class="primary-button flex items-center justify-center font-bold"
											type="button"
											disabled={!allRequiredResolved}
											aria-describedby={!allRequiredResolved ? 'continue-update-warning' : undefined}
											onclick={continueToCustomerUpdate}
										>
											{t.continueToCustomerUpdate} <i class="ri-arrow-right-line ml-1" aria-hidden="true"></i>
										</button>
									</div>
								{:else}
									<button
										id="mark-sent-btn"
										class="primary-button flex items-center justify-center gap-1.5 font-bold"
										type="button"
										disabled={!allRequiredResolved}
										aria-describedby={!allRequiredResolved ? 'footer-required-warning' : undefined}
										onclick={markSent}
									>
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


