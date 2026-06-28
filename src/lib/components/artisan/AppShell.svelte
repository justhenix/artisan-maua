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
		onClickLogo,
		mainClass = '',
		activeView = 'dashboard',
		onClickDashboard,
		onClickWorkbench,
		children
	}: {
		t: Messages;
		currentLocale: 'en' | 'id';
		currentPath: string;
		headerLastSaved?: string;
		headerRightSidebarCollapsed?: boolean;
		headerOnToggleRightSidebar?: () => void;
		onReplayTour?: () => void;
		onClickLogo?: () => void;
		mainClass?: string;
		activeView?: 'dashboard' | 'workbench';
		onClickDashboard?: (e: MouseEvent) => void;
		onClickWorkbench?: (e: MouseEvent) => void;
		children: Snippet;
	} = $props();

	let sidebarCollapsed = $state(false);
	let mobileSidebarOpen = $state(false);
	let hasLoaded = $state(false);

	$effect(() => {
		const stored = localStorage.getItem('sidebarCollapsed');
		if (stored !== null) {
			sidebarCollapsed = stored === 'true';
		}
	});

	$effect(() => {
		if (!hasLoaded) {
			hasLoaded = true;
			return;
		}
		localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
	});

	$effect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			const target = event.target as HTMLElement;
			if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
				return;
			}
			
			const isAltL = event.altKey && (event.key === 'l' || event.key === 'L');
			if (event.key === '[' || isAltL) {
				event.preventDefault();
				toggleSidebar();
			}
		}
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

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
		{currentLocale}
		activePath={currentPath}
		bind:sidebarCollapsed
		bind:mobileSidebarOpen
		onToggleSidebar={toggleSidebar}
		onCloseMobileSidebar={closeMobileSidebar}
		{onReplayTour}
		{onClickLogo}
		{activeView}
		{onClickDashboard}
		{onClickWorkbench}
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