<script lang="ts">
	type Blocker = {
		id: string;
		impact: 'High impact' | 'Medium impact';
		impactKey: 'highImpact' | 'mediumImpact';
		question: string;
		questionKey: 'starBirdQuestion' | 'birdOfPreyQuestion';
		evidence: string;
		source: string;
		risk: string;
		riskKey: 'starBirdRisk' | 'birdOfPreyRisk';
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
			<div class="p-4 space-y-4">
				<div>
					<div class="flex flex-wrap items-center gap-3">
						<span
							class={`impact flex items-center gap-1.5 ${blocker.impactKey === 'highImpact' ? 'impact-high' : ''}`}
						>
							<i class="ri-alert-line" aria-hidden="true"></i>
							{t[blocker.impactKey] || blocker.impact}
						</span>
						{#if blocker.answer}
							<span class="answered-pill flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold px-2 py-0.5 rounded text-[10px] uppercase">
								<i class="ri-checkbox-circle-line" aria-hidden="true"></i>
								{t.answered}: {blocker.answer}
							</span>
						{/if}
					</div>
					<h3 class="mt-3 text-lg font-semibold text-(--ink)">{t[blocker.questionKey] || blocker.question}</h3>
					
					<div class="mt-3 flex flex-col gap-1 text-xs text-(--muted)">
						<span class="font-semibold text-(--muted) uppercase tracking-wider text-[9px]">{t.found}:</span>
						<div class="font-mono text-xs bg-(--surface-muted) px-3 py-2 rounded border border-(--line) italic max-w-3xl leading-relaxed text-(--ink)">
							"{blocker.evidence}"
							{#if blocker.source && blocker.source.toLowerCase() !== 'source'}
								<span class="not-italic font-sans font-bold text-[9px] bg-white border border-(--line) px-1.5 py-0.5 rounded ml-2 uppercase text-(--muted) tracking-wider">
									{blocker.source}
								</span>
							{/if}
						</div>
					</div>
				</div>
				<div class="flex flex-wrap gap-3">
					{#each blocker.options as option (option)}
						<button
							class={`choice-card flex flex-col items-start rounded-lg border p-4 text-left transition duration-200 cursor-pointer min-w-[140px] md:flex-none ${
								blocker.answer === option 
									? 'border-(--brand) bg-(--brand)/5 ring-2 ring-(--brand)/15' 
									: 'border-(--line) bg-white hover:border-(--brand) hover:bg-(--surface-soft)'
							}`}
							type="button"
							onclick={() => onAnswer(blocker.id, option)}
						>
							<div class="flex items-center justify-between w-full">
								<span class="text-sm font-bold text-(--ink)">{option}</span>
								{#if blocker.answer === option}
									<i class="ri-checkbox-circle-fill text-(--brand) text-base ml-2"></i>
								{/if}
							</div>
							{#if getOptionDetail(blocker.id, option)}
								<span class="mt-1 text-[10px] leading-tight text-(--muted)">
									{getOptionDetail(blocker.id, option)}
								</span>
							{/if}
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
