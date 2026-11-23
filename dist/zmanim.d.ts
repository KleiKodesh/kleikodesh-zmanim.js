/** Every zman the library computes, in the order of the day. Each is computed only when requested. */
export declare const ZMAN_NAMES: readonly ["chatzotNight", "alot90Visible", "alot90", "alot90Chatzot", "alotVisible", "alot", "alotChatzot", "misheyakirVisible", "misheyakir", "misheyakirChatzot", "misheyakir11", "misheyakir10p2", "sunriseElevated", "sunrise", "sofShmaMga", "sofShmaMga16", "sofShmaGra", "sofTfillaMga", "sofTfillaMga16", "sofTfillaGra", "chatzot", "minchaGedola", "minchaGedola30", "minchaKetana", "plag", "plagMga", "sunset", "sunsetElevated", "tzeitGeonim", "tzeitGeonimVisible", "tzeit7083", "tzeit", "tzeitVisible"];
export type ZmanName = typeof ZMAN_NAMES[number];
export type Rounding = 'up' | 'down' | 'nearest';
/**
 * How each printed minute is rounded, the stringent way: a zman that starts something rounds UP, a deadline
 * rounds DOWN, chatzot (end of morning and start of afternoon) to the nearest minute.
 */
export declare const ROUNDING: Readonly<Record<ZmanName, Rounding>>;
/**
 * Zmanim that depend on refraction at the horizon, and so on the place's monthly temperatures: sunrise/sunset,
 * everything built from them, and the Visible degree lines. A place without `monthlyTemperatureC` throws for these.
 */
export declare const HORIZON_ZMANIM: ReadonlySet<ZmanName>;
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
    /** Meters; sets the air pressure for refraction and the horizon dip of sunriseElevated/sunsetElevated. Default 0. */
    elevation?: number;
    /**
     * 12 monthly mean air temperatures in C (NaN = unknown), as getPlace() attaches them; or 'standard' to use the
     * standard-atmosphere temperature at [elevation] on purpose. Required (else an Error) for HORIZON_ZMANIM, so a
     * bare { lat, lng } never silently loses the place's climate.
     */
    monthlyTemperatureC?: readonly number[] | 'standard';
}
/** The geometric horizon. */
export declare const GEOMETRIC_ZENITH = 90;
/** Geometric dip of the sea horizon seen from [elevation] meters, degrees: arccos(R / (R + h)). None below sea level. */
export declare function horizonDip(elevation: number): number;
/**
 * Zenith of the sun's centre at sunrise/sunset for [place] on [date]: 90 + radius + dip + refraction at the
 * apparent horizon, with pressure from the elevation and temperature from the monthly means (refraction.ts).
 * [fromHeight] false: the sea-level horizon (no dip); true: the horizon seen from the place's own elevation.
 */
export declare function horizonZenith(place: Coordinates, date: CivilDate, fromHeight?: boolean): number;
export declare function addDays(d: CivilDate, days: number): CivilDate;
/**
 * Epoch ms of a sun event (kind -1 rise, 0 transit, +1 set, the sun's centre at [zenith]) on the local mean solar
 * day that starts at [lmtMidnight] (UTC ms of that date) at [lat]/[lng]; NaN where the sun never reaches [zenith].
 * SPA gives the event of a UT date; the UT date is moved until the event falls in the local mean day.
 */
export declare function sunEventMs(lat: number, lng: number, lmtMidnight: number, zenith: number, kind: -1 | 0 | 1): number;
/** The instant (epoch nanoseconds, millisecond precision) of each requested zman; null where the sun never gets there. */
export declare function zmanInstants(place: Coordinates, date: CivilDate, which?: readonly ZmanName[]): Partial<Record<ZmanName, bigint | null>>;
/** Epoch milliseconds printed as HH:MM in [timeZone], rounded to the minute as [rounding] says. */
export declare function formatTime(epochMs: number, rounding: Rounding, timeZone: string): string;
/** Epoch milliseconds of an instant (floored). */
export declare function epochMs(ns: bigint): number;
/** Synchronous core: the requested zmanim printed HH:MM (null where the sun never gets there). */
export declare function computeZmanim(place: Coordinates, date: CivilDate, which?: readonly ZmanName[]): Partial<Record<ZmanName, string | null>>;
