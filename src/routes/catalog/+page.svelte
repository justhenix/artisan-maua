<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { driver } from 'driver.js';
	import 'driver.js/dist/driver.css';
	import AppShell from '$lib/components/artisan/AppShell.svelte';
	import { fallbackCatalog, type CatalogItem } from '$lib/data/fallbackCatalog';
	import enMessages from '../../../messages/en.json';
	import idMessages from '../../../messages/id.json';

	type Locale = 'en' | 'id';
	type AppMessages = typeof enMessages;

	let { data, form }: { data: { catalogItems: CatalogItem[] }; form: any } = $props();

	const messageCatalog: Record<Locale, AppMessages> = {
		en: enMessages,
		id: idMessages
	};

	const isIndonesian = $derived(page.url.pathname.startsWith('/id'));
	const currentLocale = $derived<Locale>(isIndonesian ? 'id' : 'en');
	const t = $derived(messageCatalog[currentLocale]);

	const items = $derived<CatalogItem[]>(
		data.catalogItems && data.catalogItems.length > 0 ? data.catalogItems : fallbackCatalog
	);

	let search = $state('');
	let departmentFilter = $state<string>('all');
	let categoryFilter = $state<string>('all');
	let collectionFilter = $state<string>('all');
	let viewMode = $state<'grid' | 'list'>('grid');

	// Extract unique categories and collections for filtering
	const departments = $derived(
		['all', 'Hat Jewelry', 'Body Jewelry', 'Others']
	);
	const categories = $derived(
		['all', 'Hat Pins', 'Hand Bands', 'Jeweled Hat Slides', 'Necklaces', 'Earrings', 'Rings', 'Bracelets', 'Others']
	);
	const collections = $derived(
		['all', 'Celestial Story', 'Transformation', 'Freedom & Spirit', 'Power & Protection', 'Nature & The Duality of Life', 'Animal Kingdom', 'Tribal Elegance', 'Batu Stone', 'Others']
	);

	const filtered = $derived(
		items.filter((item) => {
			if (departmentFilter !== 'all' && item.department !== departmentFilter) return false;
			if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
			if (collectionFilter !== 'all' && item.collection !== collectionFilter) return false;
			if (!search.trim()) return true;
			const needle = search.trim().toLowerCase();
			const haystack = [
				item.styleCode,
				item.creativeTitle,
				item.department || '',
				item.category || '',
				item.collection || '',
				item.material,
				item.notes_en,
				item.notes_id
			]
				.join(' ')
				.toLowerCase();
			return haystack.includes(needle);
		})
	);

	// CRUD modal states
	let showModal = $state(false);
	let modalMode = $state<'create' | 'edit'>('create');
	let originalStyleCode = $state('');
	let styleCodeToDelete = $state<string | null>(null);
	
	// Form bind states
	let formStyleCode = $state('');
	let formTitle = $state('');
	let formDepartment = $state<'Hat Jewelry' | 'Body Jewelry' | 'Others'>('Hat Jewelry');
	let formCategory = $state<CatalogItem['category']>('Hat Pins');
	let formCollection = $state<CatalogItem['collection']>('Celestial Story');
	let formMaterial = $state<'Silver' | 'Gold' | 'Brass' | 'Others'>('Silver');
	let formBaseLabor = $state(15.0);
	let formSilverWeight = $state(5.0);
	let formStoneCost = $state(0.0);
	let formNotesEn = $state('');
	let formNotesId = $state('');
	let formImageUrl = $state('');

	// Drag and drop states
	let fileInput = $state<HTMLInputElement>();
	let isDragOver = $state(false);
	let activeDropdownId = $state<string | null>(null);

	let isSubmitting = $state(false);
	let toastMessage = $state('');
	let toastTimeout: any;

	function showToast(msg: string) {
		toastMessage = msg;
		if (toastTimeout) clearTimeout(toastTimeout);
		toastTimeout = setTimeout(() => {
			toastMessage = '';
		}, 3000);
	}

	if (form) {
		if (form.success) {
			showToast(form.action === 'create' ? t.productAdded : form.action === 'edit' ? t.productUpdated : t.productDeleted);
		} else if (form.error) {
			showToast(form.error);
		}
	}

	function openCreateModal() {
		modalMode = 'create';
		originalStyleCode = '';
		formStyleCode = '';
		formTitle = '';
		formDepartment = 'Hat Jewelry';
		formCategory = 'Hat Pins';
		formCollection = 'Celestial Story';
		formMaterial = 'Silver';
		formBaseLabor = 15.0;
		formSilverWeight = 5.0;
		formStoneCost = 0.0;
		formNotesEn = '';
		formNotesId = '';
		formImageUrl = '';
		showModal = true;
	}

	function openEditModal(item: CatalogItem) {
		modalMode = 'edit';
		originalStyleCode = item.styleCode;
		formStyleCode = item.styleCode;
		formTitle = item.creativeTitle;
		formDepartment = (item.department as any) || 'Hat Jewelry';
		formCategory = item.category || 'Hat Pins';
		formCollection = item.collection || 'Celestial Story';
		formMaterial = item.material;
		formBaseLabor = item.baseLabor;
		formSilverWeight = item.silverWeight;
		formStoneCost = item.stoneCost;
		formNotesEn = item.notes_en;
		formNotesId = item.notes_id;
		formImageUrl = item.imageUrl || '';
		showModal = true;
	}

	function closeModel() {
		showModal = false;
	}

	function clearFilters() {
		search = '';
		departmentFilter = 'all';
		categoryFilter = 'all';
		collectionFilter = 'all';
	}

	function startCatalogTour() {
		const d = driver({
			showProgress: true,
			nextBtnText: t.tourNext || 'Next',
			prevBtnText: t.tourBack || 'Back',
			doneBtnText: t.tourDone || 'Done',
			animate: true,
			steps: [
				{
					element: '#catalog-title',
					popover: {
						title: t.tourCatalogWelcomeTitle,
						description: t.tourCatalogWelcomeDesc,
						side: 'bottom',
						align: 'start'
					}
				},
				{
					element: '#catalog-filters',
					popover: {
						title: t.tourCatalogSearchTitle,
						description: t.tourCatalogSearchDesc,
						side: 'bottom'
					}
				},
				{
					element: '#add-product-btn',
					popover: {
						title: t.tourCatalogAddTitle,
						description: t.tourCatalogAddDesc,
						side: 'bottom'
					}
				},
				{
					element: '#view-mode-toggle',
					popover: {
						title: t.tourCatalogViewTitle,
						description: t.tourCatalogViewDesc,
						side: 'bottom'
					}
				},
				{
					element: '#catalog-list',
					popover: {
						title: t.tourCatalogItemTitle,
						description: t.tourCatalogItemDesc,
						side: 'top'
					}
				}
			]
		});
		d.drive();
	}

	onMount(() => {
		const onboarded = localStorage.getItem('artisan-catalog-onboarded');
		if (!onboarded) {
			localStorage.setItem('artisan-catalog-onboarded', 'true');
			setTimeout(() => {
				startCatalogTour();
			}, 500);
		}
	});

	// Image drag and drop / upload / compression helpers
	function triggerFileSelect() {
		if (fileInput) {
			fileInput.click();
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave() {
		isDragOver = false;
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
			const file = e.dataTransfer.files[0];
			await processAndSetImage(file);
		}
	}

	async function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const file = target.files[0];
			await processAndSetImage(file);
		}
	}

	async function processAndSetImage(file: File) {
		if (!file.type.startsWith('image/')) {
			showToast('Please upload an image file');
			return;
		}
		try {
			showToast('Compressing and optimizing image...');
			const optimizedBase64 = await optimizeImage(file);
			formImageUrl = optimizedBase64;
			showToast('Image attached and optimized (compressed offline)');
		} catch (err) {
			console.error('Image optimization failed:', err);
			showToast('Failed to optimize image');
		}
	}

	function optimizeImage(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const img = new Image();
				img.onload = () => {
					const canvas = document.createElement('canvas');
					const ctx = canvas.getContext('2d');
					if (!ctx) {
						reject(new Error('Could not get canvas context'));
						return;
					}

					// Max dimensions for local SQLite base64 text
					const MAX_WIDTH = 400;
					const MAX_HEIGHT = 400;
					let width = img.width;
					let height = img.height;

					if (width > height) {
						if (width > MAX_WIDTH) {
							height *= MAX_WIDTH / width;
							width = MAX_WIDTH;
						}
					} else {
						if (height > MAX_HEIGHT) {
							width *= MAX_HEIGHT / height;
							height = MAX_HEIGHT;
						}
					}

					canvas.width = width;
					canvas.height = height;
					ctx.drawImage(img, 0, 0, width, height);

					// Convert to JPEG with 0.75 quality for very small offline base64 size
					const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
					resolve(dataUrl);
				};
				img.onerror = reject;
				img.src = e.target?.result as string;
			};
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	function sanitizeDisplay(value: string | null | undefined): string {
		if (!value || !value.trim()) return '';
		return value.trim();
	}

	function isMissingProductionField(value: string | null | undefined): boolean {
		if (value === null || value === undefined) return true;
		const trimmed = value.trim();
		if (!trimmed) return true;
		const upper = trimmed.toUpperCase();
		return upper === 'PENDING' || upper === 'REVIEW';
	}

	function normalizeMaterial(material: string): string {
		const map: Record<string, string> = {
			silver: 'Sterling Silver',
			gold: '18k Gold',
			brass: 'Brass',
			'silver teroksidasi': 'Oxidized Silver'
		};
		return map[material.toLowerCase()] || material;
	}

	function displayCategory(category: string): string {
		const lower = category.toLowerCase();
		if (lower === 'others' || lower === 'other') return 'Custom Profile';
		return category;
	}

	function displayCollection(collection: string): string {
		const lower = collection.toLowerCase();
		if (lower === 'others' || lower === 'other') return 'Custom Profile';
		return collection;
	}

	function displayDepartment(department: string): string {
		const lower = department.toLowerCase();
		if (lower === 'others' || lower === 'other') return 'General';
		return department;
	}
</script>

<svelte:head>
	<title>Catalog · Artisan</title>
	<meta name="description" content="Heather Benjamin Jewelry production reference." />
</svelte:head>

<AppShell
	{t}
	{currentLocale}
	currentPath={page.url.pathname}
	mainClass="app-main-dashboard"
	onReplayTour={startCatalogTour}
>
	<div class="flex-1 overflow-y-auto p-6 md:p-10 font-sans">
		<div class="mx-auto max-w-6xl">
			<!-- Header -->
			<header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
				<div>
					<h1 id="catalog-title" class="font-display text-3xl md:text-4xl font-bold tracking-tight text-(--ink)">
						{t.catalogTitle}
					</h1>
					<p class="mt-2 text-sm text-(--muted)">{t.catalogDesc}</p>
				</div>
				<div class="flex items-center gap-3">
					<!-- Grid vs List View toggle -->
					<div id="view-mode-toggle" class="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md border border-(--line) shrink-0 shadow-xs">
						<button
							type="button"
							onclick={() => viewMode = 'grid'}
							class="flex items-center px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer {viewMode === 'grid' ? 'bg-white text-(--ink) shadow-xs' : 'text-(--muted) hover:text-(--ink)'}"
							aria-label="Grid view"
						>
							<svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
							Grid
						</button>
						<button
							type="button"
							onclick={() => viewMode = 'list'}
							class="flex items-center px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer {viewMode === 'list' ? 'bg-white text-(--ink) shadow-xs' : 'text-(--muted) hover:text-(--ink)'}"
							aria-label="List view"
						>
							<svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
							List
						</button>
					</div>

					<button
						id="add-product-btn"
						onclick={openCreateModal}
						class="flex items-center gap-2 px-4 py-2.5 bg-(--brand) hover:bg-(--brand-dark) text-white font-medium rounded text-sm transition shadow-sm cursor-pointer"
					>
						<span class="text-base font-bold">+</span> {t.addProduct}
					</button>
				</div>
			</header>

			<!-- Search & Filters -->
			<div id="catalog-filters" class="mb-8 space-y-4 bg-white p-5 rounded-lg border border-(--line) shadow-sm">
				<div class="relative">
					<input
						type="search"
						class="w-full pr-4 py-2 border border-(--line) rounded-md text-sm bg-slate-50 focus:bg-white focus:ring-1 focus:ring-(--brand) focus:border-(--brand) transition-colors outline-hidden"
						style="padding-left: 2.5rem;"
						placeholder={t.searchCatalog}
						bind:value={search}
						aria-label={t.searchCatalog}
					/>
					<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-(--muted)">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
					<!-- Department Filter -->
					<div>
						<label class="block text-xs font-semibold text-(--muted) uppercase tracking-wider mb-2" for="depFilter">Department</label>
						<select id="depFilter" bind:value={departmentFilter} class="cell-input w-full border border-(--line) rounded px-2.5 py-1.5 text-xs bg-white">
							{#each departments as dep}
								<option value={dep}>{dep === 'all' ? 'All departments' : dep}</option>
							{/each}
						</select>
					</div>

					<!-- Category Filter -->
					<div>
						<label class="block text-xs font-semibold text-(--muted) uppercase tracking-wider mb-2" for="catFilter">Category / Type</label>
						<select id="catFilter" bind:value={categoryFilter} class="cell-input w-full border border-(--line) rounded px-2.5 py-1.5 text-xs bg-white">
							{#each categories as cat}
								<option value={cat}>{cat === 'all' ? 'All categories' : cat}</option>
							{/each}
						</select>
					</div>

					<!-- Collection Filter -->
					<div>
						<label class="block text-xs font-semibold text-(--muted) uppercase tracking-wider mb-2" for="colFilter">Collection</label>
						<select id="colFilter" bind:value={collectionFilter} class="cell-input w-full border border-(--line) rounded px-2.5 py-1.5 text-xs bg-white">
							{#each collections as col}
								<option value={col}>{col === 'all' ? 'All collections' : col}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>

			<!-- Toast alert -->
			{#if toastMessage}
				<div class="fixed bottom-6 right-6 z-50 bg-(--ink) text-white px-5 py-3 rounded-lg shadow-lg text-sm transition-all duration-300">
					{toastMessage}
				</div>
			{/if}

			<!-- Catalog Views -->
			<div id="catalog-list">
				{#if filtered.length === 0}
				<div class="flex flex-col items-center justify-center rounded-lg border border-(--line) bg-white px-6 py-16 text-center shadow-sm">
					<div class="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-(--muted) mb-4 border border-(--line)">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
					</div>
					<h2 class="font-display text-xl text-(--ink) font-bold">{t.noCatalogMatches}</h2>
					<p class="mt-2 text-sm text-(--muted)">{t.tryAdjusting}</p>
					<button class="ghost-button mt-6 px-4 py-2 text-xs border border-(--line) hover:bg-slate-50 rounded cursor-pointer" type="button" onclick={clearFilters}>
						{t.clearFilters}
					</button>
				</div>
			{:else if viewMode === 'grid'}
				<!-- Grid View -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each filtered as item (item.styleCode)}
						<article class="flex flex-col h-[300px] rounded-lg border border-(--line) bg-white shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out relative group justify-between">
							<!-- Top Row: side-by-side thumbnail layout -->
							<div class="flex p-4 pb-0 gap-4 h-24 flex-shrink-0">
								<div class="w-16 h-16 flex-shrink-0 relative overflow-hidden bg-slate-50 border border-(--line) rounded-md">
									{#if item.imageUrl}
										<img
											src={item.imageUrl}
											alt={item.creativeTitle}
											class="w-full h-full object-cover"
											loading="lazy"
										/>
									{:else}
										<div class="w-full h-full flex items-center justify-center text-(--muted)">
											<svg class="w-5 h-5 stroke-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
										</div>
									{/if}
								</div>

								<div class="flex-grow min-w-0">
									<div class="flex flex-wrap gap-1 mb-1 items-center">
										<span class="font-mono text-[9px] font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 shadow-xs uppercase tracking-wider truncate whitespace-nowrap">
											{isNaN(Number(item.styleCode)) ? item.styleCode : 'Style ' + item.styleCode}
										</span>
										<span class="text-[9px] font-semibold text-slate-400 uppercase tracking-wide truncate max-w-[120px] whitespace-nowrap">
											{displayCategory(item.category || '')}
										</span>
									</div>
									<h2 class="font-display text-base font-bold text-(--ink) leading-snug line-clamp-2">
										{item.creativeTitle}
									</h2>
								</div>
							</div>

							<!-- Monospace numeric metrics & attributes -->
							<div class="flex flex-wrap gap-1.5 px-4 flex-shrink-0">
								<span class="font-mono text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 shadow-sm truncate whitespace-nowrap">{normalizeMaterial(item.material)}</span>
								<span class="font-mono text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 shadow-sm truncate whitespace-nowrap">{item.silverWeight.toFixed(1)}g</span>
								{#if item.stoneCost > 0}
									<span class="font-mono text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 shadow-sm truncate whitespace-nowrap">${item.stoneCost.toFixed(2)}</span>
								{/if}
								<span class="font-mono text-[10px] font-semibold px-2 py-0.5 rounded border border-indigo-100 bg-indigo-50/50 text-indigo-700 shadow-sm truncate whitespace-nowrap">{displayCollection(item.collection || '')}</span>
							</div>

							<!-- Notes Stacked Vertically with h-24 overflow locking -->
							<div class="px-4 py-2 h-24 overflow-hidden flex flex-col gap-1.5 mt-2">
								{#if isMissingProductionField(item.notes_en)}
									<p class="text-[11px] leading-relaxed font-sans font-medium bg-amber-50/60 text-amber-800 border border-amber-200 rounded px-2 py-1">Pending English notes</p>
								{:else}
									<p class="text-xs text-slate-700 leading-relaxed font-sans">{sanitizeDisplay(item.notes_en)}</p>
								{/if}
								{#if isMissingProductionField(item.notes_id)}
									<div class="bg-amber-50/60 border-l-2 border-amber-200 p-1.5 text-[11px] text-amber-800 rounded-r font-medium">
										<p class="leading-relaxed font-sans">Pending Indonesian translation</p>
									</div>
								{:else if item.notes_id}
									<div class="bg-slate-50/80 border-l-2 border-indigo-500 p-1.5 text-[11px] text-slate-600 rounded-r font-medium">
										<p class="leading-relaxed font-sans">{sanitizeDisplay(item.notes_id)}</p>
									</div>
								{/if}
							</div>

							<!-- Grid View: Isolated actions footer framework -->
							<div class="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/80 mt-auto flex-shrink-0">
								<button
									onclick={() => openEditModal(item)}
									class="w-full py-2.5 text-center text-xs font-semibold text-slate-600 hover:text-slate-850 hover:bg-slate-100/50 transition cursor-pointer bg-transparent border-0"
								>
									Edit Profile
								</button>
								
								<button
									onclick={() => {
										styleCodeToDelete = item.styleCode;
									}}
									class="w-full py-2.5 text-center text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/50 transition cursor-pointer bg-transparent border-0"
								>
									Delete Asset
								</button>
							</div>
						</article>
					{/each}
				</div>
			{:else}				<!-- Table / List View -->
				<div class="rounded-lg border border-(--line) bg-white shadow-sm overflow-hidden">
					<table class="w-full text-left border-collapse text-xs table-fixed">
						<thead class="bg-slate-50 border-b border-(--line) text-(--muted) font-semibold uppercase tracking-wider">
							<tr>
								<th class="p-2.5 pl-3 w-12">Image</th>
								<th class="p-2.5 w-20">Style</th>
								<th class="p-2.5 w-32">Product</th>
								<th class="p-2.5 w-24">Dept/Cat</th>
								<th class="p-2.5 w-28">Collection</th>
								<th class="p-2.5 w-14 text-right">Labor</th>
								<th class="p-2.5 w-14 text-right">Silver</th>
								<th class="p-2.5 w-14 text-right">Stones</th>
								<th class="p-2.5 w-36">Notes</th>
								<th class="p-2.5 pr-3 text-right w-14">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-(--line)">
							{#each filtered as item (item.styleCode)}
								<tr class="hover:bg-slate-50/50 transition">
									<td class="p-2 pl-3">
										{#if item.imageUrl}
											<img src={item.imageUrl} alt={item.creativeTitle} class="w-8 h-8 object-cover rounded border border-slate-200" />
										{:else}
											<div class="w-8 h-8 bg-slate-50 border border-slate-200 rounded flex items-center justify-center text-slate-400">
												<svg class="w-4 h-4 stroke-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
											</div>
										{/if}
									</td>
									<td class="p-2">
										<span class="font-mono text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 shadow-xs truncate whitespace-nowrap block text-center">
											{isNaN(Number(item.styleCode)) ? item.styleCode : 'Style ' + item.styleCode}
										</span>
									</td>
									<td class="p-2 font-medium text-(--ink) truncate" title={item.creativeTitle}>{item.creativeTitle}</td>
									<td class="p-2 text-slate-600 truncate">
										<span class="block text-[9px] uppercase tracking-wider font-semibold text-slate-400 truncate">{displayDepartment(item.department)}</span>
										<span class="font-mono text-[11px] font-semibold text-slate-800 truncate">{displayCategory(item.category || '')}</span>
									</td>
									<td class="p-2 text-slate-600 truncate">
										<span class="block text-[9px] uppercase tracking-wider font-semibold text-slate-400 truncate">{displayCollection(item.collection || '')}</span>
										<span class="font-mono text-[11px] font-semibold text-slate-800 truncate">{normalizeMaterial(item.material)}</span>
									</td>
									<td class="p-2 text-right"><span class="font-mono text-[11px] font-semibold text-slate-850 truncate">${item.baseLabor.toFixed(2)}</span></td>
									<td class="p-2 text-right"><span class="font-mono text-[11px] font-semibold text-slate-850 truncate">{item.silverWeight.toFixed(1)}g</span></td>
									<td class="p-2 text-right"><span class="font-mono text-[11px] font-semibold text-slate-850 truncate">${item.stoneCost.toFixed(2)}</span></td>
									<td class="p-2">
										<div class="flex flex-col gap-0.5 max-w-[140px] py-0.5 text-[11px] text-slate-500 font-sans">
											{#if isMissingProductionField(item.notes_en)}
												<span class="text-amber-800 font-medium truncate">Pending EN notes</span>
											{:else}
												<div class="truncate" title="EN: {item.notes_en}">EN: {sanitizeDisplay(item.notes_en)}</div>
											{/if}
											{#if isMissingProductionField(item.notes_id)}
												<span class="text-amber-800 font-medium truncate">Pending ID trans</span>
											{:else if item.notes_id}
												<div class="truncate" title="ID: {item.notes_id}">ID: {sanitizeDisplay(item.notes_id)}</div>
											{/if}
										</div>
									</td>
									<td class="p-2 pr-3 text-right relative">
										<div class="inline-block text-left">
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													activeDropdownId = activeDropdownId === item.styleCode ? null : item.styleCode;
												}}
												class="p-1 text-slate-500 hover:text-slate-850 rounded hover:bg-slate-100 transition cursor-pointer text-base leading-none font-bold"
												aria-label="Actions menu"
											>
												•••
											</button>
											{#if activeDropdownId === item.styleCode}
												<!-- svelte-ignore a11y_click_events_have_key_events -->
												<!-- svelte-ignore a11y_no_static_element_interactions -->
												<div 
													class="fixed inset-0 z-10" 
													onclick={() => activeDropdownId = null}
												></div>
												<div class="absolute right-0 mt-1 z-20 w-32 bg-white rounded border border-slate-200 shadow-md py-1 text-left">
													<button
														type="button"
														onclick={() => {
															openEditModal(item);
															activeDropdownId = null;
														}}
														class="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 text-xs transition cursor-pointer"
													>
														Edit Profile
													</button>
													<button
														type="button"
														onclick={() => {
															styleCodeToDelete = item.styleCode;
															activeDropdownId = null;
														}}
														class="w-full text-left px-3 py-1.5 hover:bg-rose-50 hover:text-rose-600 text-rose-600 text-xs transition cursor-pointer"
													>
														Delete Asset
													</button>
												</div>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
			</div>
		</div>
	</div>
</AppShell>

<!-- Add / Edit Modal -->
{#if showModal}
	<button type="button" class="modal-backdrop border-0 outline-hidden" aria-label="Close modal" onclick={closeModel}></button>
	<div class="modal" transition:fade={{ duration: 150 }}>
		<header class="modal-header">
			<h2 class="font-display text-lg font-bold text-(--ink)">
				{modalMode === 'create' ? t.addProduct : t.editProduct}
			</h2>
			<button onclick={closeModel} class="text-(--muted) hover:text-(--ink) text-lg font-bold cursor-pointer">
				&times;
			</button>
		</header>

		<div class="modal-content">
			<form
				method="POST"
				action="?/{modalMode}"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							showModal = false;
							showToast(modalMode === 'create' ? t.productAdded : t.productUpdated);
						} else {
							showToast('Error saving product');
						}
					};
				}}
				class="space-y-4 text-sm"
			>
				{#if modalMode === 'edit'}
					<input type="hidden" name="originalStyleCode" value={originalStyleCode} />
				{/if}

				<!-- Row 1: Style Code & Title -->
				<div class="grid grid-cols-3 gap-4">
					<!-- Style Code -->
					<div class="col-span-1">
						<label class="block text-xs font-semibold text-(--muted) uppercase tracking-wider mb-1" for="formStyleCode">
							{t.styleCodeLabel} *
						</label>
						<input
							type="text"
							id="formStyleCode"
							name="styleCode"
							required
							placeholder="e.g. HB-FEATHER-S"
							bind:value={formStyleCode}
							class="cell-input w-full border border-(--line) rounded p-2 text-xs"
						/>
					</div>

					<!-- Title -->
					<div class="col-span-2">
						<label class="block text-xs font-semibold text-(--muted) uppercase tracking-wider mb-1" for="formTitle">
							{t.titleLabel} *
						</label>
						<input
							type="text"
							id="formTitle"
							name="title"
							required
							placeholder="e.g. Small Feather Pin"
							bind:value={formTitle}
							class="cell-input w-full border border-(--line) rounded p-2 text-xs"
						/>
					</div>
				</div>

				<!-- Row 2: Department, Material, Category, Collection -->
				<div class="grid grid-cols-4 gap-4">
					<!-- Department -->
					<div>
						<label class="block text-xs font-semibold text-(--muted) uppercase tracking-wider mb-1" for="formDept">
							Department
						</label>
						<select id="formDept" name="department" bind:value={formDepartment} class="cell-input w-full border border-(--line) rounded p-2 text-xs bg-white">
							<option value="Hat Jewelry">Hat Jewelry</option>
							<option value="Body Jewelry">Body Jewelry</option>
							<option value="Others">Others</option>
						</select>
					</div>

					<!-- Material -->
					<div>
						<label class="block text-xs font-semibold text-(--muted) uppercase tracking-wider mb-1" for="formMaterial">
							{t.materialLabel}
						</label>
						<select id="formMaterial" name="material" bind:value={formMaterial} class="cell-input w-full border border-(--line) rounded p-2 text-xs bg-white">
							<option value="Silver">Silver</option>
							<option value="Gold">Gold</option>
							<option value="Brass">Brass</option>
							<option value="Others">Others</option>
						</select>
					</div>

					<!-- Category -->
					<div>
						<label class="block text-xs font-semibold text-(--muted) uppercase tracking-wider mb-1" for="formCat">
							Category / Type
						</label>
						<select id="formCat" name="category" bind:value={formCategory} class="cell-input w-full border border-(--line) rounded p-2 text-xs bg-white">
							{#each categories.filter(c => c !== 'all') as cat}
								<option value={cat}>{cat}</option>
							{/each}
						</select>
					</div>

					<!-- Collection -->
					<div>
						<label class="block text-xs font-semibold text-(--muted) uppercase tracking-wider mb-1" for="formCol">
							Collection
						</label>
						<select id="formCol" name="collection" bind:value={formCollection} class="cell-input w-full border border-(--line) rounded p-2 text-xs bg-white">
							{#each collections.filter(c => c !== 'all') as col}
								<option value={col}>{col}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Row 3: Labor, Silver Weight, Stone Cost -->
				<div class="grid grid-cols-3 gap-4">
					<!-- Labor Cost -->
					<div>
						<label class="block text-xs font-semibold text-(--muted) uppercase tracking-wider mb-1" for="formLabor">
							{t.laborCostLabel}
						</label>
						<input
							type="number"
							step="0.1"
							id="formLabor"
							name="baseLabor"
							bind:value={formBaseLabor}
							class="cell-input w-full border border-(--line) rounded p-2 text-xs"
						/>
					</div>

					<!-- Silver Weight -->
					<div>
						<label class="block text-xs font-semibold text-(--muted) uppercase tracking-wider mb-1" for="formSilver">
							{t.silverWeightLabel}
						</label>
						<input
							type="number"
							step="0.1"
							id="formSilver"
							name="silverWeight"
							bind:value={formSilverWeight}
							class="cell-input w-full border border-(--line) rounded p-2 text-xs"
						/>
					</div>

					<!-- Stone Cost -->
					<div>
						<label class="block text-xs font-semibold text-(--muted) uppercase tracking-wider mb-1" for="formStone">
							{t.stoneCostLabel}
						</label>
						<input
							type="number"
							step="0.1"
							id="formStone"
							name="stoneCost"
							bind:value={formStoneCost}
							class="cell-input w-full border border-(--line) rounded p-2 text-xs"
						/>
					</div>
				</div>

				<!-- Row 4: English & Indonesian Notes (Side-by-Side) -->
				<div class="grid grid-cols-2 gap-4">
					<!-- English Notes -->
					<div>
						<label class="block text-xs font-semibold text-(--muted) uppercase tracking-wider mb-1" for="formNotesEn">
							{t.notesEnLabel}
						</label>
						<textarea
							id="formNotesEn"
							name="notes_en"
							rows="3"
							placeholder="English notes for Bali artisans..."
							bind:value={formNotesEn}
							class="cell-input w-full border border-(--line) rounded p-2 text-xs h-24"
						></textarea>
					</div>

					<!-- Indonesian Notes -->
					<div>
						<label class="block text-xs font-semibold text-(--muted) uppercase tracking-wider mb-1" for="formNotesId">
							{t.notesIdLabel}
						</label>
						<textarea
							id="formNotesId"
							name="notes_id"
							rows="3"
							placeholder="Catatan bahasa Indonesia..."
							bind:value={formNotesId}
							class="cell-input w-full border border-(--line) rounded p-2 text-xs h-24"
						></textarea>
					</div>
				</div>

				<!-- Row 5: Product Image & Image URL (Side-by-Side) -->
				<div class="grid grid-cols-2 gap-4">
					<!-- Image upload & drop zone -->
					<div class="space-y-2">
						<span class="block text-xs font-semibold text-(--muted) uppercase tracking-wider">
							Product Image Upload
						</span>
						<div 
							class="border-2 border-dashed border-(--line) rounded-lg p-2 text-center cursor-pointer hover:bg-slate-50 transition relative flex flex-col items-center justify-center gap-1.5 min-h-[96px] {isDragOver ? 'bg-indigo-50/50 border-(--brand)' : 'bg-slate-50/40'}"
							ondragover={handleDragOver}
							ondragleave={handleDragLeave}
							ondrop={handleDrop}
							onclick={triggerFileSelect}
							role="presentation"
						>
							{#if formImageUrl && formImageUrl.startsWith('data:image')}
								<img src={formImageUrl} alt="Preview" class="h-14 w-14 object-cover rounded border border-(--line) shadow-xs" />
								<button 
									type="button" 
									class="absolute top-1 right-1 bg-white/95 rounded-full p-0.5 shadow-sm border border-slate-100 hover:text-red-500 transition text-[10px] font-bold leading-none w-4 h-4 flex items-center justify-center cursor-pointer"
									onclick={(e) => { e.stopPropagation(); formImageUrl = ''; }}
								>
									&times;
								</button>
								<span class="text-[9px] text-slate-500 font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">Offline Optimized</span>
							{:else if formImageUrl}
								<img src={formImageUrl} alt="Preview" class="h-14 w-14 object-cover rounded border border-(--line) shadow-xs" />
								<button 
									type="button" 
									class="absolute top-1 right-1 bg-white/95 rounded-full p-0.5 shadow-sm border border-slate-100 hover:text-red-500 transition text-[10px] font-bold leading-none w-4 h-4 flex items-center justify-center cursor-pointer"
									onclick={(e) => { e.stopPropagation(); formImageUrl = ''; }}
								>
									&times;
								</button>
								<span class="text-[9px] text-slate-500 font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">Web URL</span>
							{:else}
								<svg class="w-6 h-6 text-(--muted) stroke-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
								<div class="text-[11px] text-slate-600 font-medium">
									Drag & drop, or <span class="text-(--brand) underline">browse</span>
								</div>
								<p class="text-[9px] text-(--muted)">Auto-optimized under 30KB</p>
							{/if}
						</div>
						<input type="file" accept="image/*" class="hidden" bind:this={fileInput} onchange={handleFileChange} />
						<input type="hidden" name="imageUrl" bind:value={formImageUrl} />
					</div>

					<!-- Image URL/Base64 -->
					<div class="flex flex-col justify-end pb-1.5">
						<label class="block text-xs font-semibold text-(--muted) uppercase tracking-wider mb-1" for="formImgUrl">
							{t.imageUrlLabel} / Base64 Data
						</label>
						<textarea 
							id="formImgUrl"
							placeholder="https://cdn.shopify.com/... or base64" 
							bind:value={formImageUrl}
							class="cell-input w-full border border-(--line) rounded p-2 text-xs h-24 select-all" 
						></textarea>
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="flex items-center justify-end gap-3 pt-4 border-t border-(--line)">
					<button
						type="button"
						onclick={closeModel}
						class="px-4 py-2 border border-(--line) hover:bg-slate-50 text-xs rounded transition cursor-pointer"
					>
						{t.cancel}
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-4 py-2 bg-(--brand) hover:bg-(--brand-dark) text-white font-medium rounded text-xs transition shadow-sm cursor-pointer"
					>
						{isSubmitting ? 'Saving...' : t.saveChanges}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
<!-- Hidden delete form -->
<form id="delete-form" method="POST" action="?/delete" class="hidden" use:enhance={() => {
	return async ({ result }) => {
		if (result.type === 'success') {
			showToast(t.productDeleted);
		} else {
			showToast('Error deleting product');
		}
	};
}}>
	<input type="hidden" name="styleCode" value={styleCodeToDelete} />
</form>

<!-- Delete Confirmation Modal -->
{#if styleCodeToDelete}
	<button type="button" class="modal-backdrop border-0 outline-hidden" aria-label="Cancel delete" onclick={() => styleCodeToDelete = null}></button>
	<div class="modal max-w-md w-full p-6 text-center" transition:fade={{ duration: 150 }} style="width: min(90vw, 440px); max-height: auto;">
		<div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 mb-4">
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
			</svg>
		</div>
		
		<h3 class="font-display text-2xl font-bold text-(--ink) mb-2">Delete product asset</h3>
		<p class="text-xs text-(--muted) mb-6 leading-relaxed">
			Are you sure you want to delete <span class="font-semibold text-(--ink)">{styleCodeToDelete}</span>? This cannot be undone.
		</p>
		
		<div class="flex items-center justify-center gap-3">
			<button
				type="button"
				onclick={() => styleCodeToDelete = null}
				class="px-4 py-2 border border-(--line) hover:bg-slate-50 text-xs font-semibold rounded transition cursor-pointer"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={() => {
					const formEl = document.getElementById('delete-form') as HTMLFormElement;
					if (formEl) {
						formEl.requestSubmit();
					}
					styleCodeToDelete = null;
				}}
				class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded text-xs transition shadow-sm cursor-pointer border-0"
			>
				Delete Asset
			</button>
		</div>
	</div>
{/if}

<style>
	:global(.custom-scroll)::-webkit-scrollbar {
		width: 4px;
	}
	:global(.custom-scroll)::-webkit-scrollbar-track {
		background: transparent;
	}
	:global(.custom-scroll)::-webkit-scrollbar-thumb {
		background: oklch(0.84 0.01 250);
		border-radius: 9999px;
	}
	:global(.custom-scroll)::-webkit-scrollbar-thumb:hover {
		background: oklch(0.45 0.02 55);
	}
</style>