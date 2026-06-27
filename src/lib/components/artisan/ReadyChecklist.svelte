<script lang="ts">
	type LineItem = {
		id: string;
		item: string;
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
		<ul class="mt-3 space-y-2">
			{#each items as item (item.id)}
				<li class="rounded-md bg-[var(--surface-soft)] px-3 py-2">
					<p class="text-sm font-medium text-[var(--ink)]">{item.item}</p>
					<p class="mt-0.5 text-sm text-[var(--muted)]">
						{t.qty} {item.qty} · {item.finish}{item.notes ? ` · ${item.notes}` : ''}
					</p>
				</li>
			{/each}
		</ul>
	{/if}
</section>
