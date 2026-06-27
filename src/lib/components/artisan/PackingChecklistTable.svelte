<script lang="ts">
	type LineItem = {
		id: string;
		item: string;
		styleCode: string;
		qty: number;
		notes: string;
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
		onTogglePacked
	}: {
		t: Messages;
		orderId: string;
		client: string;
		lineItems: LineItem[];
		packedItems: Record<string, boolean>;
		getPackagingSpecifics: (styleCode: string) => string;
		isBackordered: (styleCode: string) => boolean;
		onTogglePacked: (id: string, checked: boolean) => void;
	} = $props();
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
				<th class="px-3 py-3 text-xs font-bold text-[var(--muted)]">{t.orderNotes}</th>
			</tr>
		</thead>
		<tbody>
			{#each lineItems as item (item.id)}
				{@const isBack = isBackordered(item.styleCode)}
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
						<span class={packedItems[item.id] ? 'text-[var(--muted)] line-through' : ''}>
							{item.item}
						</span>
					</td>
					<td class="px-3 py-3 text-center font-bold">{item.qty}</td>
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
					<td class="px-3 py-3 text-xs text-[var(--muted)] italic">{item.notes}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
