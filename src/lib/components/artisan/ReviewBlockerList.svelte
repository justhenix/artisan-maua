<script lang="ts">
	type Blocker = {
		id: string;
		impact: 'High impact' | 'Medium impact';
		impactKey: 'highImpact' | 'mediumImpact';
		question: string;
		questionKey: 'starburstQuestion' | 'horseQuestion';
		evidence: string;
		source: string;
		risk: string;
		riskKey: 'starburstRisk' | 'horseRisk';
		options: string[];
		answer: string;
	};

	type Messages = Record<string, string>;

	let {
		blockers,
		remainingAnswers,
		t,
		getOptionDetail,
		onAnswer
	}: {
		blockers: Blocker[];
		remainingAnswers: number;
		t: Messages;
		getOptionDetail: (blockerId: string, option: string) => string;
		onAnswer: (blockerId: string, answer: string) => void;
	} = $props();
</script>

<h2 class="mt-8 text-sm font-semibold text-[var(--muted)]">
	{t.needsAnswer} ({remainingAnswers})
</h2>

<div class="mt-3 space-y-4">
	{#each blockers as blocker (blocker.id)}
		<article class={`blocker-card ${blocker.answer ? 'blocker-card-done' : ''}`}>
			<div class="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
				<div>
					<div class="flex flex-wrap items-center gap-3">
						<span
							class={`impact flex items-center gap-1.5 ${blocker.impactKey === 'highImpact' ? 'impact-high' : ''}`}
						>
							<i class="ri-alert-line" aria-hidden="true"></i>
							{t[blocker.impactKey] || blocker.impact}
						</span>
						{#if blocker.answer}
							<span class="answered-pill flex items-center gap-1">
								<i class="ri-checkbox-circle-line" aria-hidden="true"></i>
								{t.answered}: {blocker.answer}
							</span>
						{/if}
					</div>
					<h3 class="mt-3 text-lg font-semibold">{t[blocker.questionKey] || blocker.question}</h3>
					<p class="mt-1 text-sm text-[var(--muted)]">
						{t.found}: "{blocker.evidence}" ({blocker.source})
					</p>
				</div>
				<div class="flex w-full flex-wrap gap-3 md:w-auto">
					{#each blocker.options as option (option)}
						<button
							class={`choice-card flex min-w-[130px] flex-1 cursor-pointer flex-col items-start rounded-lg border p-3 text-left transition md:flex-none ${blocker.answer === option ? 'border-[var(--brand)] bg-[var(--surface-soft)] ring-2 ring-[var(--brand)]/10' : 'border-[var(--line)] bg-white hover:border-[var(--brand)] hover:bg-[var(--surface-soft)]'}`}
							type="button"
							onclick={() => onAnswer(blocker.id, option)}
						>
							<span class="text-sm font-bold text-[var(--ink)]">{option}</span>
							<span class="mt-1 text-[10px] leading-tight text-[var(--muted)]">
								{getOptionDetail(blocker.id, option)}
							</span>
						</button>
					{/each}
				</div>
			</div>
			<div class="flex items-center gap-2 border-t border-[var(--line)] bg-[var(--warning-bg)]/20 px-4 py-3 text-xs leading-relaxed text-[var(--warning-ink)]">
				<i class="ri-error-warning-line shrink-0 text-sm text-[var(--warning)]" aria-hidden="true"></i>
				<div>
					<strong class="mb-0.5 block text-[10px] font-semibold text-[var(--brand-dark)]">
						{t.productionRisk}:
					</strong>
					{t[blocker.riskKey] || blocker.risk}
				</div>
			</div>
		</article>
	{/each}
</div>
