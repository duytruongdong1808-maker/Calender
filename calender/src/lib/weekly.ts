import { ParseError, TableNotFoundError, type Timerow, type Timetable } from '$lib/calendarCore';

const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const PERIOD_RE = /^Tiết:\s*(\d+)\s*-\s*(\d+)$/i;
const ROOM_RE = /^Phòng:\s*(.+)$/i;
const LECTURER_RE = /^GV:\s*(.+)$/i;
const NOTE_RE = /^Ghi chú:\s*(.+)$/i;
const EXAM_TIME_RE = /^Giờ thi:\s*(\d{1,2})h(\d{2})$/i;

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
	const headerStart = findLineStart(normalized, 'Ca học');
	const morningStart = findLineStart(normalized, 'Sáng');
	const afternoonStart = findLineStart(normalized, 'Chiều');
	const eveningStart = findLineStart(normalized, 'Tối');
	const footerStart = normalized.indexOf('Lịch học lý thuyết');

	if ([headerStart, morningStart, afternoonStart, eveningStart, footerStart].some((value) => value == -1)) {
		return null;
	}

	const headerCells = splitRow(normalized.slice(headerStart, morningStart));
	const morningCells = splitRow(normalized.slice(morningStart, afternoonStart));
	const afternoonCells = splitRow(normalized.slice(afternoonStart, eveningStart));
	const eveningCells = splitRow(normalized.slice(eveningStart, footerStart));

	if (headerCells[0] != 'Ca học' || morningCells[0] != 'Sáng' || afternoonCells[0] != 'Chiều' || eveningCells[0] != 'Tối') {
		return null;
	}

	const dates = headerCells.slice(1).map(extractDateFromCell).filter((date): date is Date => date != null);
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
	const selectedDate = findSelectedDate(lines);
	const scheduleStart = lines.findIndex((line) => line == 'Sáng' || line == 'Chiều' || line == 'Tối');

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
		if (line == 'Tạm ngưng') {
			cancelled = true;
			i++;
			line = lines[i] ?? '';
		} else if (line.startsWith('Tạm ngưng')) {
			cancelled = true;
			line = line.slice('Tạm ngưng'.length).trim();
		}

		if (!line || looksLikeField(line)) continue;

		const name = line;
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

			const periodMatch = line.match(PERIOD_RE);
			if (periodMatch) {
				startPeriod = Number(periodMatch[1]);
				endPeriod = Number(periodMatch[2]);
				continue;
			}

			const roomMatch = line.match(ROOM_RE);
			if (roomMatch) {
				location = roomMatch[1].trim();
				continue;
			}

			const lecturerMatch = line.match(LECTURER_RE);
			if (lecturerMatch) {
				lecturer = lecturerMatch[1].trim();
				continue;
			}

			const noteMatch = line.match(NOTE_RE);
			if (noteMatch) {
				note = noteMatch[1].trim();
				continue;
			}

			const examTimeMatch = line.match(EXAM_TIME_RE);
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

function findSelectedDate(lines: string[]): string {
	let sawWeeklyHeader = false;
	for (const line of lines) {
		if (line.includes('Lịch học, lịch thi theo tuần')) {
			sawWeeklyHeader = true;
			continue;
		}
		if (sawWeeklyHeader && DATE_RE.test(line)) {
			return line;
		}
	}

	for (const line of lines) {
		if (DATE_RE.test(line)) {
			return line;
		}
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
		if (line == 'Tạm ngưng') {
			cancelled = true;
			i++;
			line = lines[i] ?? '';
		} else if (line.startsWith('Tạm ngưng')) {
			cancelled = true;
			line = line.slice('Tạm ngưng'.length).trim();
		}

		if (!line || looksLikeField(line) || isFooter(line)) {
			continue;
		}

		const name = line;
		let group = '';
		let startPeriod: number | undefined;
		let endPeriod: number | undefined;
		let location = '';
		let lecturer: string | undefined;
		let note: string | undefined;
		let examTime: [number, number] | undefined;

		for (i = i + 1; i < lines.length; i++) {
			line = lines[i];
			if (!line) {
				continue;
			}
			if (isSectionLabel(line) || isFooter(line)) {
				i--;
				break;
			}
			if (line == 'Tạm ngưng' || line.startsWith('Tạm ngưng')) {
				i--;
				break;
			}
			if (!group && !looksLikeField(line)) {
				group = line;
				continue;
			}

			const periodMatch = line.match(PERIOD_RE);
			if (periodMatch) {
				startPeriod = Number(periodMatch[1]);
				endPeriod = Number(periodMatch[2]);
				continue;
			}

			const roomMatch = line.match(ROOM_RE);
			if (roomMatch) {
				location = roomMatch[1].trim();
				continue;
			}

			const lecturerMatch = line.match(LECTURER_RE);
			if (lecturerMatch) {
				lecturer = lecturerMatch[1].trim();
				continue;
			}

			const noteMatch = line.match(NOTE_RE);
			if (noteMatch) {
				note = noteMatch[1].trim();
				continue;
			}

			const examTimeMatch = line.match(EXAM_TIME_RE);
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

function extractDateFromCell(cell: string): Date | null {
	const lines = cell.split('\n').map((line) => line.trim()).filter(Boolean);
	for (let i = lines.length - 1; i >= 0; i--) {
		if (DATE_RE.test(lines[i])) {
			return fromDdMmYyyy(lines[i]);
		}
	}
	return null;
}

function findLineStart(src: string, label: string): number {
	if (src.startsWith(label)) return 0;
	const index = src.indexOf(`\n${label}`);
	return index == -1 ? -1 : index + 1;
}

function looksLikeField(line: string): boolean {
	return PERIOD_RE.test(line) || ROOM_RE.test(line) || LECTURER_RE.test(line) || NOTE_RE.test(line) || EXAM_TIME_RE.test(line);
}

function isSectionLabel(line: string): boolean {
	return line == 'Sáng' || line == 'Chiều' || line == 'Tối';
}

function isFooter(line: string): boolean {
	return (
		line.startsWith('Lịch học lý thuyết') ||
		line.startsWith('Trang chủ') ||
		line.startsWith('TRANG CHỦ') ||
		line.startsWith('THÔNG TIN CHUNG') ||
		line.startsWith('HỌC TẬP') ||
		line.startsWith('ĐĂNG KÝ HỌC PHẦN') ||
		line.startsWith('HỌC PHÍ')
	);
}

function fromDdMmYyyy(src: string): Date {
	const match = src.match(DATE_RE);
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
