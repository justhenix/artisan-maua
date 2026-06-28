<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { login, isLoggedIn } from '$lib/auth';
	import logoUrl from '$lib/assets/favicon.svg';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	// If already logged in, go straight to the app
	$effect(() => {
		if (browser && isLoggedIn()) {
			goto('/', { replaceState: true });
		}
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		// Tiny async tick so the loading state renders before the sync work
		setTimeout(() => {
			const ok = login(email.trim(), password);
			if (ok) {
				goto('/', { replaceState: true });
			} else {
				error = 'Invalid demo credentials.';
				loading = false;
			}
		}, 120);
	}
</script>

<svelte:head>
	<title>Sign in · Artisan</title>
	<meta name="description" content="Sign in to Artisan – AI order-to-production assistant" />
</svelte:head>

<main class="login-root">
	<div class="login-card">
		<!-- Logo + Brand -->
		<div class="login-brand">
			<img src={logoUrl} alt="Artisan" class="login-logo" />
			<div>
				<h1 class="login-title">Artisan</h1>
				<p class="login-subtitle">AI order-to-production assistant<br />for Heather Benjamin Jewelry</p>
			</div>
		</div>

		<!-- Form -->
		<form onsubmit={handleSubmit} class="login-form" novalidate>
			<div class="field-group">
				<label for="email" class="field-label">Email</label>
				<input
					id="email"
					type="email"
					autocomplete="email"
					class="field-input"
					placeholder="admin@artisan.hbj"
					bind:value={email}
					disabled={loading}
					required
				/>
			</div>

			<div class="field-group">
				<label for="password" class="field-label">Password</label>
				<input
					id="password"
					type="password"
					autocomplete="current-password"
					class="field-input"
					placeholder="••••••••"
					bind:value={password}
					disabled={loading}
					required
				/>
			</div>

			{#if error}
				<p class="login-error" role="alert">{error}</p>
			{/if}

			<button type="submit" class="login-button" disabled={loading}>
				{#if loading}
					<span class="login-spinner" aria-hidden="true"></span>
					Signing in…
				{:else}
					Sign in
				{/if}
			</button>

			<p class="login-helper">Demo access only</p>
		</form>
	</div>
</main>

<style>
	.login-root {
		min-height: 100svh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: oklch(0.97 0.004 250);
		padding: 24px;
		font-family: Inter, ui-sans-serif, system-ui, sans-serif;
	}

	.login-card {
		background: white;
		border: 1px solid oklch(0.84 0.01 250);
		border-radius: 12px;
		box-shadow: 0 4px 24px rgb(0 0 0 / 0.06), 0 1px 4px rgb(0 0 0 / 0.04);
		padding: 40px 44px;
		width: 100%;
		max-width: 420px;
	}

	.login-brand {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 32px;
	}

	.login-logo {
		width: 44px;
		height: 44px;
		object-fit: contain;
		flex-shrink: 0;
	}

	.login-title {
		font-family: "STK Bureau Serif", Georgia, "Times New Roman", serif;
		font-size: 1.75rem;
		font-weight: 700;
		line-height: 1.1;
		color: oklch(0.19 0.03 45);
		margin: 0;
	}

	.login-subtitle {
		font-size: 0.75rem;
		color: oklch(0.45 0.02 55);
		line-height: 1.5;
		margin: 4px 0 0;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: oklch(0.35 0.025 45);
	}

	.field-input {
		border: 1px solid oklch(0.84 0.01 250);
		border-radius: 6px;
		background: oklch(0.98 0.002 250);
		color: oklch(0.19 0.03 45);
		font-size: 0.9375rem;
		padding: 10px 14px;
		outline: none;
		transition: border-color 150ms, box-shadow 150ms, background 150ms;
		width: 100%;
		box-sizing: border-box;
	}

	.field-input:focus {
		border-color: oklch(0.47 0.055 230);
		background: white;
		box-shadow: 0 0 0 3px color-mix(in srgb, oklch(0.47 0.055 230) 14%, transparent);
	}

	.field-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.login-error {
		background: oklch(0.97 0.018 75);
		border: 1px solid oklch(0.72 0.13 65);
		border-radius: 6px;
		color: oklch(0.28 0.07 45);
		font-size: 0.8125rem;
		font-weight: 600;
		padding: 10px 14px;
		margin: 0;
	}

	.login-button {
		background: oklch(0.47 0.055 230);
		border: none;
		border-radius: 6px;
		color: white;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		font-size: 0.9375rem;
		font-weight: 700;
		padding: 11px 20px;
		transition: background 150ms, opacity 150ms;
		width: 100%;
		margin-top: 2px;
	}

	.login-button:hover:not(:disabled) {
		background: oklch(0.35 0.045 230);
	}

	.login-button:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	.login-spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid rgb(255 255 255 / 0.35);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.login-helper {
		font-size: 0.75rem;
		color: oklch(0.55 0.015 250);
		text-align: center;
		margin: 0;
	}
</style>
