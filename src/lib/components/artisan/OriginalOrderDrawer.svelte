<script lang="ts">
	type Messages = Record<string, string>;

	let {
		t,
		intakeText,
		sourceDetail,
		onClose
	}: {
		t: Messages;
		intakeText: string;
		sourceDetail: string;
		onClose: () => void;
	} = $props();
</script>

<button class="drawer-backdrop" type="button" aria-label={t.closeDrawer} onclick={onClose}></button>
<div class="drawer">
	<div class="drawer-header">
		<h2 class="font-display text-2xl">{t.viewOriginal}</h2>
		<button class="icon-button font-bold" type="button" aria-label={t.closeDrawer} onclick={onClose}>
			<i class="ri-close-line text-lg" aria-hidden="true"></i>
		</button>
	</div>
	<div class="drawer-content">
		<div class="rounded border border-[var(--line)] bg-[var(--surface-soft)] p-4 shadow-inner">
			<p class="mb-2 text-[10px] font-bold text-[var(--muted)]">{t.pastedSourceContent}</p>
			<pre class="select-text whitespace-pre-wrap font-mono text-xs leading-5">{intakeText}</pre>
		</div>
		<div class="mt-4 text-xs text-[var(--muted)]">{sourceDetail}</div>
	</div>
</div>
