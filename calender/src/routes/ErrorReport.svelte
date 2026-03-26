<script lang="ts">
	import H2 from '$lib/H2.svelte';
	import { ParseError, TableNotFoundError, UnresolvedError } from '$lib/calendarCore';

	export let error: Error;

	$: console.error(error);
</script>

{#if error}
	<H2 variant="rose">Loi nhap lich</H2>
{/if}
{#if error instanceof TableNotFoundError}
	<p>Khong tim thay bang lich tuan hop le trong doan ban vua dan.</p>
	<p>Ban nen copy truc tiep tu trang lich tuan NTTU roi dan thang vao day.</p>
{:else if error instanceof UnresolvedError}
	<p>Khong the xac dinh ngay bat dau cua lich tu input nay.</p>
{:else if error instanceof ParseError}
	<p>{error.message}</p>
{:else}
	<p>{error.message}</p>
{/if}
