<script lang="ts">
	import { confidenceStateFor } from '$lib/artisan/review';

	type ProductionGrouping = 'material' | 'category';

	type LineItem = {
		id: string;
		item: string;
		styleCode: string;
		qty: number;
		finish: string;
		notes: string;
		unitPrice?: number;
		imageUrl?: string;
		source: string;
		confidenceState?: 'resolved' | 'needs_review' | 'unresolved';
		unresolvedFields?: string[];
	};

	type CatalogItem = {
		styleCode: string;
		notes_en: string;
		notes_id: string;
	};

	type ProductionGroup = {
		name: string;
		items: LineItem[];
	};

	type Messages = Record<string, string>;

	let {
		t,
		orderId,
		client,
		grouping,
		materialGroups,
		categoryGroups,
		catalog,
		onGroupingChange,
		onUpdateItem
	}: {
		t: Messages;
		orderId: string;
		client: string;
		grouping: ProductionGrouping;
		materialGroups: ProductionGroup[];
		categoryGroups: ProductionGroup[];
		catalog: CatalogItem[];
		onGroupingChange: (grouping: ProductionGrouping) => void;
		onUpdateItem: (id: string, field: 'styleCode' | 'qty' | 'finish' | 'notes' | 'unitPrice', value: string | number) => void;
	} = $props();

	const groups = $derived(grouping === 'material' ? materialGroups : categoryGroups);

	// Track which rows have expanded notes
	let expandedNotes = $state<Record<string, boolean>>({});

	function toggleNote(id: string) {
		expandedNotes = { ...expandedNotes, [id]: !expandedNotes[id] };
	}

	function inputValue(event: Event) {
		return (event.currentTarget as HTMLInputElement).value;
	}

	function statusLabel(state: string): string {
		if (state === 'resolved') return 'Ready';
		if (state === 'needs_review') return 'Needs review';
		return 'Needs answer';
	}
</script>

<div class="mb-5 flex flex-wrap items-center justify-between gap-4">
	<div>
		<h2 class="font-display text-2xl">{t.productionSheet}</h2>
		<p class="mt-1 text-sm text-[var(--muted)]">
			Heather Benjamin Jewelry · Order {orderId} · {client}
		</p>
	</div>
	<div class="flex items-center gap-2 rounded border border-[var(--line)] bg-[var(--surface-soft)] p-1 text-xs">
		<span class="px-2 font-medium text-[var(--muted)]">{t.groupBy}</span>
		<button
			class={`rounded px-2 py-1 font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--brand)] ${grouping === 'material' ? 'border border-[var(--line)] bg-white text-[var(--brand-dark)] shadow-sm' : 'text-[var(--muted)]'}`}
			type="button"
			onclick={() => onGroupingChange('material')}
		>
			{t.materialFinish}
		</button>
		<button
			class={`rounded px-2 py-1 font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--brand)] ${grouping === 'category' ? 'border border-[var(--line)] bg-white text-[var(--brand-dark)] shadow-sm' : 'text-[var(--muted)]'}`}
			type="button"
			onclick={() => onGroupingChange('category')}
		>
			{t.styleCategory}
		</button>
	</div>
</div>

<div class="space-y-6">
	{#each groups as group (group.name)}
		{#if group.items.length > 0}
			<div class="overflow-hidden rounded-md border border-[var(--line)] bg-white shadow-sm">
				<div class="border-b border-[var(--line)] bg-[var(--surface-muted)] px-4 py-2">
					<h3 class="text-sm font-bold text-[var(--brand-dark)]">{group.name}</h3>
				</div>
				<table class="w-full text-left text-sm">
					<thead class="border-b border-[var(--line)] bg-[var(--surface-soft)]">
						<tr>
							<th class="w-36 px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.styleCode}</th>
							<th class="w-10 px-2 py-2 text-xs font-bold text-[var(--muted)]">Img</th>
							<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.itemDescription}</th>
							<th class="w-16 px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.qty}</th>
							<th class="w-36 px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.materialFinish}</th>
							<th class="w-28 px-3 py-2 text-xs font-bold text-[var(--muted)]">Status</th>
							<th class="w-28 px-3 py-2 text-xs font-bold text-[var(--muted)]">Notes</th>
						</tr>
					</thead>
					<tbody>
						{#each group.items as item (item.id)}
							{@const state = confidenceStateFor(item)}
							{@const cat = item.styleCode ? catalog.find((entry) => entry.styleCode === item.styleCode) : null}
							{@const hasNote = !!cat}
							{@const noteExpanded = !!expandedNotes[item.id]}
							<tr
								class={`border-t border-[var(--line)] ${state === 'unresolved' ? 'bg-amber-50/40' : ''}`}
							>
								<!-- Style code -->
								<td class="px-2 py-1.5">
									<input
										class="cell-input font-mono text-xs w-full min-h-[36px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--brand)]"
										aria-label={`${t.styleCode}: ${item.item}`}
										autocomplete="off"
										value={item.styleCode}
										oninput={(event) => onUpdateItem(item.id, 'styleCode', inputValue(event))}
									/>
								</td>
								<!-- Preview image -->
								<td class="px-2 py-1.5">
									{#if item.imageUrl}
										<img src={item.imageUrl} alt={item.item} class="w-8 h-8 rounded border object-cover shadow-sm bg-white" />
									{:else}
										<div class="w-8 h-8 rounded border border-dashed flex items-center justify-center text-[var(--muted)] bg-[var(--surface-soft)] shadow-sm" aria-hidden="true">
											<i class="ri-image-line text-xs"></i>
										</div>
									{/if}
								</td>
								<!-- Item name -->
								<td class="px-3 py-1.5 font-medium leading-snug max-w-[180px]">
									<span class="block truncate" title={item.item}>{item.item}</span>
								</td>
								<!-- Qty -->
								<td class="px-2 py-1.5">
									<input
										class="cell-input w-14 min-h-[36px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--brand)]"
										type="number"
										min="0"
										aria-label={`${t.qty}: ${item.item}`}
										autocomplete="off"
										value={item.qty}
										oninput={(event) => onUpdateItem(item.id, 'qty', Number(inputValue(event)))}
									/>
								</td>
								<!-- Finish -->
								<td class="px-2 py-1.5">
									<input
										class="cell-input text-xs w-full min-h-[36px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--brand)]"
										aria-label={`${t.materialFinish}: ${item.item}`}
										autocomplete="off"
										value={item.finish}
										oninput={(event) => onUpdateItem(item.id, 'finish', inputValue(event))}
									/>
								</td>
								<!-- Status -->
								<td class="px-3 py-1.5">
									{#if state === 'unresolved'}
										<span class="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-900">
											<i class="ri-error-warning-line" aria-hidden="true"></i>
											Needs answer
										</span>
									{:else}
										<span class={`inline-flex items-center rounded border px-2 py-1 text-[10px] font-bold ${
											state === 'resolved'
												? 'border-emerald-200 bg-emerald-50 text-emerald-800'
												: 'border-amber-200 bg-amber-50 text-amber-800'
										}`}>
											{statusLabel(state)}
										</span>
									{/if}
								</td>
								<!-- Notes + view note -->
								<td class="px-2 py-1.5">
									<div class="flex flex-col gap-1">
										{#if hasNote}
											<button
												type="button"
												class="text-[11px] text-[var(--brand)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--brand)] text-left whitespace-nowrap min-h-[28px]"
												onclick={() => toggleNote(item.id)}
												aria-expanded={noteExpanded}
											>
												{noteExpanded ? 'Hide note' : 'View note'}
											</button>
										{:else if !item.styleCode}
											<span class="text-[11px] font-semibold text-amber-900">Needs style code</span>
										{:else}
											<span class="text-[11px] text-[var(--muted)]">No note</span>
										{/if}
										<input
											class="cell-input cell-input-wide text-xs min-h-[28px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--brand)]"
											aria-label={`${t.orderNotes}: ${item.item}`}
											autocomplete="off"
											value={item.notes}
											oninput={(event) => onUpdateItem(item.id, 'notes', inputValue(event))}
										/>
									</div>
								</td>
							</tr>
							<!-- Expandable note row -->
							{#if noteExpanded && cat}
								<tr class="border-t border-[var(--line)] bg-[var(--surface-soft)]">
									<td colspan="7" class="px-4 py-3">
										<div class="flex items-start gap-6 text-xs">
											<div class="flex-1">
												<p class="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">Production note (EN)</p>
												<p class="text-[var(--ink)] leading-relaxed">{cat.notes_en}</p>
											</div>
											<div class="flex-1 border-l border-[var(--line)] pl-4">
												<p class="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">Catatan produksi (ID)</p>
												<p class="text-[var(--muted)] italic leading-relaxed">{cat.notes_id}</p>
											</div>
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/each}
</div>
