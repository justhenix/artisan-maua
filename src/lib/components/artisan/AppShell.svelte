<script lang="ts">
	import type { Snippet } from 'svelte';
	import Sidebar from './Sidebar.svelte';
	import AppHeader from './AppHeader.svelte';

	type Messages = Record<string, string>;

	let {
		t,
		currentLocale,
		currentPath,
		headerLastSaved,
		headerRightSidebarCollapsed,
		headerOnToggleRightSidebar,
		onReplayTour,
		mainClass = '',
		children
	}: {
		t: Messages;
		currentLocale: 'en' | 'id';
		currentPath: string;
		headerLastSaved?: string;
		headerRightSidebarCollapsed?: boolean;
		headerOnToggleRightSidebar?: () => void;
		onReplayTour?: () => void;
		mainClass?: string;
		children: Snippet;
	} = $props();

	let sidebarCollapsed = $state(false);
	let mobileSidebarOpen = $state(false);

	function toggleSidebar() {
		if (typeof window !== 'undefined' && window.innerWidth < 1024) {
			mobileSidebarOpen = !mobileSidebarOpen;
			return;
		}
		sidebarCollapsed = !sidebarCollapsed;
	}

	function closeMobileSidebar() {
		mobileSidebarOpen = false;
	}
</script>

<div class={`app-shell ${sidebarCollapsed ? 'app-shell-collapsed' : ''}`}>
	<Sidebar
		{t}
		activePath={currentPath}
		bind:sidebarCollapsed
		bind:mobileSidebarOpen
		onToggleSidebar={toggleSidebar}
		onCloseMobileSidebar={closeMobileSidebar}
		{onReplayTour}
	/>

	<section class={`app-main ${mainClass}`}>
		<AppHeader
			{t}
			{currentLocale}
			currentPath={currentPath}
			lastSaved={headerLastSaved}
			rightSidebarCollapsed={headerRightSidebarCollapsed}
			onToggleRightSidebar={headerOnToggleRightSidebar}
			onToggleSidebar={toggleSidebar}
		/>

		{@render children()}
	</section>
</div>