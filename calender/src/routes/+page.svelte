<script lang="ts">
	import NttuCalendar from './NttuCalendar.svelte';
	import PasteArea from './PasteArea.svelte';
	import { resolve, type Timetable } from '$lib/calendarCore';
	import { parseWeekly } from '$lib/weekly';
	import ErrorReport from './ErrorReport.svelte';
	import OutputSelect from './OutputSelect.svelte';
	import GapiOutputSection from './GapiOutputSection.svelte';
	import IcalOutputSection from './IcalOutputSection.svelte';
	import { fly } from 'svelte/transition';
	import Key from '$lib/Key.svelte';
	import NameInput from './NameInput.svelte';
	import OkeeButton from '$lib/OkeeButton.svelte';

	let raw: string;
	let output: 'ical' | 'gapi' = 'gapi';
	let step: 'import' | 'export' = 'import';
	let error: Error | null = null;
	let name: string;

	$: timetable = process(raw);

	function process(r: typeof raw) {
		if (!r) return null;

		try {
			const timetable = parseWeekly(r);
			resolve(timetable);
			name = `NTTU-${timetable.startMondayUTC.toISOString().slice(0, 10)}`;
			error = null;
			return timetable;
		} catch (e) {
			error = e as Error;
			return null;
		}
	}

	function nextStep() {
		step = 'export';
	}
</script>

<svelte:head>
	<title>Nhap lich NTTU</title>
</svelte:head>

<NttuCalendar />
<p class="text-right"><i>Chuyen lich tuan NTTU sang Google Calendar hoac file .ics.</i></p>
<div class="h-4" />
{#if step == 'import'}
	<div out:fly={{ delay: 500, duration: 500, x: -100 }}>
		<p>
			Hay mo trang lich tuan NTTU, <Key>Ctrl</Key>
			<Key>A</Key> roi <Key>Ctrl</Key>
			<Key>C</Key>, sau do dan vao day de minh tach lich cho ban.
		</p>
		<div class="h-4" />
		<PasteArea bind:raw />
		<div class="h-4" />
		<div class="flex justify-end">
			<OkeeButton variant="navy" disabled={!timetable || !!error} on:click={nextStep} />
		</div>
		{#if error}
			<div class="h-4" />
			<ErrorReport {error} />
		{/if}
	</div>
{:else}
	<div in:fly={{ delay: 1000, x: 100 }}>
		<NameInput bind:name />
		<div class="h-4" />
		<OutputSelect bind:output />
		<div class="h-4" />
		{#if timetable}
			{#if output == 'gapi'}
				<GapiOutputSection {name} {timetable} />
			{:else}
				<IcalOutputSection {name} {timetable} />
			{/if}
		{/if}
	</div>
{/if}
