<script lang="ts">
	import H2 from '$lib/H2.svelte';
	import OkeeButton from '$lib/OkeeButton.svelte';
	import { formatIcal, type Timetable } from '$lib/calendarCore';

	export let timetable: Required<Timetable>;
	export let name: string;

	function download() {
		const data = `data:text/calendar,${encodeURIComponent(formatIcal(timetable))}`;
		const link = document.createElement('a');
		link.href = data;
		link.download = `${name}.ics`;
		link.click();
		link.remove();
	}
</script>

<H2>Xem truoc</H2>
<pre>{formatIcal(timetable)}</pre>
<div class="h-4" />
<div class="flex justify-center">
	<OkeeButton variant="navy" disabled={false} on:click={download}>Tai file .ics</OkeeButton>
</div>
