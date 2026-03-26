<script lang="ts">
	import H2 from '$lib/H2.svelte';

	export let kind:
		| 'sinh viên 2024'
		| 'sinh viên'
		| 'giảng viên'
		| 'sau đại học'
		| 'lịch tuần';
</script>

<label>
	<H2>🧑 loại lịch</H2>
	<select
		bind:value={kind}
		class="mt-2 w-full rounded bg-slate-100 px-2 py-1 text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
	>
		<option value="sinh viên 2024">sinh viên (mybk.hcmut.edu.vn/app)</option>
		<option value="sinh viên">sinh viên (mybk.hcmut.edu.vn/stinfo)</option>
		<option value="giảng viên">giảng viên (tkb.hcmut.edu.vn)</option>
		<option value="sau đại học">sau đại học (grad.hcmut.edu.vn)</option>
		<option value="lịch tuần">lịch tuần (input hiện tại)</option>
	</select>
</label>
