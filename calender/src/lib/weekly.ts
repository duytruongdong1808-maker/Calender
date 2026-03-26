import { ParseError, TableNotFoundError, type Timerow, type Timetable } from '$lib/calendarCore';

const DATE_LINE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const DATE_RE = /(\d{2})\/(\d{2})\/(\d{4})/;
const PERIOD_RE = /^tiet:\s*(\d+)\s*-\s*(\d+)$/i;
const ROOM_RE = /^phong:\s*(.+)$/i;
const LECTURER_RE = /^gv:\s*(.+)$/i;
const NOTE_RE = /^ghi chu:\s*(.+)$/i;
const EXAM_TIME_RE = /^gio thi:\s*(\d{1,2})h(\d{2})$/i;

type ParsedBlock = {
	name: string;
	group: string;
	startPeriod: number;
	endPeriod: number;
	location: string;
	lecturer?: string;
	note?: string;
	examTime?: [number, number];
	cancelled: boolean;
};

export function parseWeekly(src: string): Timetable {
	src = src.trim();
	return parseWeeklyTable(src) ?? parseWeeklySequential(src);
}

function parseWeeklyTable(src: string): Timetable | null {
	const normalized = src.replace(/\r\n/g, '\n');
	const headerStart = findLineStart(normalized, 'ca hoc');
	const morningStart = findLineStart(normalized, 'sang');
	const afternoonStart = findLineStart(normalized, 'chieu');
	const eveningStart = findLineStart(normalized, 'toi');
	const footerStart = indexOfNormalized(normalized, 'lich hoc ly thuyet');

	if ([headerStart, morningStart, afternoonStart, eveningStart, footerStart].some((value) => value == -1)) {
		return null;
	}

	const headerCells = splitRow(normalized.slice(headerStart, morningStart));
	const morningCells = splitRow(normalized.slice(morningStart, afternoonStart));
	const afternoonCells = splitRow(normalized.slice(afternoonStart, eveningStart));
	const eveningCells = splitRow(normalized.slice(eveningStart, footerStart));

	if (
		normalizeText(headerCells[0]) != 'ca hoc' ||
		normalizeText(morningCells[0]) != 'sang' ||
		normalizeText(afternoonCells[0]) != 'chieu' ||
		normalizeText(eveningCells[0]) != 'toi'
	) {
		return null;
	}

	const dates = headerCells.slice(1).map(extractDateFromText).filter((date): date is Date => date != null);
	if (dates.length != 7) {
		return null;
	}

	const rows = [
		...parseSectionCells(morningCells.slice(1), dates),
		...parseSectionCells(afternoonCells.slice(1), dates),
		...parseSectionCells(eveningCells.slice(1), dates)
	];

	if (rows.length == 0) {
		return null;
	}

	return {
		semester: fallbackSemester(dates[0]),
		startMondayUTC: mondayOfWeek(dates[0]),
		rows
	};
}

function parseWeeklySequential(src: string): Timetable {
	const lines = src.split(/\r?\n/).map((line) => line.trim());
	const selectedDate = findSelectedDate(lines, src);
	const scheduleStart = lines.findIndex((line) => {
		const normalized = normalizeText(line);
		return normalized == 'sang' || normalized == 'chieu' || normalized == 'toi';
	});

	if (scheduleStart == -1) {
		throw new TableNotFoundError(src);
	}

	const blocks = parseBlocks(lines.slice(scheduleStart));
	if (blocks.length == 0) {
		throw new TableNotFoundError(src);
	}

	const date = fromDdMmYyyy(selectedDate);
	const weekday = jsDayToWeekday(date.getUTCDay());

	return {
		semester: fallbackSemester(date),
		startMondayUTC: mondayOfWeek(date),
		rows: blocks.map((block) => toTimerow(block, weekday))
	};
}

function parseSectionCells(cells: string[], dates: Date[]): Timerow[] {
	const rows: Timerow[] = [];
	for (let i = 0; i < Math.min(cells.length, dates.length); i++) {
		const cell = cells[i].trim();
		if (!cell) continue;

		const weekday = jsDayToWeekday(dates[i].getUTCDay());
		for (const block of parseCellBlocks(cell)) {
			rows.push(toTimerow(block, weekday));
		}
	}
	return rows;
}

function parseCellBlocks(cell: string): ParsedBlock[] {
	const lines = cell.split(/\n/).map((line) => line.trim()).filter(Boolean);
	const blocks: ParsedBlock[] = [];

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		if (!line || looksLikeField(line)) continue;

		let cancelled = false;
		const normalizedLine = normalizeText(line);
		if (normalizedLine == 'tam ngung') {
			cancelled = true;
			i++;
			line = lines[i] ?? '';
		} else if (normalizedLine.startsWith('tam ngung')) {
			cancelled = true;
			line = line.slice(line.toLowerCase().indexOf('T') >= 0 ? 'Tạm ngưng'.length : 9).trim();
			if (!line) {
				line = stripCancelledPrefix(lines[i]);
			}
		}

		if (!line || looksLikeField(line)) continue;

		const name = stripCancelledPrefix(line);
		let group = '';
		let startPeriod: number | undefined;
		let endPeriod: number | undefined;
		let location = '';
		let lecturer: string | undefined;
		let note: string | undefined;
		let examTime: [number, number] | undefined;

		for (i = i + 1; i < lines.length; i++) {
			line = lines[i];
			if (!group && !looksLikeField(line)) {
				group = line;
				continue;
			}

			const normalizedField = normalizeText(line);
			const periodMatch = normalizedField.match(PERIOD_RE);
			if (periodMatch) {
				startPeriod = Number(periodMatch[1]);
				endPeriod = Number(periodMatch[2]);
				continue;
			}

			const roomMatch = normalizedField.match(ROOM_RE);
			if (roomMatch) {
				location = line.slice(line.indexOf(':') + 1).trim();
				continue;
			}

			const lecturerMatch = normalizedField.match(LECTURER_RE);
			if (lecturerMatch) {
				lecturer = line.slice(line.indexOf(':') + 1).trim();
				continue;
			}

			const noteMatch = normalizedField.match(NOTE_RE);
			if (noteMatch) {
				note = line.slice(line.indexOf(':') + 1).trim();
				continue;
			}

			const examTimeMatch = normalizedField.match(EXAM_TIME_RE);
			if (examTimeMatch) {
				examTime = [Number(examTimeMatch[1]), Number(examTimeMatch[2])];
				continue;
			}

			if (group && startPeriod !== undefined) {
				i--;
				break;
			}
		}

		if (startPeriod === undefined || endPeriod === undefined || !location) {
			throw new ParseError(name, 'Không đọc được đủ thông tin cho môn trong lịch tuần.');
		}

		blocks.push({
			name,
			group,
			startPeriod,
			endPeriod,
			location,
			lecturer,
			note,
			examTime,
			cancelled
		});
	}

	return blocks;
}

function findSelectedDate(lines: string[], src: string): string {
	let sawWeeklyHeader = false;
	for (const line of lines) {
		const normalized = normalizeText(line);
		if (normalized.includes('lich hoc') && normalized.includes('lich thi') && normalized.includes('tuan')) {
			sawWeeklyHeader = true;
		}

		const date = extractDateString(line);
		if (sawWeeklyHeader && date) {
			return date;
		}
	}

	for (const line of lines) {
		const date = extractDateString(line);
		if (date) {
			return date;
		}
	}

	const fallback = extractDateString(src);
	if (fallback) {
		return fallback;
	}

	throw new ParseError(lines[0] ?? '', 'Không tìm được ngày đang chọn.');
}

function parseBlocks(lines: string[]): ParsedBlock[] {
	const blocks: ParsedBlock[] = [];

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		if (!line || isSectionLabel(line) || isFooter(line)) {
			continue;
		}

		let cancelled = false;
		const normalizedLine = normalizeText(line);
		if (normalizedLine == 'tam ngung') {
			cancelled = true;
			i++;
			line = lines[i] ?? '';
		} else if (normalizedLine.startsWith('tam ngung')) {
			cancelled = true;
			line = stripCancelledPrefix(line);
		}

		if (!line || looksLikeField(line) || isFooter(line)) {
			continue;
		}

		const name = stripCancelledPrefix(line);
		let group = '';
		let startPeriod: number | undefined;
		let endPeriod: number | undefined;
		let location = '';
		let lecturer: string | undefined;
		let note: string | undefined;
		let examTime: [number, number] | undefined;

		for (i = i + 1; i < lines.length; i++) {
			line = lines[i];
			if (!line) continue;
			if (isSectionLabel(line) || isFooter(line)) {
				i--;
				break;
			}
			if (normalizeText(line).startsWith('tam ngung')) {
				i--;
				break;
			}
			if (!group && !looksLikeField(line)) {
				group = line;
				continue;
			}

			const normalizedField = normalizeText(line);
			const periodMatch = normalizedField.match(PERIOD_RE);
			if (periodMatch) {
				startPeriod = Number(periodMatch[1]);
				endPeriod = Number(periodMatch[2]);
				continue;
			}

			const roomMatch = normalizedField.match(ROOM_RE);
			if (roomMatch) {
				location = line.slice(line.indexOf(':') + 1).trim();
				continue;
			}

			const lecturerMatch = normalizedField.match(LECTURER_RE);
			if (lecturerMatch) {
				lecturer = line.slice(line.indexOf(':') + 1).trim();
				continue;
			}

			const noteMatch = normalizedField.match(NOTE_RE);
			if (noteMatch) {
				note = line.slice(line.indexOf(':') + 1).trim();
				continue;
			}

			const examTimeMatch = normalizedField.match(EXAM_TIME_RE);
			if (examTimeMatch) {
				examTime = [Number(examTimeMatch[1]), Number(examTimeMatch[2])];
				continue;
			}

			if (group && startPeriod !== undefined) {
				i--;
				break;
			}
		}

		if (startPeriod === undefined || endPeriod === undefined || !location) {
			throw new ParseError(name, 'Không đọc được đủ thông tin cho môn trong lịch tuần.');
		}

		blocks.push({
			name,
			group,
			startPeriod,
			endPeriod,
			location,
			lecturer,
			note,
			examTime,
			cancelled
		});
	}

	return blocks;
}

function toTimerow(block: ParsedBlock, weekday: number): Timerow {
	const periodStart = hmFrom(block.startPeriod).startHm;
	const periodEnd = hmFrom(block.endPeriod).endHm;
	const startHm = block.examTime ?? periodStart;
	const endHm = block.examTime ? offsetHm(startHm, minutesBetween(periodStart, periodEnd)) : periodEnd;

	return {
		name: block.cancelled ? `[Tam ngung] ${block.name}` : block.name,
		weekday,
		startHm,
		endHm,
		weeks: [1],
		location: block.location,
		extras: {
			group: block.group,
			status: block.cancelled ? 'tam ngung' : block.examTime ? 'thi' : 'hoc',
			...(block.lecturer ? { lecturer: block.lecturer } : {}),
			...(block.note ? { note: block.note } : {}),
			...(block.examTime ? { exam_time: `${pad2(block.examTime[0])}:${pad2(block.examTime[1])}` } : {})
		}
	};
}

function splitRow(row: string): string[] {
	return row.replace(/\r/g, '').trim().split('\t').map((cell) => cell.trim());
}

function extractDateFromText(text: string): Date | null {
	const date = extractDateString(text);
	return date ? fromDdMmYyyy(date) : null;
}

function extractDateString(text: string): string | null {
	const match = text.match(DATE_RE);
	return match ? match[0] : null;
}

function findLineStart(src: string, label: string): number {
	const normalizedSrc = normalizeText(src);
	if (normalizedSrc.startsWith(label)) return 0;
	const index = normalizedSrc.indexOf(`\n${label}`);
	return index == -1 ? -1 : index + 1;
}

function indexOfNormalized(src: string, needle: string): number {
	return normalizeText(src).indexOf(needle);
}

function looksLikeField(line: string): boolean {
	const normalized = normalizeText(line);
	return (
		PERIOD_RE.test(normalized) ||
		ROOM_RE.test(normalized) ||
		LECTURER_RE.test(normalized) ||
		NOTE_RE.test(normalized) ||
		EXAM_TIME_RE.test(normalized)
	);
}

function isSectionLabel(line: string): boolean {
	const normalized = normalizeText(line);
	return normalized == 'sang' || normalized == 'chieu' || normalized == 'toi';
}

function isFooter(line: string): boolean {
	const normalized = normalizeText(line);
	return (
		normalized.startsWith('lich hoc ly thuyet') ||
		normalized.startsWith('trang chu') ||
		normalized.startsWith('thong tin chung') ||
		normalized.startsWith('hoc tap') ||
		normalized.startsWith('dang ky hoc phan') ||
		normalized.startsWith('hoc phi')
	);
}

function stripCancelledPrefix(line: string): string {
	return line.replace(/^tạm ngưng/i, '').replace(/^tam ngung/i, '').trim();
}

function normalizeText(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'D')
		.toLowerCase();
}

function fromDdMmYyyy(src: string): Date {
	const match = src.match(DATE_LINE_RE);
	if (!match) {
		throw new ParseError(src, 'Sai định dạng ngày.');
	}
	return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
}

function mondayOfWeek(date: Date): Date {
	const weekday = jsDayToWeekday(date.getUTCDay());
	return new Date(+date - (weekday - 2) * 24 * 60 * 60 * 1000);
}

function jsDayToWeekday(day: number): number {
	return ((day + 6) % 7) + 2;
}

function fallbackSemester(date: Date): number {
	const year = date.getUTCFullYear() % 100;
	const month = date.getUTCMonth() + 1;
	const term = month <= 5 ? 2 : month <= 8 ? 3 : 1;
	return year * 10 + term;
}

function hmFrom(period: number): { startHm: [number, number]; endHm: [number, number] } {
	if (period == 0) {
		return { startHm: [0, 0], endHm: [0, 0] };
	}
	if (period >= 1 && period <= 13) {
		return { startHm: [period + 5, 0], endHm: [period + 5, 50] };
	}
	if (period == 14) {
		return { startHm: [18, 50], endHm: [19, 40] };
	}
	if (period == 15) {
		return { startHm: [19, 40], endHm: [20, 30] };
	}
	if (period == 16) {
		return { startHm: [20, 30], endHm: [21, 20] };
	}
	if (period == 17) {
		return { startHm: [21, 20], endHm: [22, 10] };
	}
	throw new ParseError(`${period}`, 'Tiết phải nhỏ hơn 18.');
}

function minutesBetween(start: [number, number], end: [number, number]): number {
	return end[0] * 60 + end[1] - (start[0] * 60 + start[1]);
}

function offsetHm(start: [number, number], deltaMinutes: number): [number, number] {
	const total = start[0] * 60 + start[1] + deltaMinutes;
	return [Math.trunc(total / 60), total % 60];
}

function pad2(n: number): string {
	return `${n}`.padStart(2, '0');
}
