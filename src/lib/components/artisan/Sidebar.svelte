<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import type { Pathname } from '$app/types';

	type Messages = Record<string, string>;

	let {
		t,
		currentLocale,
		activePath,
		sidebarCollapsed = $bindable(false),
		mobileSidebarOpen = $bindable(false),
		onToggleSidebar,
		onCloseMobileSidebar,
		onReplayTour
	}: {
		t: Messages;
		currentLocale: 'en' | 'id';
		activePath: string;
		sidebarCollapsed: boolean;
		mobileSidebarOpen: boolean;
		onToggleSidebar: () => void;
		onCloseMobileSidebar: () => void;
		onReplayTour?: () => void;
	} = $props();

	function isOrdersActive(path: string): boolean {
		const normalized = path.replace(/\/$/, '');
		return normalized === '' || normalized === '/id' || normalized.startsWith('/orders');
	}

	function isCatalogActive(path: string): boolean {
		return path === '/catalog' || path === '/id/catalog' || path.startsWith('/catalog/') || path.startsWith('/id/catalog/');
	}

	const ordersHref = $derived(resolve(localizeHref('/', { locale: currentLocale }) as Pathname));
	const catalogHref = $derived(resolve(localizeHref('/catalog', { locale: currentLocale }) as Pathname));
</script>

{#if mobileSidebarOpen}
	<button
		class="sidebar-backdrop"
		type="button"
		aria-label={t.closeSidebar}
		onclick={onCloseMobileSidebar}
	></button>
{/if}

<aside
	class={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileSidebarOpen ? 'sidebar-open' : ''} flex flex-col h-screen`}
>
	<div class="sidebar-heading" id="sidebar-logo">
		{#if !sidebarCollapsed}
			<!-- Open State Header -->
			<div class="flex w-full items-center justify-between">
				<div class="sidebar-title flex items-center">
					<img src="/logo.webp" alt="Artisan" class="h-9 w-auto object-contain" />
				</div>
				<div class="relative group">
					<button
						class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-(--surface-muted) text-(--muted) hover:text-(--ink) transition bg-transparent border-0 p-0 cursor-pointer"
						type="button"
						aria-label={t.closeSidebar}
						onclick={onToggleSidebar}
					>
						<i class="ri-sidebar-fold-line text-lg"></i>
					</button>
					<div class="absolute right-10 top-1/2 -translate-y-1/2 bg-(--surface-muted) text-(--ink) text-[10px] font-semibold px-2 py-1 rounded shadow border border-(--line) whitespace-nowrap z-50 hidden group-hover:block">
						{t.closeSidebar}
					</div>
				</div>
			</div>
		{:else}
			<!-- Collapsed State Header -->
			<div class="relative w-10 h-10 flex items-center justify-center mx-auto group">
				<div class="w-8 h-8 flex items-center justify-center transition-opacity duration-150 group-hover:opacity-0">
					<img src="/icon.webp" alt="Artisan" class="w-8 h-8 object-contain" />
				</div>
				<button
					class="absolute inset-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-(--surface-muted) text-(--muted) hover:text-(--ink) opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-transparent border-0 p-0 cursor-pointer"
					type="button"
					aria-label={t.openSidebar}
					onclick={onToggleSidebar}
				>
					<i class="ri-sidebar-unfold-line text-lg"></i>
				</button>
				<div class="absolute left-12 top-1/2 -translate-y-1/2 ml-2 bg-(--surface-muted) text-(--ink) text-[10px] font-semibold px-2 py-1 rounded shadow border border-(--line) whitespace-nowrap z-50 hidden group-hover:block">
					{t.openSidebar}
				</div>
			</div>
		{/if}
	</div>

	<nav class="mt-10 space-y-2 flex-1">
		<div class="relative group">
			<a
				href={ordersHref}
				class={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left transition border-0 no-underline ${
					isOrdersActive(activePath)
						? 'bg-(--nav-active) font-semibold text-(--ink) shadow-sm'
						: 'text-(--ink) hover:bg-(--surface-soft) bg-transparent'
				}`}
			>
				<i class="ri-file-list-3-line text-lg" aria-hidden="true"></i>
				<span class="sidebar-label">{t.orders}</span>
			</a>
			{#if sidebarCollapsed}
				<div class="absolute left-14 top-1/2 -translate-y-1/2 ml-2 bg-(--surface-muted) text-(--ink) text-[10px] font-semibold px-2 py-1 rounded shadow border border-(--line) whitespace-nowrap z-50 hidden group-hover:block">
					{t.orders}
				</div>
			{/if}
		</div>

		<div class="relative group">
			<a
				href={catalogHref}
				class={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left transition border-0 no-underline ${
					isCatalogActive(activePath)
						? 'bg-(--nav-active) font-semibold text-(--ink) shadow-sm'
						: 'text-(--ink) hover:bg-(--surface-soft) bg-transparent'
				}`}
			>
				<i class="ri-book-open-line text-lg" aria-hidden="true"></i>
				<span class="sidebar-label">{t.catalog}</span>
			</a>
			{#if sidebarCollapsed}
				<div class="absolute left-14 top-1/2 -translate-y-1/2 ml-2 bg-(--surface-muted) text-(--ink) text-[10px] font-semibold px-2 py-1 rounded shadow border border-(--line) whitespace-nowrap z-50 hidden group-hover:block">
					{t.catalog}
				</div>
			{/if}
		</div>

		{#if onReplayTour}
			<div class="relative group">
				<button
					id="replay-tour-btn"
					class="flex w-full items-center gap-3 rounded-md px-4 py-3 text-left text-(--ink) hover:bg-(--surface-soft) transition cursor-pointer border-0 bg-transparent"
					type="button"
					onclick={onReplayTour}
				>
					<i class="ri-question-line text-lg" aria-hidden="true"></i>
					<span class="sidebar-label">{t.replayTour}</span>
				</button>
				{#if sidebarCollapsed}
					<div class="absolute left-14 top-1/2 -translate-y-1/2 ml-2 bg-(--surface-muted) text-(--ink) text-[10px] font-semibold px-2 py-1 rounded shadow border border-(--line) whitespace-nowrap z-50 hidden group-hover:block">
						{t.replayTour}
					</div>
				{/if}
			</div>
		{/if}
	</nav>
</aside>