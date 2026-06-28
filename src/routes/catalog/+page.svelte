<script lang="ts">
	import { page } from '$app/state';
	import AppShell from '$lib/components/artisan/AppShell.svelte';
	import { fallbackCatalog, type CatalogItem } from '$lib/data/fallbackCatalog';
	import enMessages from '../../../messages/en.json';
	import idMessages from '../../../messages/id.json';

	type Locale = 'en' | 'id';
	type AppMessages = typeof enMessages;

	let { data }: { data: { catalogItems: CatalogItem[] } } = $props();

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
	let categoryFilter = $state<string>('all');
	let materialFilter = $state<string>('all');

	const categories = $derived(
		Array.from(new Set(items.map((i) => i.category))).sort()
	);
	const materials = $derived(
		Array.from(new Set(items.map((i) => i.material))).sort()
	);

	const filtered = $derived(
		items.filter((item) => {
			if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
			if (materialFilter !== 'all' && item.material !== materialFilter) return false;
			if (!search.trim()) return true;
			const needle = search.trim().toLowerCase();
			const haystack = [
				item.styleCode,
				item.creativeTitle,
				item.category,
				item.material,
				item.notes_en,
				item.notes_id
			]
				.join(' ')
				.toLowerCase();
			return haystack.includes(needle);
		})
	);

	function clearFilters() {
		search = '';
		categoryFilter = 'all';
		materialFilter = 'all';
	}

	function categoryLabel(category: string): string {
		if (category === 'Pins' || category === 'Brim Pinches') return t.pinsAndBrim;
		if (category === 'Traditional Jewelry') return t.categoryTraditional;
		return t.categoryOther;
	}

	function materialLabel(material: string): string {
		if (material === 'Silver') return t.silverProduction;
		if (material === 'Gold') return t.goldProduction;
		return t.otherMaterials;
	}

	function imageUrl(item: CatalogItem, size: 'thumb' | 'card'): string {
		if (!item.imageUrl) return '';
		if (size === 'card') {
			return item.imageUrl.replace('w=120&h=120', 'w=320&h=320');
		}
		return item.imageUrl;
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
>
	<div class="flex-1 overflow-y-auto p-6 md:p-10 font-sans">
		<div class="mx-auto max-w-6xl">
			<header class="mb-8">
				<h1 class="font-display text-3xl md:text-4xl font-bold tracking-tight text-(--ink)">
					{t.catalogTitle}
				</h1>
				<p class="mt-2 text-sm text-(--muted)">{t.catalogDesc}</p>
			</header>

			<!-- Filter row -->
			<div class="mb-6 space-y-4">
				<input
					type="search"
					class="cell-input w-full"
					placeholder={t.searchCatalog}
					bind:value={search}
					aria-label={t.searchCatalog}
				/>

				<div class="flex flex-wrap items-center gap-2">
					<button
						class={`chip ${categoryFilter === 'all' ? 'chip-active' : ''}`}
						type="button"
						onclick={() => (categoryFilter = 'all')}
					>
						{t.allCategories}
					</button>
					{#each categories as category (category)}
						<button
							class={`chip ${categoryFilter === category ? 'chip-active' : ''}`}
							type="button"
							onclick={() => (categoryFilter = category)}
						>
							{categoryLabel(category)}
						</button>
					{/each}
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<button
						class={`chip ${materialFilter === 'all' ? 'chip-active' : ''}`}
						type="button"
						onclick={() => (materialFilter = 'all')}
					>
						{t.allMaterials}
					</button>
					{#each materials as material (material)}
						<button
							class={`chip ${materialFilter === material ? 'chip-active' : ''}`}
							type="button"
							onclick={() => (materialFilter = material)}
						>
							{materialLabel(material)}
						</button>
					{/each}
				</div>
			</div>

			<!-- Card grid or empty state -->
			{#if filtered.length === 0}
				<div
					class="flex flex-col items-center justify-center rounded-lg border border-(--line) bg-white px-6 py-16 text-center"
				>
					<div
						class="w-14 h-14 rounded-full bg-(--surface-muted) flex items-center justify-center text-(--muted)"
					>
						<i class="ri-search-eye-line text-2xl" aria-hidden="true"></i>
					</div>
					<h2 class="mt-5 font-display text-xl text-(--ink)">{t.noCatalogMatches}</h2>
					<p class="mt-2 text-sm text-(--muted)">{t.tryAdjusting}</p>
					<button class="ghost-button mt-6 px-4 py-2 text-sm" type="button" onclick={clearFilters}>
						{t.clearFilters}
					</button>
				</div>
			{:else if items.length === 0}
				<div
					class="flex flex-col items-center justify-center rounded-lg border border-(--line) bg-white px-6 py-16 text-center"
				>
					<h2 class="font-display text-xl text-(--ink)">{t.noCatalogAvailable}</h2>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
					{#each filtered as item (item.styleCode)}
						{@const isEnglishPrimary = currentLocale === 'en'}
						<article
							class="flex flex-col rounded-lg border border-(--line) bg-white overflow-hidden shadow-sm"
						>
							{#if item.imageUrl}
								<img
									src={imageUrl(item, 'card')}
									alt={item.creativeTitle}
									class="w-full aspect-square object-cover bg-(--surface-soft)"
									loading="lazy"
								/>
							{:else}
								<div
									class="w-full aspect-square flex items-center justify-center bg-(--surface-soft) text-(--muted) border-b border-(--line)"
								>
									<i class="ri-image-line text-3xl" aria-hidden="true"></i>
								</div>
							{/if}

							<div class="flex flex-col flex-1 p-5">
								<p class="font-mono text-xs text-(--muted)">{item.styleCode}</p>
								<h2 class="mt-1 font-display text-xl font-bold text-(--ink) leading-tight">
									{item.creativeTitle}
								</h2>

								<div class="mt-3 flex flex-wrap gap-1.5">
									<span
										class="inline-flex items-center rounded border border-(--line) bg-(--surface-soft) px-2 py-0.5 text-xs font-medium text-(--muted)"
									>
										{categoryLabel(item.category)}
									</span>
									<span
										class="inline-flex items-center rounded border border-(--line) bg-(--surface-soft) px-2 py-0.5 text-xs font-medium text-(--muted)"
									>
										{item.material}
									</span>
								</div>

								<div class="mt-4 border-t border-(--line) pt-4 space-y-3">
									<div>
										<p
											class={`text-[10px] uppercase tracking-wider font-semibold ${
												isEnglishPrimary ? 'text-(--brand)' : 'text-(--muted)'
											}`}
										>
											EN
										</p>
										<p
											class={`mt-1 text-sm leading-relaxed ${
												isEnglishPrimary
													? 'font-semibold text-(--ink)'
													: 'text-(--muted)'
											}`}
										>
											{item.notes_en}
										</p>
									</div>
									<div>
										<p
											class={`text-[10px] uppercase tracking-wider font-semibold ${
												!isEnglishPrimary ? 'text-(--brand)' : 'text-(--muted)'
											}`}
										>
											ID
										</p>
										<p
											class={`mt-1 text-sm leading-relaxed ${
												!isEnglishPrimary
													? 'font-semibold text-(--ink)'
													: 'text-(--muted)'
											}`}
										>
											{item.notes_id}
										</p>
									</div>
								</div>

								<div
									class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--muted)"
								>
									<span>
										<span class="font-semibold">{t.silverWeight}:</span>
										{item.silverWeight.toFixed(1)} g
									</span>
									{#if item.stoneCost > 0}
										<span>
											<span class="font-semibold">{t.stones}:</span>
											${item.stoneCost.toFixed(2)}
										</span>
									{/if}
								</div>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</AppShell>