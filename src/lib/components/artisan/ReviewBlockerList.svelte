<script lang="ts">
	type Blocker = {
		id: string;
		impact: 'High impact' | 'Medium impact';
		impactKey: 'highImpact' | 'mediumImpact';
		question: string;
		questionKey?: string;
		evidence: string;
		source: string;
		risk: string;
		riskKey?: string;
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

	function keyedCopy(key: string | undefined, fallback: string) {
		return key ? (t[key] || fallback) : fallback;
	}

	function isCustomOption(option: string): boolean {
		const lower = option.toLowerCase();
		return lower === 'type exact style' || lower === 'type material/finish' || lower === 'other' || lower === 'custom';
	}

	// Tracks blockerId -> currently active custom option name (e.g. "Type exact style")
	let activeCustomOptions = $state<Record<string, string>>({});
	// Tracks blockerId -> current typed text
	let typedValues = $state<Record<string, string>>({});

	$effect(() => {
		// Sync initial custom typed answers into typedValues
		for (const blocker of blockers) {
			if (blocker.answer && !blocker.options.includes(blocker.answer)) {
				const customOpt = blocker.options.find(isCustomOption);
				if (customOpt) {
					activeCustomOptions[blocker.id] = customOpt;
					if (typedValues[blocker.id] === undefined) {
						typedValues[blocker.id] = blocker.answer;
					}
				}
			}
		}
	});

	function handleOptionClick(blocker: Blocker, option: string) {
		if (isCustomOption(option)) {
			activeCustomOptions[blocker.id] = option;
			if (typedValues[blocker.id] === undefined) {
				typedValues[blocker.id] = '';
			}
			// Empty input means blocker is unanswered
			onAnswer(blocker.id, '');
		} else {
			delete activeCustomOptions[blocker.id];
			onAnswer(blocker.id, option);
		}
	}

	function handleTextChange(blockerId: string, value: string) {
		typedValues[blockerId] = value;
		onAnswer(blockerId, value.trim());
	}
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
						{:else}
							<span class="answered-pill flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 font-semibold px-2 py-0.5 rounded text-[10px] uppercase">
								<i class="ri-error-warning-line" aria-hidden="true"></i>
								Needs answer
							</span>
						{/if}
					</div>
					<h3 class="mt-3 text-lg font-semibold text-(--ink)">{keyedCopy(blocker.questionKey, blocker.question)}</h3>

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
						{@const isSelected = blocker.answer === option || (isCustomOption(option) && activeCustomOptions[blocker.id] === option)}
						<button
							class={`choice-card flex flex-col items-start rounded-lg border p-4 text-left transition duration-200 cursor-pointer min-w-[140px] md:flex-none ${
								isSelected
									? 'border-(--brand) bg-(--brand)/5 ring-2 ring-(--brand)/15'
									: 'border-(--line) bg-white hover:border-(--brand) hover:bg-(--surface-soft)'
							}`}
							type="button"
							onclick={() => handleOptionClick(blocker, option)}
						>
							<div class="flex items-center justify-between w-full">
								<span class="text-sm font-bold text-(--ink)">{option}</span>
								{#if isSelected}
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

				{#if activeCustomOptions[blocker.id]}
					{@const customOpt = activeCustomOptions[blocker.id]}
					{@const inputLabel = customOpt.toLowerCase().includes('style') ? 'Style code or exact style' : customOpt.toLowerCase().includes('material') || customOpt.toLowerCase().includes('finish') ? 'Material / finish' : 'Custom answer'}
					<div class="mt-4 max-w-md p-4 bg-(--surface-soft) border border-(--line) rounded-lg space-y-2">
						<label class="block text-xs font-bold text-(--ink) uppercase tracking-wider" for={`custom-input-${blocker.id}`}>
							{inputLabel}
						</label>
						<input
							id={`custom-input-${blocker.id}`}
							class="w-full px-3 py-2 border border-(--line) rounded bg-white text-sm outline-none focus:border-(--brand) font-mono"
							placeholder={customOpt.toLowerCase().includes('style') ? 'e.g. HB-SB-STAR' : 'e.g. Sterling Silver'}
							value={typedValues[blocker.id] || ''}
							oninput={(e) => handleTextChange(blocker.id, (e.currentTarget as HTMLInputElement).value)}
						/>
					</div>
				{/if}
			</div>
			<div class="flex items-center gap-2 border-t border-[var(--line)] bg-[var(--warning-bg)]/20 px-4 py-3 text-xs leading-relaxed text-[var(--warning-ink)]">
				<i class="ri-error-warning-line shrink-0 text-sm text-[var(--warning)]" aria-hidden="true"></i>
				<div>
					<strong class="mb-0.5 block text-[10px] font-semibold text-[var(--brand-dark)]">
						{t.productionRisk}:
					</strong>
					{keyedCopy(blocker.riskKey, blocker.risk)}
				</div>
			</div>
		</article>
	{/each}
</div>
