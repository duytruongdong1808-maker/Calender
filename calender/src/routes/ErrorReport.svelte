<script lang="ts">
	import H2 from '$lib/H2.svelte';
	import {
		MixedSemesterError,
		NumOfColumnMismatchError,
		SemesterNotFoundError,
		TableNotFoundError,
		UnresolvedError
	} from '@bkalendar/core';

	export let error: Error;

	$: console.error(error);
</script>

{#if error}
	<H2 variant="rose">🚨 lỗi nhập thời khóa biểu</H2>
{/if}
{#if error instanceof NumOfColumnMismatchError}
	<p>
		thời khóa biểu chỉ có {error.expected} cột, nhưng mình thấy bạn paste {error.found} cột ở dòng:
	</p>
	<p><b>"{error.src}"</b></p>
	<p>bạn xem lại xem copy đủ thời khóa biểu chưa nha.</p>
{:else if error instanceof SemesterNotFoundError}
	<p>mình không đọc được thời khóa biểu này ở học kỳ nào.</p>
	<p>
		bạn xem lại xem đoạn copy có dòng <b>Học kỳ x Năm học y</b> chưa nha (dòng này nằm ở trên cái bảng)
	</p>
{:else if error instanceof TableNotFoundError}
	<p>mình không tìm được cái thời khóa biểu trong cái bạn vừa paste.</p>
	<p>bạn xem lại xem có copy đầy đủ thời khóa biểu chưa nha.</p>
	<p>
		<em>hint</em>: thường thì copy / paste cả trang cũng được luôn, không nhất thiết phải tự kéo
		chuột chọn rồi mới copy.
	</p>
{:else if error instanceof MixedSemesterError}
	<p>mình thấy thời khóa biểu của bạn chứa các môn của các học kỳ khác nhau, bắt đầu ngày:</p>
	<ol class="list ml-5 list-decimal">
		<li>{error.doiz1.toLocaleDateString()}</li>
		<li>{error.doiz2.toLocaleDateString()}</li>
	</ol>
	<p>
		bạn chịu khó xóa bớt các dòng của các môn không nằm trong thời khóa biểu này ra khỏi đoạn copy
		nha.
	</p>
{:else if error instanceof UnresolvedError}
	<p>thời khóa biểu của bạn hình như không có môn nào đi học hết á</p>
{:else}
	<p>{error.message}</p>
{/if}
