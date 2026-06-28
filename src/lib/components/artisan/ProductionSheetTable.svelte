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

	function inputValue(event: Event) {
		return (event.currentTarget as HTMLInputElement).value;
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
			class={`rounded px-2 py-1 font-semibold transition ${grouping === 'material' ? 'border border-[var(--line)] bg-white text-[var(--brand-dark)] shadow-sm' : 'text-[var(--muted)]'}`}
			type="button"
			onclick={() => onGroupingChange('material')}
		>
			{t.materialFinish}
		</button>
		<button
			class={`rounded px-2 py-1 font-semibold transition ${grouping === 'category' ? 'border border-[var(--line)] bg-white text-[var(--brand-dark)] shadow-sm' : 'text-[var(--muted)]'}`}
			type="button"
			onclick={() => onGroupingChange('category')}
		>
			{t.styleCategory}
		</button>
	</div>
</div>

<div class="space-y-8">
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
							<th class="w-16 px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.preview || 'Preview'}</th>
							<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.itemDescription}</th>
							<th class="w-20 px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.qty}</th>
							<th class="w-36 px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.materialFinish}</th>
							<th class="w-28 px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.confidence || 'Confidence'}</th>
							<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.technicalInstructions}</th>
							<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.orderNotes}</th>
						</tr>
					</thead>
					<tbody>
						{#each group.items as item (item.id)}
							{@const state = confidenceStateFor(item)}
							<tr class="border-t border-[var(--line)]">
								<td class="px-2 py-2">
									<input
										class="cell-input font-mono text-xs w-full"
										aria-label={`${t.styleCode}: ${item.item}`}
										autocomplete="off"
										value={item.styleCode}
										oninput={(event) => onUpdateItem(item.id, 'styleCode', inputValue(event))}
									/>
								</td>
								<td class="px-3 py-2">
									{#if item.imageUrl}
										<img src={item.imageUrl} alt={item.item} class="w-8 h-8 rounded border object-cover shadow-sm bg-white" />
									{:else}
										<div class="w-8 h-8 rounded border border-dashed flex items-center justify-center text-[var(--muted)] bg-[var(--surface-soft)] shadow-sm">
											<i class="ri-image-line text-xs"></i>
										</div>
									{/if}
								</td>
								<td class="px-3 py-2 font-medium">{item.item}</td>
								<td class="px-2 py-2">
									<input
										class="cell-input w-20"
										type="number"
										min="0"
										aria-label={`${t.qty}: ${item.item}`}
										autocomplete="off"
										value={item.qty}
										oninput={(event) => onUpdateItem(item.id, 'qty', Number(inputValue(event)))}
									/>
								</td>
								<td class="px-2 py-2">
									<input
										class="cell-input text-xs"
										aria-label={`${t.materialFinish}: ${item.item}`}
										autocomplete="off"
										value={item.finish}
										oninput={(event) => onUpdateItem(item.id, 'finish', inputValue(event))}
									/>
								</td>
								<td class="px-3 py-2">
									<span class={`inline-flex items-center rounded border px-2 py-1 text-[10px] font-bold ${
										state === 'resolved'
											? 'border-emerald-200 bg-emerald-50 text-emerald-800'
											: state === 'needs_review'
												? 'border-amber-200 bg-amber-50 text-amber-800'
												: 'border-red-200 bg-red-50 text-red-700'
									}`}>
										{t[state] || state}
									</span>
								</td>
								<td class="px-3 py-2 text-xs leading-relaxed">
									{#if item.styleCode}
										{@const cat = catalog.find((entry) => entry.styleCode === item.styleCode)}
										{#if cat}
											<div class="font-medium text-[var(--ink)]">{cat.notes_en}</div>
											<div class="mt-1 text-[var(--muted)] italic">{cat.notes_id}</div>
										{:else}
											<span class="text-[var(--muted)]">{t.noInstructionsMapped}</span>
										{/if}
									{:else}
										<span class="flex items-center gap-1 font-semibold text-[var(--warning)]">
											<i class="ri-error-warning-line" aria-hidden="true"></i>
											{t.pendingResolution}
										</span>
									{/if}
								</td>
								<td class="px-2 py-2">
									<input
										class="cell-input cell-input-wide text-xs"
										aria-label={`${t.orderNotes}: ${item.item}`}
										autocomplete="off"
										value={item.notes}
										oninput={(event) => onUpdateItem(item.id, 'notes', inputValue(event))}
									/>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/each}
</div>
