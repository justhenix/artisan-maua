<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import type { Pathname } from '$app/types';
	import { goto } from '$app/navigation';
	import { logout } from '$lib/auth';

	type Messages = Record<string, string>;

	let {
		t,
		currentLocale,
		activePath,
		sidebarCollapsed = $bindable(false),
		mobileSidebarOpen = $bindable(false),
		onToggleSidebar,
		onCloseMobileSidebar,
		onReplayTour,
		onClickLogo,
		activeView = 'dashboard',
		onClickDashboard,
		onClickWorkbench
	}: {
		t: Messages;
		currentLocale: 'en' | 'id';
		activePath: string;
		sidebarCollapsed: boolean;
		mobileSidebarOpen: boolean;
		onToggleSidebar: () => void;
		onCloseMobileSidebar: () => void;
		onReplayTour?: () => void;
		onClickLogo?: () => void;
		activeView?: 'dashboard' | 'workbench';
		onClickDashboard?: (e: MouseEvent) => void;
		onClickWorkbench?: (e: MouseEvent) => void;
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

	function handleLogout() {
		logout();
		goto('/login', { replaceState: true });
	}
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
				<a href={ordersHref} onclick={(e) => {
					if (onClickLogo && (activePath === '/' || activePath === '/id' || activePath === '/id/')) {
						e.preventDefault();
						onClickLogo();
					}
				}} class="sidebar-title flex items-center gap-2 no-underline text-inherit cursor-pointer hover:opacity-85 transition">
					<img src="/icon.webp" alt="Artisan Logo" class="w-8 h-8 object-contain" />
					<div>
						<p class="font-display text-xl leading-tight">Artisan</p>
						<p class="text-[10px] text-(--muted)">Order-to-Production</p>
					</div>
				</a>
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
				<a href={ordersHref} onclick={(e) => {
					if (onClickLogo && (activePath === '/' || activePath === '/id' || activePath === '/id/')) {
						e.preventDefault();
						onClickLogo();
					}
				}} class="w-10 h-10 flex items-center justify-center transition-opacity duration-150 group-hover:opacity-0 cursor-pointer">
					<img src="/icon.webp" alt="Artisan" class="w-10 h-10 object-contain" />
				</a>
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
				onclick={(e) => {
					if (onClickDashboard) {
						onClickDashboard(e);
					}
				}}
				class={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left transition border-0 no-underline ${
					isOrdersActive(activePath) && activeView === 'dashboard'
						? 'bg-(--nav-active) font-semibold text-(--ink) shadow-sm'
						: 'text-(--ink) hover:bg-(--surface-soft) bg-transparent'
				}`}
			>
				<i class="ri-dashboard-line text-lg" aria-hidden="true"></i>
				<span class="sidebar-label">{t.dashboard || 'Dashboard'}</span>
			</a>
			{#if sidebarCollapsed}
				<div class="absolute left-14 top-1/2 -translate-y-1/2 ml-2 bg-(--surface-muted) text-(--ink) text-[10px] font-semibold px-2 py-1 rounded shadow border border-(--line) whitespace-nowrap z-50 hidden group-hover:block">
					{t.dashboard || 'Dashboard'}
				</div>
			{/if}
		</div>

		<div class="relative group">
			<a
				href={ordersHref}
				onclick={(e) => {
					if (onClickWorkbench) {
						onClickWorkbench(e);
					}
				}}
				class={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left transition border-0 no-underline ${
					isOrdersActive(activePath) && activeView === 'workbench'
						? 'bg-(--nav-active) font-semibold text-(--ink) shadow-sm'
						: 'text-(--ink) hover:bg-(--surface-soft) bg-transparent'
				}`}
			>
				<i class="ri-file-list-3-line text-lg" aria-hidden="true"></i>
				<span class="sidebar-label">{t.workbench || 'Workbench'}</span>
			</a>
			{#if sidebarCollapsed}
				<div class="absolute left-14 top-1/2 -translate-y-1/2 ml-2 bg-(--surface-muted) text-(--ink) text-[10px] font-semibold px-2 py-1 rounded shadow border border-(--line) whitespace-nowrap z-50 hidden group-hover:block">
					{t.workbench || 'Workbench'}
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
					<svg class="w-4.5 h-4.5 shrink-0 text-(--muted) group-hover:text-(--ink) transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="16" x2="12" y2="12"></line>
						<line x1="12" y1="8" x2="12.01" y2="8"></line>
					</svg>
					<span class="sidebar-label">{t.guide}</span>
				</button>
				{#if sidebarCollapsed}
					<div class="absolute left-14 top-1/2 -translate-y-1/2 ml-2 bg-(--surface-muted) text-(--ink) text-[10px] font-semibold px-2 py-1 rounded shadow border border-(--line) whitespace-nowrap z-50 hidden group-hover:block">
						{t.guide}
					</div>
				{/if}
			</div>
		{/if}
	</nav>

	<!-- Logout -->
	<div class="relative group border-t border-(--line) mt-auto pt-3 pb-3">
		<button
			type="button"
			onclick={handleLogout}
			class="flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-left text-(--muted) hover:bg-(--surface-soft) hover:text-(--ink) transition cursor-pointer border-0 bg-transparent"
		>
			<i class="ri-logout-box-r-line text-lg shrink-0" aria-hidden="true"></i>
			<span class="sidebar-label text-sm">Sign out</span>
		</button>
		{#if sidebarCollapsed}
			<div class="absolute left-14 top-1/2 -translate-y-1/2 ml-2 bg-(--surface-muted) text-(--ink) text-[10px] font-semibold px-2 py-1 rounded shadow border border-(--line) whitespace-nowrap z-50 hidden group-hover:block">
				Sign out
			</div>
		{/if}
	</div>
</aside>