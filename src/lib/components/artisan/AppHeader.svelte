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
		onToggleSidebar
	}: {
		t: Messages;
		currentLocale: 'en' | 'id';
		currentPath: string;
		lastSaved?: string;
		rightSidebarCollapsed?: boolean;
		onToggleRightSidebar?: () => void;
		onToggleSidebar: () => void;
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
				class={`px-2.5 py-1 rounded font-semibold text-xs leading-none transition-all no-underline ${currentLocale === 'en' ? 'bg-(--brand) text-white shadow-sm' : 'text-(--muted) hover:text-(--ink)'}`}
				aria-label="English US"
				title="English US"
			>
				US
			</a>
			<a
				href={idHref}
				class={`px-2.5 py-1 rounded font-semibold text-xs leading-none transition-all no-underline ${currentLocale === 'id' ? 'bg-(--brand) text-white shadow-sm' : 'text-(--muted) hover:text-(--ink)'}`}
				aria-label="Indonesia ID"
				title="Indonesia ID"
			>
				ID
			</a>
		</div>

		{#if showRightToggle}
			<!-- Right Sidebar Toggle Button -->
			<div class="relative group">
				<button
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