<script lang="ts">
	let {
		label,
		value,
		onInput,
		labelClass = 'sr-only',
		textareaClass = 'customer-textarea shadow-inner'
	}: {
		label: string;
		value: string;
		onInput: (value: string) => void;
		labelClass?: string;
		textareaClass?: string;
	} = $props();
</script>

<label class="block">
	<span class={labelClass}>{label}</span>
	<textarea
		class={textareaClass}
		aria-label={label}
		value={value}
		oninput={(event) => onInput((event.currentTarget as HTMLTextAreaElement).value)}
	></textarea>
</label>
