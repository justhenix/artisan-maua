<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { isLoggedIn } from '$lib/auth';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	// Auth guard — runs on every navigation in the browser
	$effect(() => {
		if (!browser) return;
		const path = page.url.pathname;
		const onLoginPage = path === '/login' || path === '/id/login';
		const loggedIn = isLoggedIn();

		if (!loggedIn && !onLoginPage) {
			goto('/login', { replaceState: true });
		} else if (loggedIn && onLoginPage) {
			goto('/', { replaceState: true });
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

<div style="display:none">
	{#each locales as locale (locale)}
		<a
			href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}
		>{locale}</a>
	{/each}
</div>
