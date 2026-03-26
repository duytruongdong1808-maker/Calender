<script lang="ts">
	import { formatGapi, type Timetable } from '$lib/calendarCore';
	import GapiPreview from './GapiPreview.svelte';
	import H2 from '$lib/H2.svelte';
	import RadioButton from '$lib/RadioButton.svelte';
	import { randomColorIds } from '$lib/colors';
	import OkeeButton from '$lib/OkeeButton.svelte';

	export let timetable: Required<Timetable>;
	export let name: string;
	let mode: 'mono' | 'random' = 'random';
	let seed = 0;
	let ready = false;

	$: events = colorEvents(timetable, mode, seed);

	function colorEvents(t: typeof timetable, m: typeof mode, _: number) {
		const events = formatGapi(t);
		if (m == 'mono') return events;

		const colorIds = [...randomColorIds(events.length)];
		for (const i in colorIds) {
			events[i].colorId = colorIds[i];
		}
		return events;
	}

	async function callGapi() {
		ready = true;
		const { default: gapi } = await import('$lib/google');
		try {
			await gapi.auth();
			const calendar = await gapi.createCalendar(name);
			await gapi.addEventsToCalendar(events, calendar.id);
			alert('Da them lich thanh cong');
		} catch (error) {
			console.error(error);
		} finally {
			ready = false;
		}
	}
</script>

<H2>Mau sac</H2>

<p>Ban muon bo lich theo kieu nao:</p>

<div class="mt-4 flex justify-around text-base">
	<RadioButton bind:group={mode} value="mono" variant="slate">Toi gian</RadioButton>
	<RadioButton bind:group={mode} value="random" variant="rose">Nhieu mau</RadioButton>
</div>

<H2>Xem truoc</H2>
<p>Lich Google se nhin gan nhu the nay:</p>
<GapiPreview {events} />
<div class="h-4" />
<div class="flex justify-center">
	{#if mode == 'random'}
		<OkeeButton disabled={ready} variant="slate" on:click={() => seed++}>Mau khac</OkeeButton>
		<div class="w-4" />
	{/if}
	<OkeeButton disabled={ready} variant="navy" on:click={callGapi}>
		{!ready ? 'Them vao Google Calendar' : 'Dang them...'}
	</OkeeButton>
</div>
