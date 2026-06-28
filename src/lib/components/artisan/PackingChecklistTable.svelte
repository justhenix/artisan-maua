<script lang="ts">
	import { confidenceStateFor, unresolvedWarnings } from '$lib/artisan/review';

	type LineItem = {
		id: string;
		item: string;
		styleCode: string;
		qty: number;
		finish: string;
		notes: string;
		source: string;
		imageUrl?: string;
		confidenceState?: 'resolved' | 'needs_review' | 'unresolved';
		unresolvedFields?: string[];
	};

	type Messages = Record<string, string>;

	let {
		t,
		orderId,
		client,
		lineItems,
		packedItems,
		getPackagingSpecifics,
		isBackordered,
		onTogglePacked,
		onUpdateItem
	}: {
		t: Messages;
		orderId: string;
		client: string;
		lineItems: LineItem[];
		packedItems: Record<string, boolean>;
		getPackagingSpecifics: (styleCode: string) => string;
		isBackordered: (styleCode: string) => boolean;
		onTogglePacked: (id: string, checked: boolean) => void;
		onUpdateItem: (id: string, field: 'qty' | 'notes', value: string | number) => void;
	} = $props();

	function inputValue(event: Event) {
		return (event.currentTarget as HTMLInputElement).value;
	}
</script>

<div class="mb-5">
	<h2 class="font-display text-2xl">{t.packingChecklist}</h2>
	<p class="mt-1 text-sm text-[var(--muted)]">
		{t.baliPackingCheck} · Order {orderId} · {client}
	</p>
</div>

<div class="mt-5 overflow-hidden rounded-md border border-[var(--line)] bg-white shadow-sm">
	<table class="w-full text-left text-sm">
		<thead class="border-b border-[var(--line)] bg-[var(--surface-soft)]">
			<tr>
				<th class="w-12 px-3 py-3 text-center text-xs font-bold text-[var(--muted)]">{t.packed}</th>
				<th class="px-3 py-3 text-xs font-bold text-[var(--muted)]">{t.item}</th>
				<th class="w-20 px-3 py-3 text-center text-xs font-bold text-[var(--muted)]">{t.qty}</th>
				<th class="px-3 py-3 text-xs font-bold text-[var(--muted)]">{t.packagingSpecifics}</th>
				<th class="px-3 py-3 text-xs font-bold text-[var(--muted)]">{t.fulfillmentFlags}</th>
				<th class="w-32 px-3 py-3 text-xs font-bold text-[var(--muted)]">{t.confidence || 'Status'}</th>
				<th class="px-3 py-3 text-xs font-bold text-[var(--muted)]">{t.orderNotes}</th>
			</tr>
		</thead>
		<tbody>
			{#each lineItems as item (item.id)}
				{@const isBack = isBackordered(item.styleCode)}
				{@const state = confidenceStateFor(item)}
				{@const warnings = unresolvedWarnings(item)}
				<tr class={`border-t border-[var(--line)] transition ${packedItems[item.id] ? 'bg-emerald-50/40' : ''}`}>
					<td class="px-3 py-3 text-center">
						<input
							type="checkbox"
							aria-label={`${t.packed}: ${item.item}`}
							checked={packedItems[item.id] ?? false}
							onchange={(event) => onTogglePacked(item.id, (event.currentTarget as HTMLInputElement).checked)}
							class="h-4 w-4 cursor-pointer rounded border-[var(--line)] accent-[var(--brand)]"
						/>
					</td>
					<td class="px-3 py-3 font-medium">
						<div class="flex items-center gap-3">
							{#if item.imageUrl}
								<img src={item.imageUrl} alt={item.item} class="w-8 h-8 rounded border object-cover shadow-sm bg-white shrink-0" />
							{:else}
								<div class="w-8 h-8 rounded border border-dashed flex items-center justify-center text-[var(--muted)] bg-[var(--surface-soft)] shadow-sm shrink-0">
									<i class="ri-image-line text-xs"></i>
								</div>
							{/if}
							<span class={packedItems[item.id] ? 'text-[var(--muted)] line-through' : ''}>
								{item.item}
							</span>
						</div>
					</td>
					<td class="px-2 py-3 text-center">
						<input
							class="cell-input w-16 text-center"
							type="number"
							min="0"
							aria-label={`${t.qty}: ${item.item}`}
							autocomplete="off"
							value={item.qty}
							oninput={(event) => onUpdateItem(item.id, 'qty', Number(inputValue(event)))}
						/>
					</td>
					<td class="px-3 py-3 text-xs text-[var(--muted)]">{getPackagingSpecifics(item.styleCode)}</td>
					<td class="px-3 py-3">
						{#if isBack}
							<span class="inline-flex items-center gap-1 rounded border border-red-200 bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700">
								<i class="ri-time-line" aria-hidden="true"></i>
								{t.backorder}
							</span>
							<span class="mt-1 block text-[10px] text-[var(--muted)]">{t.splitShipAfterCasting}</span>
						{:else}
							<span class="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">
								<i class="ri-send-plane-line" aria-hidden="true"></i>
								{t.directShip}
							</span>
						{/if}
					</td>
					<td class="px-3 py-3">
						<div class="flex flex-col gap-1">
							<span class={`inline-flex w-fit items-center rounded border px-2 py-1 text-[10px] font-bold ${
								state === 'resolved'
									? 'border-emerald-200 bg-emerald-50 text-emerald-800'
									: state === 'needs_review'
										? 'border-[var(--warning)] bg-[var(--warning-bg)] text-[var(--warning-ink)]'
										: 'border-red-200 bg-red-50 text-red-700'
							}`}>
								{t[state] || state}
							</span>
							{#if warnings.length > 0}
								<span class="text-[10px] text-red-700">{warnings.join(', ')}</span>
							{/if}
						</div>
					</td>
					<td class="px-2 py-3">
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
