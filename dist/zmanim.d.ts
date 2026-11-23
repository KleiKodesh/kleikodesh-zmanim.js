/** Every zman the library computes, in the order of the day. Each is computed only when requested. */
export declare const ZMAN_NAMES: readonly ["chatzotNight", "alot90Visible", "alot90", "alot90Chatzot", "alot90z", "alotVisible", "alot", "alotChatzot", "alot72z", "misheyakirVisible", "misheyakir", "misheyakirChatzot", "misheyakir11", "misheyakir10p2", "misheyakir7p65", "misheyakir12p85", "alotBaalHatanya", "sunriseBaalHatanya", "sunriseElevated", "sunrise", "sunriseTerrain", "sofShmaMga120", "sofShmaMga90", "sofShmaMga19", "sofShmaMga90z", "sofShmaMga", "sofShmaMga16", "sofShmaMga72z", "sofShmaMga72Fixed", "sofShmaMga16Fixed", "sofShmaHarari40", "sofShmaHarari25", "sofShmaAsym", "sofShmaBaalHatanya", "sofShmaGra", "sofShmaGraFixed", "sofTfillaMga120", "sofTfillaMga90", "sofTfillaMga19", "sofTfillaMga90z", "sofTfillaMga", "sofTfillaMga16", "sofTfillaMga72z", "sofTfillaHarari40", "sofTfillaHarari25", "sofTfillaAsym", "sofTfillaBaalHatanya", "sofTfillaGra", "sofTfillaGraFixed", "chatzot", "chatzotFixedLocal", "minchaGedola", "minchaGedola30", "minchaGedolaFixed", "minchaGedolaHillel", "minchaGedolaBaalHatanya", "minchaGedolaHarari40", "minchaGedolaHarari25", "minchaKetana", "minchaKetanaFixed", "minchaKetanaHillel", "minchaKetanaBaalHatanya", "minchaKetanaHarari40", "minchaKetanaHarari25", "plag", "plagFixed", "plagHillel", "plagBaalHatanya", "plagHarari40", "plagHarari25", "plagAsym", "plagMga", "plagMga72z", "plagMga19", "plagMga90z", "plagMga90", "plagMga120", "plagAlot90Tzeit645", "plagAlot72Tzeit645", "candles40", "candles30", "candles22", "candles20", "candles18", "sunsetTerrain", "sunset", "sunsetElevated", "sunsetBaalHatanya", "tzeitGeonim", "tzeitGeonimVisible", "tzeitBaalHatanya", "tzeit13p5", "tzeit18", "tzeit18Sun", "tzeit20", "tzeit645", "tzeit7083", "tzeit", "tzeitVisible", "tzeit24", "tzeit30", "tzeit40", "tzeit50", "beinHashmashotYereim", "beinHashmashotRt", "tzeitRt72", "tzeitRt72Zmanis", "tzeitRt16", "tzeit90z"];
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
/** Zmanim that need the place's terrain horizon (Coordinates.terrainHorizon); null without it. */
export declare const TERRAIN_ZMANIM: ReadonlySet<ZmanName>;
/** Azimuth bins of a terrain horizon: one per degree, 30..150 (east) then 210..330 (west). */
export declare const TERRAIN_BINS = 242;
/** Terrain horizon altitude (degrees, apparent) toward [azimuth] (from north, eastward); NaN outside the bins or without data. */
export declare function terrainAltitude(profile: ArrayLike<number>, azimuth: number): number;
/** Missing value in a terrain horizon (int16: hundredths of a degree). */
export declare const NO_TERRAIN = -32768;
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
    /**
     * Terrain horizon for sunriseTerrain/sunsetTerrain: TERRAIN_BINS int16 values, apparent altitude in
     * hundredths of a degree (NO_TERRAIN = none), as zmanim() attaches from horizon-NN.bin. Without it those lines are null.
     */
    terrainHorizon?: ArrayLike<number> | null;
    /**
     * 12 monthly mean near-ground temperature gradients at sunrise/sunset in K/km (NaN = unknown), as getPlace()
     * attaches them; adds the surface-inversion term to horizon refraction (refraction.ts). Missing: no term.
     */
    monthlyLapseKPerKm?: readonly number[];
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
