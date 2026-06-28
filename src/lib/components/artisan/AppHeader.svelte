<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import type { Pathname } from '$app/types';

	type Messages = Record<string, string>;

	let {
		t,
		currentLocale,
		currentPath,
		lastSaved,
		rightSidebarCollapsed,
		onToggleRightSidebar,
		onToggleSidebar,
		onReplayTour
	}: {
		t: Messages;
		currentLocale: 'en' | 'id';
		currentPath: string;
		lastSaved?: string;
		rightSidebarCollapsed?: boolean;
		onToggleRightSidebar?: () => void;
		onToggleSidebar: () => void;
		onReplayTour?: () => void;
	} = $props();

	const showRightToggle = $derived(
		rightSidebarCollapsed !== undefined && onToggleRightSidebar !== undefined
	);

	const enHref = $derived(resolve(localizeHref(currentPath, { locale: 'en' }) as Pathname));
	const idHref = $derived(resolve(localizeHref(currentPath, { locale: 'id' }) as Pathname));
</script>

<header class="app-header flex items-center justify-between px-6 py-3 border-b border-(--line) bg-white">
	<div class="flex items-center gap-4">
		<button class="icon-button header-toggle" type="button" aria-label={t.toggleSidebar} onclick={onToggleSidebar}>
			<i class="ri-menu-line text-lg" aria-hidden="true"></i>
		</button>
		{#if lastSaved}
			<span class="text-xs text-(--muted)">{t.lastSaved} {lastSaved}</span>
		{/if}
	</div>
	<div class="flex items-center gap-4">
		<!-- i18n Language Segment Control -->
		<div class="flex items-center gap-1 border border-(--line) rounded bg-(--surface-soft) p-0.5 text-xs shadow-sm">
			<a
				href={enHref}
				class={`flex items-center justify-center p-1.5 rounded transition-all no-underline ${currentLocale === 'en' ? 'bg-(--brand) shadow-sm' : 'hover:bg-slate-150/50'}`}
				aria-label="English US"
				title="English US"
			>
				<svg viewBox="0 0 19 10" class="w-5 h-3 rounded-2xs overflow-hidden shadow-2xs border border-slate-200/40">
					<rect width="19" height="10" fill="#B22234"/>
					<path d="M0,0.77h19M0,2.31h19M0,3.85h19M0,5.38h19M0,6.92h19M0,8.46h19" stroke="#fff" stroke-width="0.77"/>
					<rect width="7.6" height="5.38" fill="#3C3B6E"/>
					<g fill="#fff">
						<circle cx="0.8" cy="0.6" r="0.2"/>
						<circle cx="2.0" cy="0.6" r="0.2"/>
						<circle cx="3.2" cy="0.6" r="0.2"/>
						<circle cx="4.4" cy="0.6" r="0.2"/>
						<circle cx="5.6" cy="0.6" r="0.2"/>
						<circle cx="6.8" cy="0.6" r="0.2"/>
						<circle cx="1.4" cy="1.2" r="0.2"/>
						<circle cx="2.6" cy="1.2" r="0.2"/>
						<circle cx="3.8" cy="1.2" r="0.2"/>
						<circle cx="5.0" cy="1.2" r="0.2"/>
						<circle cx="6.2" cy="1.2" r="0.2"/>
						<circle cx="0.8" cy="1.8" r="0.2"/>
						<circle cx="2.0" cy="1.8" r="0.2"/>
						<circle cx="3.2" cy="1.8" r="0.2"/>
						<circle cx="4.4" cy="1.8" r="0.2"/>
						<circle cx="5.6" cy="1.8" r="0.2"/>
						<circle cx="6.8" cy="1.8" r="0.2"/>
						<circle cx="1.4" cy="2.4" r="0.2"/>
						<circle cx="2.6" cy="2.4" r="0.2"/>
						<circle cx="3.8" cy="2.4" r="0.2"/>
						<circle cx="5.0" cy="2.4" r="0.2"/>
						<circle cx="6.2" cy="2.4" r="0.2"/>
						<circle cx="0.8" cy="3.0" r="0.2"/>
						<circle cx="2.0" cy="3.0" r="0.2"/>
						<circle cx="3.2" cy="3.0" r="0.2"/>
						<circle cx="4.4" cy="3.0" r="0.2"/>
						<circle cx="5.6" cy="3.0" r="0.2"/>
						<circle cx="6.8" cy="3.0" r="0.2"/>
						<circle cx="1.4" cy="3.6" r="0.2"/>
						<circle cx="2.6" cy="3.6" r="0.2"/>
						<circle cx="3.8" cy="3.6" r="0.2"/>
						<circle cx="5.0" cy="3.6" r="0.2"/>
						<circle cx="6.2" cy="3.6" r="0.2"/>
						<circle cx="0.8" cy="4.2" r="0.2"/>
						<circle cx="2.0" cy="4.2" r="0.2"/>
						<circle cx="3.2" cy="4.2" r="0.2"/>
						<circle cx="4.4" cy="4.2" r="0.2"/>
						<circle cx="5.6" cy="4.2" r="0.2"/>
						<circle cx="6.8" cy="4.2" r="0.2"/>
						<circle cx="1.4" cy="4.8" r="0.2"/>
						<circle cx="2.6" cy="4.8" r="0.2"/>
						<circle cx="3.8" cy="4.8" r="0.2"/>
						<circle cx="5.0" cy="4.8" r="0.2"/>
						<circle cx="6.2" cy="4.8" r="0.2"/>
					</g>
				</svg>
			</a>
			<a
				href={idHref}
				class={`flex items-center justify-center p-1.5 rounded transition-all no-underline ${currentLocale === 'id' ? 'bg-(--brand) shadow-sm' : 'hover:bg-slate-150/50'}`}
				aria-label="Indonesia ID"
				title="Indonesia ID"
			>
				<svg viewBox="0 0 3 2" class="w-5 h-3 rounded-2xs overflow-hidden shadow-2xs border border-slate-200/40">
					<rect width="3" height="1" fill="#E70011" />
					<rect y="1" width="3" height="1" fill="#FFFFFF" />
				</svg>
			</a>
		</div>
		
		<!-- Help Tour Launcher Button (using native SVG info icon) -->
		{#if onReplayTour}
			<div class="relative group">
				<button
					id="header-help-btn"
					class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-(--surface-soft) text-(--muted) hover:text-(--ink) transition bg-transparent border-0 p-0 cursor-pointer"
					type="button"
					aria-label={t.replayTour}
					onclick={onReplayTour}
				>
					<svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="16" x2="12" y2="12"></line>
						<line x1="12" y1="8" x2="12.01" y2="8"></line>
					</svg>
				</button>
				<div class="absolute left-1/2 -translate-x-1/2 top-10 bg-(--surface-muted) text-(--ink) text-[10px] font-semibold px-2 py-1 rounded shadow border border-(--line) whitespace-nowrap z-50 hidden group-hover:block">
					{t.replayTour}
				</div>
			</div>
		{/if}

		{#if showRightToggle}
			<!-- Right Sidebar Toggle Button -->
			<div class="relative group">
				<button
					id="control-panel-btn"
					class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-(--surface-soft) text-(--muted) hover:text-(--ink) transition bg-transparent border-0 p-0 cursor-pointer"
					type="button"
					aria-label={rightSidebarCollapsed ? t.openRightPanel : t.closeRightPanel}
					onclick={onToggleRightSidebar}
				>
					{#if rightSidebarCollapsed}
						<i class="ri-layout-right-line text-lg"></i>
					{:else}
						<i class="ri-layout-right-fill text-lg text-(--brand)"></i>
					{/if}
				</button>
				<div class="absolute right-0 top-10 bg-(--surface-muted) text-(--ink) text-[10px] font-semibold px-2 py-1 rounded shadow border border-(--line) whitespace-nowrap z-50 hidden group-hover:block">
					{rightSidebarCollapsed ? t.openRightPanel : t.closeRightPanel}
				</div>
			</div>
		{/if}
	</div>
</header>