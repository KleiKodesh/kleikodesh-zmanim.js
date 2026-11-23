/** Every zman the library computes, in the order of the day. */
export declare const ZMAN_NAMES: readonly ["chatzotNight", "alot", "misheyakir", "sunrise", "sofShmaMga", "sofShmaGra", "sofTfillaMga", "sofTfillaGra", "chatzot", "minchaGedola", "minchaKetana", "plag", "sunset", "tzeit"];
export type ZmanName = typeof ZMAN_NAMES[number];
export type Rounding = 'up' | 'down' | 'nearest';
/**
 * How each printed minute is rounded, the stringent way: a zman that starts something rounds UP, a deadline
 * rounds DOWN, chatzot (end of morning and start of afternoon) to the nearest minute.
 */
export declare const ROUNDING: Readonly<Record<ZmanName, Rounding>>;
/** A civil date; month 1-12. */
export interface CivilDate {
    year: number;
    month: number;
    day: number;
}
/** What the calculation needs of a place. */
export interface Coordinates {
    lat: number;
    lng: number;
    tzid: string;
    /** Standard (raw) UTC offset of the zone in minutes; only used for zones across the antimeridian. */
    rawOffsetMinutes?: number;
    /** Meters; sets the air pressure for refraction (sunrise/sunset stay sea-level, at the geometric horizon). Default 0. */
    elevation?: number;
    /** 12 monthly mean air temperatures in C (NaN = unknown); default: standard atmosphere at [elevation]. */
    monthlyTemperatureC?: readonly number[];
}
/**
 * Zenith of sea-level sunrise/sunset for [place] on [date]: 90 + radius + refraction at the apparent horizon,
 * with pressure from the elevation and temperature from the monthly means (see refraction.ts).
 */
export declare function horizonZenith(place: Coordinates, date: CivilDate): number;
/** Kotlin Instant.toEpochMilliseconds(): floors. */
declare function toMs(ns: bigint): number;
export declare function addDays(d: CivilDate, days: number): CivilDate;
/** The instant (epoch nanoseconds) of each requested zman; null where the sun never gets there. */
export declare function zmanInstants(place: Coordinates, date: CivilDate, which?: readonly ZmanName[]): Partial<Record<ZmanName, bigint | null>>;
/** Epoch milliseconds printed as HH:MM in [timeZone], rounded to the minute as [rounding] says. */
export declare function formatTime(epochMs: number, rounding: Rounding, timeZone: string): string;
/** Epoch milliseconds of an instant, floored (as Kotlin reads it). */
export declare const epochMs: typeof toMs;
/** Synchronous core: the requested zmanim printed HH:MM (null where the sun never gets there). */
export declare function computeZmanim(place: Coordinates, date: CivilDate, which?: readonly ZmanName[]): Partial<Record<ZmanName, string | null>>;
export {};
