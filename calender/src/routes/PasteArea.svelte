<script lang="ts">
	import { normalizeWeeklyClipboardHtml } from '$lib/weeklyClipboard';

	export let raw: string;

	function handlePaste(event: ClipboardEvent) {
		const html = event.clipboardData?.getData('text/html');
		if (!html) return;

		const normalized = normalizeWeeklyClipboardHtml(html);
		if (!normalized) return;

		event.preventDefault();
		raw = normalized;
	}
</script>

<textarea
	bind:value={raw}
	on:paste={handlePaste}
	placeholder="Dan lich tuan NTTU vao day"
	class="mt-5 h-32 w-full rounded bg-transparent p-2 text-xs placeholder-slate-400 outline-dashed outline-[1.5px] outline-slate-200 placeholder:text-center placeholder:text-base placeholder:font-light placeholder:leading-[7rem] focus:outline-slate-500"
/>
