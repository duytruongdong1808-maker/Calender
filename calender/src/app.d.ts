// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
	// interface Locals {}
	// interface Platform {}
	// interface PrivateEnv {}
	// interface PublicEnv {}
	// interface Session {}
}

declare module '@bkalendar/core' {
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

	export function parseStudent(src: string): Timetable;
	export function parseStudent2024(src: string): Timetable;
	export function parseLecturer(src: string): Timetable;
	export function parsePostgrad(src: string): Timetable;
	export function resolve(timetable: Timetable): asserts timetable is Required<Timetable>;
	export function formatGapi(timetable: Required<Timetable>): gapi.client.calendar.EventInput[];
	export function formatIcal(timetable: Required<Timetable>): string;

	export class ParseError extends Error {
		src: string;
	}

	export class SemesterNotFoundError extends ParseError {}

	export class TableNotFoundError extends ParseError {}

	export class NumOfColumnMismatchError extends ParseError {
		expected: number;
		found: number;
	}

	export class MixedSemesterError extends Error {
		doiz1: Date;
		doiz2: Date;
	}

	export class UnresolvedError extends Error {}
}
