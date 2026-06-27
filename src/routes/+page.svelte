<script lang="ts">
	import { browser } from '$app/environment';

	type Step = 1 | 2 | 3 | 4;
	type Tab = 'production' | 'packing' | 'customer';

	type Blocker = {
		id: string;
		impact: 'High impact' | 'Medium impact';
		question: string;
		evidence: string;
		source: string;
		risk: string;
		options: string[];
		answer: string;
	};

	type LineItem = {
		id: string;
		item: string;
		styleCode: string;
		qty: number;
		finish: string;
		notes: string;
		source: string;
	};

	const storageKey = 'artisan-demo-flow-v1';
	const orderId = 'HB-250416';
	const client = 'Driftwood Collective';

	const sourceTypes = ['Email', 'DM', 'Spreadsheet rows', 'PO text'];
	const steps: { id: Step; label: string }[] = [
		{ id: 1, label: 'Add order' },
		{ id: 2, label: 'Review order' },
		{ id: 3, label: 'Sheets' },
		{ id: 4, label: 'Update customer' }
	];

	const sampleOrder = `From: Mia Chen <mia@driftwoodcollective.com>
Subject: Re: New pieces for Summer

Hi Heather,
Here's what we're hoping to get for our July drop.
PO#: DC-0725
Ship to: Driftwood Collective, 123 Ocean Ave, Santa Cruz, CA 95060

Item                   Qty   Finish             Notes
---------------------------------------------------------------
Horse Pin Medium       12    Silver             Please match last order
Mountain Pendant       6     Mother of Pearl    Can we get with longer chain?
Wave Cuff              4     Silver             6.5" if possible
Starburst Studs        24    Gold Vermeil       12 pr per card?
Thin Stacking Ring     20    Silver             Size 7 & 8 mix

CSV pasted below:
Item,Qty,Material/Finish,Notes
Cable Chain 18",10,Silver,Need by 7/10
Bali Starburst (Large),8,Silver,OK to sub similar if OOS

Sent via Instagram DM 6/1: "Do you have more wave cuffs in stock?"`;

	const initialBlockers = (): Blocker[] => [
		{
			id: 'starburst-size',
			impact: 'High impact',
			question: 'Which Starburst size should Bali make?',
			evidence: 'mini star',
			source: 'Pasted DM',
			risk: 'Size changes casting, stone layout, packing count, and production time.',
			options: ['Mini', 'Small', 'Large'],
			answer: ''
		},
		{
			id: 'horse-pin-size',
			impact: 'Medium impact',
			question: 'Which Horse Pin size is this?',
			evidence: 'new smaller horse pin',
			source: 'Copied PO text',
			risk: 'Horse Pin sizes map to different style codes and wholesale packing labels.',
			options: ['Small', 'Medium', 'Large'],
			answer: ''
		}
	];

	const initialLineItems = (): LineItem[] => [
		{
			id: 'horse-medium',
			item: 'Horse Pin Medium',
			styleCode: 'HB-HORSE-M',
			qty: 12,
			finish: 'Silver',
			notes: 'Match last order',
			source: 'Copied PO text'
		},
		{
			id: 'mountain-pendant',
			item: 'Mountain Pendant',
			styleCode: 'HB-MTN-P',
			qty: 6,
			finish: 'Mother of Pearl',
			notes: 'Confirm longer chain',
			source: 'Copied PO text'
		},
		{
			id: 'wave-cuff',
			item: 'Wave Cuff',
			styleCode: 'HB-WAVE-C',
			qty: 4,
			finish: 'Silver',
			notes: '6.5" if possible',
			source: 'Copied PO text'
		},
		{
			id: 'starburst-studs',
			item: 'Starburst Studs',
			styleCode: 'HB-SB-STUD',
			qty: 24,
			finish: 'Gold Vermeil',
			notes: 'Pack 12 pairs per card',
			source: 'Copied PO text'
		},
		{
			id: 'thin-stacking-ring',
			item: 'Thin Stacking Ring',
			styleCode: 'HB-TSR-2',
			qty: 20,
			finish: 'Silver',
			notes: 'Mix sizes 7 and 8',
			source: 'Copied PO text'
		},
		{
			id: 'cable-chain',
			item: 'Cable Chain 18"',
			styleCode: 'HB-CC-18',
			qty: 10,
			finish: 'Silver',
			notes: 'Need by 7/10',
			source: 'CSV row'
		},
		{
			id: 'bali-starburst',
			item: 'Bali Starburst Mini',
			styleCode: 'HB-SB-MINI',
			qty: 8,
			finish: 'Silver',
			notes: "Resolved from 'mini star'",
			source: 'Pasted DM'
		},
		{
			id: 'horse-unclear',
			item: 'Horse Pin Small',
			styleCode: 'HB-HORSE-S',
			qty: 6,
			finish: 'Silver',
			notes: "Resolved from 'new smaller horse pin'",
			source: 'Copied PO text'
		}
	];

	const initialCustomerUpdate = `Hi Mia,

Thank you for your order. We reviewed the details and everything needed for production is now ready.

Order summary
- 8 items
- Total quantity: 90
- Finishes: Silver, Gold Vermeil, Mother of Pearl

Timeline
- Production start: June 3, 2026
- Estimated completion: June 20, 2026
- Need by: July 10, 2026

We will send another update once production begins. Please reach out if anything needs to change.

Thank you,
Heather Benjamin Jewelry`;

	let currentStep = $state<Step>(1);
	let selectedSource = $state('Email');
	let intakeText = $state(sampleOrder);
	let blockers = $state<Blocker[]>(initialBlockers());
	let lineItems = $state<LineItem[]>(initialLineItems());
	let activeTab = $state<Tab>('production');
	let customerUpdate = $state(initialCustomerUpdate);
	let sheetDirty = $state(false);
	let lastSaved = $state('10:42 AM');
	let exportOpen = $state(false);
	let toast = $state('');
	let sent = $state(false);
	let contentPanel = $state<HTMLDivElement | undefined>();
	let sidebarCollapsed = $state(false);
	let mobileSidebarOpen = $state(false);

	const remainingAnswers = $derived(blockers.filter((blocker) => !blocker.answer).length);
	const allAnswered = $derived(remainingAnswers === 0);
	const totalQty = $derived(lineItems.reduce((sum, item) => sum + Number(item.qty || 0), 0));
	const maxStep = $derived(currentStep);

	if (browser) {
		const saved = sessionStorage.getItem(storageKey);
		if (saved) {
			try {
				const parsed = JSON.parse(saved) as {
					currentStep?: Step;
					selectedSource?: string;
					intakeText?: string;
					blockers?: Blocker[];
					lineItems?: LineItem[];
					activeTab?: Tab;
					customerUpdate?: string;
					sheetDirty?: boolean;
					lastSaved?: string;
					sent?: boolean;
				};
				currentStep = parsed.currentStep ?? 1;
				selectedSource = parsed.selectedSource ?? 'Email';
				intakeText = parsed.intakeText ?? sampleOrder;
				blockers = parsed.blockers ?? initialBlockers();
				lineItems = parsed.lineItems ?? initialLineItems();
				activeTab = parsed.activeTab ?? 'production';
				customerUpdate = parsed.customerUpdate ?? initialCustomerUpdate;
				sheetDirty = parsed.sheetDirty ?? false;
				lastSaved = parsed.lastSaved ?? '10:42 AM';
				sent = parsed.sent ?? false;
			} catch {
				sessionStorage.removeItem(storageKey);
			}
		}
	}

	$effect(() => {
		if (!browser) return;

		sessionStorage.setItem(
			storageKey,
			JSON.stringify({
				currentStep,
				selectedSource,
				intakeText,
				blockers,
				lineItems,
				activeTab,
				customerUpdate,
				sheetDirty,
				lastSaved,
				sent
			})
		);
	});

	function showToast(message: string) {
		toast = message;
		if (!browser) return;
		window.setTimeout(() => {
			if (toast === message) toast = '';
		}, 2400);
	}

	function useSampleOrder() {
		intakeText = sampleOrder;
		selectedSource = 'Email';
		showToast('Sample order loaded.');
	}

	function processOrder() {
		if (!intakeText.trim()) {
			intakeText = sampleOrder;
		}
		setStep(2);
	}

	function setStep(step: Step) {
		currentStep = step;
		mobileSidebarOpen = false;
		if (!browser) return;
		window.requestAnimationFrame(() => contentPanel?.scrollTo({ top: 0, left: 0 }));
	}

	function previousStep() {
		if (currentStep > 1) {
			setStep((currentStep - 1) as Step);
		}
	}

	function toggleSidebar() {
		if (browser && window.innerWidth < 1024) {
			mobileSidebarOpen = !mobileSidebarOpen;
			return;
		}

		sidebarCollapsed = !sidebarCollapsed;
	}

	function chooseAnswer(blockerId: string, answer: string) {
		const blocker = blockers.find((item) => item.id === blockerId);
		if (!blocker) return;

		blocker.answer = answer;
		if (blockerId === 'starburst-size') {
			const starburst = lineItems.find((item) => item.source === 'Pasted DM');
			if (starburst) {
				starburst.item = `Bali Starburst ${answer}`;
				starburst.styleCode = `HB-SB-${answer.toUpperCase()}`;
				starburst.notes = `Resolved from '${blocker.evidence}'`;
			}
		}
		if (blockerId === 'horse-pin-size') {
			const horse = lineItems.find((item) => item.source === 'Copied PO text' && item.notes.includes('new smaller'));
			if (horse) {
				horse.item = `Horse Pin ${answer}`;
				horse.styleCode = `HB-HORSE-${answer.charAt(0).toUpperCase()}`;
				horse.notes = `Resolved from '${blocker.evidence}'`;
			}
		}
	}

	function continueToSheets() {
		if (!allAnswered) return;
		setStep(3);
		activeTab = 'production';
	}

	function markDirty() {
		sheetDirty = true;
	}

	function saveChanges() {
		lastSaved = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
		sheetDirty = false;
		showToast('Changes saved.');
	}

	function sanitizeExportCell(value: string | number) {
		const text = String(value ?? '');
		if (/^[=+\-@\t\r]/.test(text)) return `'${text}`;
		return text;
	}

	function csvEscape(value: string | number) {
		const text = sanitizeExportCell(value);
		return `"${text.replaceAll('"', '""')}"`;
	}

	function productionRows() {
		const warningRows = remainingAnswers
			? [
					[
						'UNRESOLVED WARNING',
						`${remainingAnswers} required production answers remain before final use.`,
						'',
						'',
						'',
						''
					]
				]
			: [];

		return [
			['Item', 'Style code', 'Qty', 'Material / finish', 'Production notes', 'Source evidence'],
			...warningRows,
			...lineItems.map((item) => [
				item.item,
				item.styleCode,
				item.qty,
				item.finish,
				item.notes,
				item.source
			])
		];
	}

	function packingRows() {
		return [
			['Item', 'Qty', 'Packing check', 'Notes'],
			...lineItems.map((item) => [
				item.item,
				item.qty,
				'Confirm count and finish label',
				item.notes
			])
		];
	}

	function rowsToCsv(rows: (string | number)[][]) {
		return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
	}

	function downloadCsv(kind: 'production' | 'packing') {
		const rows = kind === 'production' ? productionRows() : packingRows();
		const blob = new Blob([rowsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${orderId}-${kind === 'production' ? 'production-sheet' : 'packing-checklist'}.csv`;
		link.click();
		URL.revokeObjectURL(url);
		exportOpen = false;
		showToast(`${kind === 'production' ? 'Production sheet' : 'Packing checklist'} CSV downloaded.`);
	}

	async function copyTable() {
		const rows = activeTab === 'packing' ? packingRows() : productionRows();
		await navigator.clipboard.writeText(
			rows.map((row) => row.map((cell) => sanitizeExportCell(cell)).join('\t')).join('\n')
		);
		exportOpen = false;
		showToast('Table copied.');
	}

	async function copyCustomerUpdate() {
		await navigator.clipboard.writeText(customerUpdate);
		showToast('Customer update copied.');
	}

	function saveDraft() {
		lastSaved = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
		showToast('Draft saved.');
	}

	function markSent() {
		sent = true;
		showToast('Marked as sent.');
	}
</script>

<svelte:head>
	<title>Artisan · Order-to-Production Assistant</title>
	<meta
		name="description"
		content="Internal order-to-production assistant for Heather Benjamin Jewelry"
	/>
</svelte:head>

<main class="h-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
	<div class={`app-shell ${sidebarCollapsed ? 'app-shell-collapsed' : ''}`}>
		{#if mobileSidebarOpen}
			<button
				class="sidebar-backdrop"
				type="button"
				aria-label="Close sidebar"
				onclick={() => (mobileSidebarOpen = false)}
			></button>
		{/if}

		<aside
			class={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileSidebarOpen ? 'sidebar-open' : ''}`}
		>
			<div class="sidebar-heading">
				<div class="sidebar-title">
					<p class="font-display text-2xl leading-tight">Artisan</p>
					<p class="text-sm text-[var(--muted)]">Order-to-Production Assistant</p>
				</div>
			</div>

			<nav class="mt-10 space-y-2">
				<button
					class="flex w-full items-center gap-3 rounded-md bg-[var(--nav-active)] px-4 py-3 text-left font-semibold"
					type="button"
				>
					<span aria-hidden="true">▤</span>
					<span class="sidebar-label">Orders</span>
				</button>
				<button
					class="flex w-full items-center justify-between rounded-md px-4 py-3 text-left text-[var(--ink)]"
					type="button"
				>
					<span class="flex items-center gap-3"><span aria-hidden="true">□</span> <span class="sidebar-label">Catalog</span></span>
					<span class="sidebar-label rounded bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--muted)]">Later</span>
				</button>
			</nav>
		</aside>

		<section class="app-main">
			<header class="app-header">
				<button class="icon-button" type="button" aria-label="Toggle sidebar" onclick={toggleSidebar}>
					☰
				</button>
				<span>Last saved {lastSaved}</span>
			</header>

			<div class="step-scroll border-b border-[var(--line)] bg-white px-4 md:px-10">
				<div class="mx-auto flex h-full min-w-max max-w-6xl items-center justify-between gap-3 md:gap-4">
					{#each steps as step, index (step.id)}
						<button
							class={`step-button ${currentStep === step.id ? 'step-button-active' : ''}`}
							type="button"
							disabled={step.id > maxStep}
							onclick={() => {
								if (step.id <= maxStep) setStep(step.id);
							}}
						>
							<span class="step-index">{step.id}</span>
							<span class="step-label">{step.label}</span>
						</button>
						{#if index < steps.length - 1}
							<div class="hidden h-px flex-1 bg-[var(--line)] md:block"></div>
						{/if}
					{/each}
				</div>
			</div>

			<div class="min-h-0 overflow-auto" bind:this={contentPanel}>
				{#if currentStep === 1}
					<section class="grid min-h-full xl:grid-cols-[1fr_368px]">
						<div class="px-4 py-6 md:px-10 md:py-10">
							<div class="mx-auto max-w-4xl">
								<h1 class="font-display text-4xl leading-tight md:text-5xl">Add messy order</h1>
								<p class="mt-4 max-w-3xl text-lg leading-8">
									Paste a purchase order, email, DM, copied spreadsheet rows, or PDF text.
									Artisan finds line items and flags unclear production details.
								</p>

								<div class="mt-8 rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
									<div class="flex flex-wrap gap-2">
										{#each sourceTypes as source (source)}
											<button
												class={`chip ${selectedSource === source ? 'chip-active' : ''}`}
												type="button"
												onclick={() => (selectedSource = source)}
											>
												{source}
											</button>
										{/each}
									</div>

									<label class="mt-4 block">
										<span class="sr-only">Paste messy order text</span>
										<textarea
											class="h-[420px] w-full resize-none rounded-md border border-[var(--line)] bg-[var(--surface-soft)] p-4 font-mono text-sm leading-6 outline-none transition focus:border-[var(--brand)] focus:bg-white"
											bind:value={intakeText}
										></textarea>
									</label>

									<div class="mt-4 flex flex-wrap items-center justify-between gap-4">
										<label
											class="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-[var(--line)] px-5 py-3 text-sm text-[var(--muted)]"
										>
											<input class="sr-only" type="file" />
											<span class="text-xl" aria-hidden="true">↥</span>
											<span>
												<strong class="block text-[var(--ink)]">Upload file instead</strong>
												PDF, CSV, XLSX, PNG, JPG, TXT
											</span>
										</label>

										<button class="secondary-button" type="button" onclick={useSampleOrder}>
											Try sample order
										</button>
									</div>
								</div>

								<p class="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]">
									<span aria-hidden="true">◇</span>
									Use fictional or redacted data only.
								</p>
							</div>
						</div>

						<aside class="border-l border-[var(--line)] bg-white px-8 py-10">
							<h2 class="font-display text-2xl">What happens next</h2>
							<div class="mt-7 space-y-5">
								<div class="next-card">
									<span>1</span>
									<div>
										<h3>Extract line items</h3>
										<p>Products, quantities, finishes, and notes are pulled from messy input.</p>
									</div>
								</div>
								<div class="next-card">
									<span>2</span>
									<div>
										<h3>Answer unclear details</h3>
										<p>Questions appear only when production details are unclear.</p>
									</div>
								</div>
								<div class="next-card">
									<span>3</span>
									<div>
										<h3>Create sheets</h3>
										<p>Production sheet, packing checklist, and customer update become ready.</p>
									</div>
								</div>
							</div>
						</aside>
					</section>
				{:else if currentStep === 2}
					<section class="grid min-h-full xl:grid-cols-[1fr_352px]">
						<div class="px-4 py-6 md:px-10 md:py-8">
							<div class="mx-auto max-w-5xl">
								<div class="flex flex-wrap items-start justify-between gap-4">
									<div>
										<p class="text-sm uppercase tracking-wide text-[var(--muted)]">
											Order #{orderId}
											<span class="ml-3 rounded border border-[var(--line)] px-2 py-1 normal-case tracking-normal"
												>Wholesale</span
											>
											<span class="ml-3 normal-case tracking-normal">Client: {client}</span>
										</p>
										<h1 class="mt-5 font-display text-4xl leading-tight md:text-5xl">Review order</h1>
										<p class="mt-3 text-lg">Artisan found 8 items</p>
										<p class="mt-1">
											{remainingAnswers} production {remainingAnswers === 1 ? 'detail needs' : 'details need'}
											answers before sheets can be created.
										</p>
										<p class="mt-4 text-sm text-[var(--muted)]">Source: pasted DM / copied PO text</p>
									</div>

									<button class="secondary-button" type="button">View original order</button>
								</div>

								<h2 class="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
									Needs your answer ({remainingAnswers})
								</h2>
								<div class="mt-3 space-y-4">
									{#each blockers as blocker (blocker.id)}
										<article class={`blocker-card ${blocker.answer ? 'blocker-card-done' : ''}`}>
											<div class="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
												<div>
													<div class="flex flex-wrap items-center gap-3">
														<span
															class={`impact ${blocker.impact === 'High impact' ? 'impact-high' : ''}`}
															>{blocker.impact}</span
														>
														{#if blocker.answer}
															<span class="answered-pill">Answered: {blocker.answer}</span>
														{/if}
													</div>
													<h3 class="mt-3 text-lg font-semibold">{blocker.question}</h3>
													<p class="mt-1 text-sm text-[var(--muted)]">
														Source evidence: “{blocker.evidence}” · {blocker.source}
													</p>
												</div>
												<div class="flex flex-wrap gap-3">
													{#each blocker.options as option (option)}
														<button
															class={`choice-button ${blocker.answer === option ? 'choice-button-active' : ''}`}
															type="button"
															onclick={() => chooseAnswer(blocker.id, option)}
														>
															{option}
														</button>
													{/each}
												</div>
											</div>
											<details class="border-t border-[var(--line)] px-4 py-3 text-sm">
												<summary class="cursor-pointer">Production risk</summary>
												<p class="mt-2 text-[var(--muted)]">{blocker.risk}</p>
											</details>
										</article>
									{/each}
								</div>

								<h2 class="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
									Looks ready (6)
								</h2>
								<div class="mt-3 overflow-hidden rounded-md border border-[var(--line)] bg-white">
									<table class="w-full text-left text-sm">
										<thead class="bg-[var(--surface-soft)]">
											<tr>
												<th class="w-10 px-3 py-3"></th>
												<th class="px-3 py-3">Item</th>
												<th class="px-3 py-3">Style code</th>
												<th class="px-3 py-3">Qty</th>
												<th class="px-3 py-3">Finish</th>
												<th class="px-3 py-3">Notes</th>
											</tr>
										</thead>
										<tbody>
											{#each lineItems.slice(0, 6) as item (item.id)}
												<tr class="border-t border-[var(--line)]">
													<td class="px-3 py-3 text-[var(--ready-ink)]">✓</td>
													<td class="px-3 py-3">{item.item}</td>
													<td class="px-3 py-3">{item.styleCode}</td>
													<td class="px-3 py-3">{item.qty}</td>
													<td class="px-3 py-3">{item.finish}</td>
													<td class="px-3 py-3">{item.notes}</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						</div>

						<aside class="border-l border-[var(--line)] bg-white px-7 py-10">
							<h2 class="font-display text-2xl">Your documents</h2>
							<p class="mt-2 text-[var(--muted)]">
								{allAnswered ? 'Ready for review.' : 'Locked until the questions are answered.'}
							</p>
							<div class="mt-6 space-y-4">
								{#each ['Production Sheet', 'Packing Checklist', 'Customer Update'] as doc (doc)}
									<div class="document-card">
										<div>
											<h3>{doc}</h3>
											<p>
												{allAnswered
													? doc === 'Customer Update'
														? 'Draft includes notes'
														: 'Ready after review'
													: doc === 'Production Sheet'
														? `Blocked by ${remainingAnswers} answers`
														: 'Blocked by production sheet'}
											</p>
										</div>
										<span aria-hidden="true">{allAnswered ? '✓' : '⌕'}</span>
									</div>
								{/each}
							</div>
							<div class="mt-6 rounded-md border border-[var(--info-line)] bg-[var(--info)] p-4 text-sm">
								You can view the original order anytime while reviewing details.
							</div>
						</aside>
					</section>
				{:else if currentStep === 3}
					<section class="px-4 py-6 md:px-8 md:py-8">
						<div class="mx-auto max-w-7xl">
							<div class="flex flex-wrap items-start justify-between gap-5">
								<div>
									<p class="text-sm uppercase tracking-wide text-[var(--muted)]">
										Order #{orderId}
										<span class="ml-3 rounded border border-[var(--line)] px-2 py-1 normal-case tracking-normal"
											>Wholesale</span
										>
										<span class="ml-3 normal-case tracking-normal">Client: {client}</span>
									</p>
									<h1 class="mt-5 font-display text-4xl leading-tight md:text-5xl">Sheets</h1>
									<p class="mt-3">
										Clean production and packing documents generated from messy order input.
									</p>
									<p class="mt-5 inline-flex rounded-md border border-[var(--ready)] bg-[var(--ready-bg)] px-3 py-2 text-sm text-[var(--ready-ink)]">
										✓ All required answers complete.
									</p>
								</div>

								<div class="flex items-start gap-3">
									<button class="secondary-button" type="button" disabled={!sheetDirty} onclick={saveChanges}>
										Save changes
									</button>
									<div class="relative">
										<button class="secondary-button" type="button" onclick={() => (exportOpen = !exportOpen)}>
											Export ˅
										</button>
										{#if exportOpen}
											<div class="absolute right-0 z-10 mt-2 w-56 rounded-md border border-[var(--line)] bg-white p-2 shadow-xl">
												<button class="menu-item" type="button" onclick={() => downloadCsv('production')}>
													Download production CSV
												</button>
												<button class="menu-item" type="button" onclick={() => downloadCsv('packing')}>
													Download packing CSV
												</button>
												<button class="menu-item" type="button" onclick={copyTable}>Copy table</button>
											</div>
										{/if}
									</div>
								</div>
							</div>

							<div class="mt-9 flex gap-8 border-b border-[var(--line)]">
								{#each [
									['production', 'Production sheet'],
									['packing', 'Packing checklist'],
									['customer', 'Customer update']
								] as tab (tab[0])}
									<button
										class={`tab-button ${activeTab === tab[0] ? 'tab-button-active' : ''}`}
										type="button"
										onclick={() => (activeTab = tab[0] as Tab)}
									>
										{tab[1]}
									</button>
								{/each}
							</div>

							<div class="mt-7 grid gap-5 2xl:grid-cols-[1fr_288px]">
								<div class="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
									{#if activeTab === 'production'}
										<div class="mb-5">
											<h2 class="font-display text-2xl">Production sheet</h2>
											<p class="mt-1 text-sm text-[var(--muted)]">
												Heather Benjamin Jewelry · Order {orderId} · {client}
											</p>
										</div>
										<div class="overflow-auto">
											<table class="min-w-[880px] w-full text-left text-sm">
												<thead class="bg-[var(--surface-soft)]">
													<tr>
														<th class="w-9 px-3 py-3"></th>
														<th class="px-3 py-3">Item</th>
														<th class="px-3 py-3">Style code</th>
														<th class="px-3 py-3">Qty</th>
														<th class="px-3 py-3">Material / finish</th>
														<th class="px-3 py-3">Production notes</th>
														<th class="px-3 py-3">Source evidence</th>
													</tr>
												</thead>
												<tbody>
													{#each lineItems as item, index (item.id)}
														<tr class="border-t border-[var(--line)]">
															<td class="px-3 py-3 text-[var(--muted)]">{index + 1}</td>
															<td class="px-3 py-3 font-medium">{item.item}</td>
															<td class="px-2 py-2">
																<input class="cell-input" bind:value={item.styleCode} oninput={markDirty} />
															</td>
															<td class="px-2 py-2">
																<input
																	class="cell-input w-20"
																	type="number"
																	min="0"
																	bind:value={item.qty}
																	oninput={markDirty}
																/>
															</td>
															<td class="px-2 py-2">
																<input class="cell-input" bind:value={item.finish} oninput={markDirty} />
															</td>
															<td class="px-2 py-2">
																<input class="cell-input" bind:value={item.notes} oninput={markDirty} />
															</td>
															<td class="px-3 py-3">{item.source}</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									{:else if activeTab === 'packing'}
										<h2 class="font-display text-2xl">Packing checklist</h2>
										<div class="mt-5 overflow-hidden rounded-md border border-[var(--line)]">
											<table class="w-full text-left text-sm">
												<thead class="bg-[var(--surface-soft)]">
													<tr>
														<th class="px-3 py-3">Item</th>
														<th class="px-3 py-3">Qty</th>
														<th class="px-3 py-3">Check</th>
														<th class="px-3 py-3">Notes</th>
													</tr>
												</thead>
												<tbody>
													{#each lineItems as item (item.id)}
														<tr class="border-t border-[var(--line)]">
															<td class="px-3 py-3">{item.item}</td>
															<td class="px-3 py-3">{item.qty}</td>
															<td class="px-3 py-3">Confirm count and finish label</td>
															<td class="px-3 py-3">{item.notes}</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									{:else}
										<h2 class="font-display text-2xl">Customer update draft</h2>
										<textarea
											class="mt-5 h-[420px] w-full resize-none rounded-md border border-[var(--line)] bg-[var(--surface-soft)] p-4 leading-7 outline-none focus:border-[var(--brand)] focus:bg-white"
											bind:value={customerUpdate}
										></textarea>
									{/if}
								</div>

								<aside class="rounded-lg border border-[var(--line)] bg-white p-5">
									<h2 class="font-display text-2xl">Ready next</h2>
									<div class="mt-5 space-y-4">
										<button class="side-action" type="button" onclick={() => downloadCsv('production')}>
											<strong>Download production sheet</strong>
											<span>CSV</span>
										</button>
										<button class="side-action" type="button" onclick={() => downloadCsv('packing')}>
											<strong>Download packing checklist</strong>
											<span>CSV</span>
										</button>
										<button class="side-action" type="button" onclick={copyCustomerUpdate}>
											<strong>Copy customer update</strong>
											<span>Text</span>
										</button>
									</div>
								</aside>
							</div>
						</div>
					</section>
				{:else}
					<section class="grid min-h-full xl:grid-cols-[1fr_352px]">
						<div class="px-4 py-6 md:px-10 md:py-9">
							<div class="mx-auto max-w-5xl">
								<p class="text-sm uppercase tracking-wide text-[var(--muted)]">
									Order #{orderId}
									<span class="ml-3 rounded border border-[var(--line)] px-2 py-1 normal-case tracking-normal"
										>Wholesale</span
									>
									<span class="ml-3 normal-case tracking-normal">Client: {client}</span>
								</p>
								<div class="mt-5 flex flex-wrap items-start justify-between gap-4">
									<div>
										<h1 class="font-display text-4xl leading-tight md:text-5xl">Update customer</h1>
										<p class="mt-3 text-lg">Edit the customer update before copying or marking sent.</p>
									</div>
									<button class="secondary-button" type="button">Preview</button>
								</div>

								<div class="mt-8 rounded-md border border-[var(--line)] bg-white p-4 text-sm">
									<strong>What's included in this update</strong>
									<p class="mt-1 text-[var(--muted)]">
										Order summary, timeline, production status, and any notes or next steps.
									</p>
								</div>

								<label class="mt-8 block">
									<span class="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
										Message
									</span>
									<textarea
										class="mt-3 h-[520px] w-full resize-none rounded-md border border-[var(--line)] bg-white p-5 leading-7 outline-none focus:border-[var(--brand)]"
										bind:value={customerUpdate}
									></textarea>
								</label>
							</div>
						</div>

						<aside class="border-l border-[var(--line)] bg-white px-7 py-10">
							<h2 class="font-display text-2xl">Included in this update</h2>
							<div class="mt-7 space-y-6">
								<div>
									<h3 class="font-semibold">Order summary</h3>
									<p class="mt-1 text-sm text-[var(--muted)]">8 items, {totalQty} total quantity</p>
								</div>
								<div>
									<h3 class="font-semibold">Timeline</h3>
									<p class="mt-1 text-sm text-[var(--muted)]">Production start and ETA</p>
								</div>
								<div>
									<h3 class="font-semibold">Notes</h3>
									<p class="mt-1 text-sm text-[var(--muted)]">Special requests or next steps</p>
								</div>
							</div>

							<div class="mt-9 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] p-4">
								<h3 class="font-display text-xl">Preview</h3>
								<p class="mt-4 text-sm font-medium">To: Mia Chen &lt;mia@driftwoodcollective.com&gt;</p>
								<p class="mt-1 text-sm">Subject: Update on your order #{orderId}</p>
								<div class="mt-4 space-y-2">
									<div class="h-2 rounded bg-[var(--line)]"></div>
									<div class="h-2 w-10/12 rounded bg-[var(--line)]"></div>
									<div class="h-2 w-11/12 rounded bg-[var(--line)]"></div>
									<div class="h-2 w-7/12 rounded bg-[var(--line)]"></div>
								</div>
							</div>
						</aside>
					</section>
				{/if}
			</div>

			<footer class="action-footer">
				<div class="action-footer-inner">
					<div class="footer-status">
						<span class={`status-dot ${remainingAnswers && currentStep === 2 ? 'status-warn' : ''}`}>
							{currentStep === 2 && remainingAnswers ? '?' : '✓'}
						</span>
						<div>
							<p class="font-semibold">
								{#if currentStep === 1}
									Ready: 1 pasted source
								{:else if currentStep === 2}
									{remainingAnswers} {remainingAnswers === 1 ? 'answer' : 'answers'} remaining
								{:else if currentStep === 3}
									Ready to send to production
								{:else}
									{sent ? 'Marked as sent' : 'Ready to copy'}
								{/if}
							</p>
							{#if currentStep === 4}
								<p class="text-sm text-[var(--muted)]">No real email is sent by Artisan.</p>
							{/if}
						</div>
					</div>

					<div class="footer-actions">
						{#if currentStep > 1}
							<button class="secondary-button" type="button" onclick={previousStep}>Previous</button>
						{/if}
						{#if currentStep === 2}
							<button class="ghost-button" type="button" onclick={() => showToast('Progress saved.')}>
								Save progress
							</button>
							<button class="primary-button" type="button" disabled={!allAnswered} onclick={continueToSheets}>
								Continue to sheets →
							</button>
						{:else if currentStep === 1}
							<button class="primary-button" type="button" onclick={processOrder}>Process order →</button>
						{:else if currentStep === 3}
							<button class="primary-button" type="button" onclick={() => setStep(4)}>
								Continue to customer update →
							</button>
						{:else}
							<button class="secondary-button" type="button" onclick={saveDraft}>Save draft</button>
							<button class="secondary-button" type="button" onclick={copyCustomerUpdate}>Copy update</button>
							<button class="primary-button" type="button" onclick={markSent}>Mark as sent</button>
						{/if}
					</div>
				</div>
			</footer>
		</section>
	</div>

	{#if toast}
		<div class="fixed bottom-28 left-1/2 -translate-x-1/2 rounded-full bg-[var(--ink)] px-5 py-3 text-sm text-white shadow-xl">
			{toast}
		</div>
	{/if}
</main>
