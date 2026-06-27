<script lang="ts">
	type LineItem = {
		id: string;
		item: string;
		styleCode?: string;
		qty: number;
		finish: string;
		notes: string;
	};

	type Messages = Record<string, string>;

	let {
		items,
		expanded,
		summary,
		t,
		onToggle
	}: {
		items: LineItem[];
		expanded: boolean;
		summary: string;
		t: Messages;
		onToggle: (expanded: boolean) => void;
	} = $props();
</script>

<section class="mt-8 rounded-md border border-[var(--line)] bg-white/70 px-4 py-3">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h2 class="text-sm font-semibold text-[var(--muted)]">
				{t.looksReady} ({items.length})
			</h2>
			<p class="mt-1 text-sm text-[var(--muted)]">{summary}</p>
		</div>
		<button
			class="ghost-button px-3 py-2 text-sm"
			type="button"
			aria-expanded={expanded}
			onclick={() => onToggle(!expanded)}
		>
			{expanded ? t.hideReadyItems : t.showReadyItems}
		</button>
	</div>

	{#if expanded}
		<div class="mt-3 overflow-hidden rounded-md border border-[var(--line)] bg-white shadow-sm">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-[var(--line)] bg-[var(--surface-soft)]">
					<tr>
						<th class="w-28 px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.styleCode}</th>
						<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.itemDescription}</th>
						<th class="w-16 px-3 py-2 text-xs font-bold text-[var(--muted)] text-center">{t.qty}</th>
						<th class="w-32 px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.materialFinish || 'Material/Finish'}</th>
						<th class="px-3 py-2 text-xs font-bold text-[var(--muted)]">{t.orderNotes}</th>
					</tr>
				</thead>
				<tbody>
					{#each items as item (item.id)}
						<tr class="border-t border-[var(--line)] hover:bg-[var(--surface-soft)]/50 transition-colors">
							<td class="px-3 py-2 font-mono text-xs text-[var(--ink)]">{item.styleCode || '—'}</td>
							<td class="px-3 py-2 font-medium text-[var(--ink)]">{item.item}</td>
							<td class="px-3 py-2 text-center font-bold text-[var(--ink)]">{item.qty}</td>
							<td class="px-3 py-2 text-xs text-[var(--muted)]">{item.finish}</td>
							<td class="px-3 py-2 text-xs text-[var(--muted)] italic">{item.notes || '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
