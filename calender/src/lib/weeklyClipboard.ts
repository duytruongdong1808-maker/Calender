const SECTION_LABELS = new Set(['Sáng', 'Chiều', 'Tối']);

export function normalizeWeeklyClipboardHtml(html: string): string | null {
	const doc = new DOMParser().parseFromString(html, 'text/html');
	const table = [...doc.querySelectorAll('table')].find((candidate) =>
		candidate.textContent?.includes('Ca học') &&
		candidate.textContent?.includes('Sáng') &&
		candidate.textContent?.includes('Chiều') &&
		candidate.textContent?.includes('Tối')
	);

	if (!table) {
		return null;
	}

	const rows = [...table.querySelectorAll('tr')]
		.map((row) => [...row.querySelectorAll('th,td')].map((cell) => normalizeCell(cell)))
		.filter((row) => row.length >= 2);

	const header = rows.find((row) => row[0] == 'Ca học' && row.length >= 8);
	const sections = ['Sáng', 'Chiều', 'Tối']
		.map((label) => rows.find((row) => row[0] == label && row.length >= 8))
		.filter((row): row is string[] => !!row);

	if (!header || sections.length != 3) {
		return null;
	}

	return [
		header.slice(0, 8).join('\t'),
		...sections.map((row) => row.slice(0, 8).join('\t')),
		'Lịch học lý thuyết'
	].join('\n');
}

function normalizeCell(cell: Element): string {
	const lines = (cell.textContent ?? '')
		.split('\n')
		.map((line) => line.replace(/\s+/g, ' ').trim())
		.filter(Boolean);

	if (lines.length == 0) {
		return '';
	}

	if (SECTION_LABELS.has(lines[0])) {
		return lines[0];
	}

	return lines.join('\n');
}
