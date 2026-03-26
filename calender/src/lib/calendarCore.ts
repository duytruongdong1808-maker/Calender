export type Timetable = {
	semester: number;
	startMondayUTC?: Date;
	rows: Timerow[];
};

export type Timerow = {
	name: string;
	weekday: number;
	startHm: [number, number];
	endHm: [number, number];
	weeks: (number | null)[];
	location: string;
	extras: Record<string, string>;
};

export class ParseError extends Error {
	constructor(public src: string, message: string) {
		super(message);
	}
}

export class TableNotFoundError extends ParseError {
	constructor(public src: string) {
		super(src, 'Khong tim thay bang lich tuan hop le.');
	}
}

export class UnresolvedError extends Error {
	constructor() {
		super('Khong the xac dinh ngay bat dau cua lich.');
	}
}

const ASIA_HO_CHI_MINH = 'Asia/Ho_Chi_Minh';
const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

export function resolve(timetable: Timetable): asserts timetable is Required<Timetable> {
	if (!timetable.startMondayUTC) {
		throw new UnresolvedError();
	}
}

export function formatGapi(timetable: Required<Timetable>): gapi.client.calendar.EventInput[] {
	return timetable.rows
		.filter((row) => !isUnresolvable(row))
		.map((row) => {
			const startIndex = row.weeks.findIndex(Boolean);
			return {
				summary: row.name,
				description: Object.entries(row.extras)
					.map(([key, value]) => `${key}: ${value}`)
					.join('\n'),
				location: row.location,
				start: {
					dateTime: dateOfIndex(startIndex, row.startHm, timetable.startMondayUTC, row.weekday).toISOString(),
					timeZone: ASIA_HO_CHI_MINH
				},
				end: {
					dateTime: dateOfIndex(startIndex, row.endHm, timetable.startMondayUTC, row.weekday).toISOString(),
					timeZone: ASIA_HO_CHI_MINH
				},
				recurrence: icalRrule(row, timetable.startMondayUTC)
			};
		});
}

export function formatIcal(timetable: Required<Timetable>): string {
	const lines = [
		'BEGIN:VCALENDAR',
		'PRODID:-//nttu-calendar//Weekly Schedule//VI',
		'VERSION:2.0',
		'BEGIN:VTIMEZONE',
		'TZID:Asia/Ho_Chi_Minh',
		'TZURL:http://tzurl.org/zoneinfo-outlook/Asia/Ho_Chi_Minh',
		'X-LIC-LOCATION:Asia/Ho_Chi_Minh',
		'BEGIN:STANDARD',
		'TZOFFSETFROM:+0700',
		'TZOFFSETTO:+0700',
		'TZNAME:+07',
		'DTSTART:19700101T000000',
		'END:STANDARD',
		'END:VTIMEZONE'
	];

	for (const row of timetable.rows) {
		if (isUnresolvable(row)) continue;

		const startIndex = row.weeks.findIndex(Boolean);
		lines.push(
			'BEGIN:VEVENT',
			`UID:${crypto.randomUUID()}@nttu-calendar`,
			`DTSTAMP:${formatUTC(new Date())}`,
			`SUMMARY:${escapeIcal(row.name)}`,
			`DESCRIPTION:${escapeIcal(
				Object.entries(row.extras)
					.map(([key, value]) => `${key}: ${value}`)
					.join('\n')
			)}`,
			`LOCATION:${escapeIcal(row.location)}`,
			`DTSTART;TZID=${ASIA_HO_CHI_MINH}:${formatLocal(
				dateOfIndex(startIndex, row.startHm, timetable.startMondayUTC, row.weekday)
			)}`,
			`DTEND;TZID=${ASIA_HO_CHI_MINH}:${formatLocal(
				dateOfIndex(startIndex, row.endHm, timetable.startMondayUTC, row.weekday)
			)}`,
			...icalRrule(row, timetable.startMondayUTC),
			'END:VEVENT'
		);
	}

	lines.push('END:VCALENDAR');
	return lines.join('\r\n');
}

function icalRrule(row: Timerow, startMondayUTC: Date): string[] {
	const start = row.weeks.findIndex(Boolean);
	const end = row.weeks.findLastIndex(Boolean);
	if (start == -1 || end == -1 || start == end) {
		return [];
	}

	const rules = [
		`RRULE:FREQ=WEEKLY;UNTIL=${formatUTC(dateOfIndex(end, row.startHm, startMondayUTC, row.weekday))}`
	];
	const excluded = row.weeks
		.map((enabled, index) => ({ enabled, index }))
		.filter(({ enabled, index }) => index >= start && index <= end && !enabled)
		.map(({ index }) => formatLocal(dateOfIndex(index, row.startHm, startMondayUTC, row.weekday)));

	if (excluded.length > 0) {
		rules.push(`EXDATE;TZID=${ASIA_HO_CHI_MINH}:${excluded.join(',')}`);
	}

	return rules;
}

function dateOfIndex(
	index: number,
	hm: [number, number],
	startMondayUTC: Date,
	weekday: number
): Date {
	return new Date(+startMondayUTC + index * WEEK + (weekday - 2) * DAY + (hm[0] - 7) * 60 * 60 * 1000 + hm[1] * 60 * 1000);
}

function formatUTC(date: Date): string {
	return date
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}Z$/, 'Z');
}

function formatLocal(date: Date): string {
	const formatter = new Intl.DateTimeFormat('en-CA', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
		timeZone: ASIA_HO_CHI_MINH
	});
	const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
	return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`;
}

function escapeIcal(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

function isUnresolvable(row: Timerow): boolean {
	return Number.isNaN(row.weekday) || row.weeks.length == 0 || (row.weeks.length == 1 && row.weeks[0] == null);
}
