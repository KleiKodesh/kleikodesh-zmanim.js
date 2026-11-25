import { type AtmosphereTable } from './horizon.js';
/** Every zman the library computes, in the order of the day. Each is computed only when requested. */
export declare const ZMAN_NAMES: readonly ["chatzotNight", "alot90", "alot90Chatzot", "alot90z", "alot", "alotChatzot", "alot72z", "alot96", "alot120", "alot12", "misheyakir66", "misheyakir60", "misheyakir", "misheyakirChatzot", "misheyakir11", "misheyakirLechumra", "misheyakir10p2", "misheyakir7p65", "misheyakir12p85", "misheyakir40", "alotBaalHatanya", "sunriseBaalHatanya", "sunriseElevated", "sunrise", "sunriseTerrain", "sofShmaMga120", "sofShmaMga90", "sofShmaMga19", "sofShmaMga90z", "sofShmaMga", "sofShmaMga16", "sofShmaMga72z", "sofShmaMga72Fixed", "sofShmaMga16Fixed", "sofShmaHarari40", "sofShmaHarari25", "sofShmaAsym", "sofShmaBaalHatanya", "sofShmaBenIshChai", "sofShmaGra", "sofShmaGraFixed", "sofTfillaMga120", "sofTfillaMga90", "sofTfillaMga19", "sofTfillaMga90z", "sofTfillaMga", "sofTfillaMga16", "sofTfillaMga72z", "sofTfillaHarari40", "sofTfillaHarari25", "sofTfillaAsym", "sofTfillaBaalHatanya", "sofTfillaBenIshChai", "sofTfillaGra", "sofTfillaGraFixed", "chatzot", "chatzotFixedLocal", "minchaGedola", "minchaGedola30", "minchaGedolaFixed", "minchaGedolaHillel", "minchaGedolaBaalHatanya", "minchaGedolaHarari40", "minchaGedolaHarari25", "minchaKetana", "minchaKetanaFixed", "minchaKetanaHillel", "minchaKetanaBaalHatanya", "minchaKetanaHarari40", "minchaKetanaHarari25", "plag", "plagFixed", "plagHillel", "plagAlotTzeitGeonim", "plagBaalHatanya", "plagHarari40", "plagHarari25", "plagAsym", "plagBenIshChai", "plagMga", "plagMga72z", "plagMga19", "plagMga90z", "plagMga90", "plagMga120", "plagAlot90Tzeit645", "plagAlot72Tzeit645", "plagAlot12Tzeit7083", "candles40", "candles30", "candles22", "candles20", "candles18", "sunsetTerrain", "sunset", "sunsetElevated", "sunsetBaalHatanya", "tzeitGeonim", "tzeitBaalHatanya", "tzeit13p5", "tzeit18", "tzeit18Sun", "tzeit20", "tzeit645", "tzeit7083", "tzeit", "tzeit24", "tzeit30", "tzeit40", "tzeit45", "tzeit50", "tzeit13p5z", "beinHashmashotYereim", "beinHashmashotRt", "tzeitRt72", "tzeitRt72Zmanis", "tzeitRt16", "tzeitRt90", "tzeitRt96", "tzeit90z"];
export type ZmanName = typeof ZMAN_NAMES[number];
export type Rounding = 'up' | 'down' | 'nearest';
/**
 * How each printed minute is rounded, the stringent way: a zman that starts something rounds UP, a deadline
 * rounds DOWN. Dawn and chatzot (day and night) round DOWN (earlier).
 */
export declare const ROUNDING: Readonly<Record<ZmanName, Rounding>>;
/**
 * Zmanim that depend on refraction at the horizon, and so on the place's monthly temperatures: sunrise/sunset,
 * and everything built from them. A place without `monthlyTemperatureC` throws for these.
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
     * 12 monthly mean air temperatures AT sunrise in C (NaN = unknown), as getPlace() attaches them: the sunrise-side
     * horizon lines (sunrise level, elevated and terrain) refract through the air of that moment. Missing or NaN:
     * monthlyMinTemperatureC, then monthlyTemperatureC.
     */
    monthlySunriseTemperatureC?: readonly number[];
    /** As monthlySunriseTemperatureC, AT sunset: the sunset-side horizon lines; fallback monthlyMaxTemperatureC. */
    monthlySunsetTemperatureC?: readonly number[];
    /**
     * 12 monthly means of the daily MINIMUM air temperature in C (NaN = unknown): the sunrise-side fallback where the
     * sunrise temperature is unknown (sunrise comes shortly after the coldest hour). Missing or NaN: monthlyTemperatureC.
     */
    monthlyMinTemperatureC?: readonly number[];
    /** As monthlyMinTemperatureC, the daily MAXIMUM: used for the sunset-side horizon lines. */
    monthlyMaxTemperatureC?: readonly number[];
    /**
     * Terrain horizon for sunriseTerrain/sunsetTerrain: TERRAIN_BINS int16 values, apparent altitude in
     * hundredths of a degree (NO_TERRAIN = none), as zmanim() attaches from horizon-NN.bin. Without it those lines are null.
     */
    terrainHorizon?: ArrayLike<number> | null;
    /**
     * Model atmospheres for the ray-traced horizon refraction (assets/atmosphere.bin, parsed), as zmanim() attaches
     * them when a horizon line is asked for. Missing: the U.S. Standard Atmosphere 1976 moved to the place's climate.
     */
    atmospheres?: AtmosphereTable | null;
}
/** The geometric horizon. */
export declare const GEOMETRIC_ZENITH = 90;
/**
 * Reference only (the zmanim trace the dip in the model atmosphere, see horizonZenith): the navigators' dip of the
 * visible sea/plain horizon seen from [elevation] meters, degrees: D = 1.76' * sqrt(h m), the standard
 * dip with terrestrial refraction (the line of sight to the horizon bends down with the Earth, so the horizon looks
 * higher than the purely geometric arccos(R / (R + h)) = 1.93' * sqrt(h)). Sources: Nautical Almanac, "Dip" table
 * and its explanation; N. Bowditch, The American Practical Navigator (Pub. 9), chapter "Sight reduction", dip
 * correction D = 1.76' sqrt(h); A. T. Young, "Dip of the horizon" (aty.sdsu.edu). None below sea level.
 */
export declare function horizonDip(elevation: number): number;
/**
 * Zenith of the sun's centre at sunrise/sunset for [place] on [date], refraction ray-traced (atmosphere.ts):
 * [fromHeight] false: the upper limb at apparent altitude 0 seen from the place's own height (a level plain at that
 * height): 90 + radius + R(0). true: the upper limb on the sea-level horizon seen from that height: the dip D with
 * terrestrial refraction and R(-D), both traced in the same atmosphere: 90 + radius + D + R(-D) (Keller & Hall
 * 2022). [hour] 0 sunrise, 12 sunset (which radiosonde profile, where there is one), -1 their mean.
 */
export declare function horizonZenith(place: Coordinates, date: CivilDate, fromHeight?: boolean, hour?: 0 | 12 | -1): number;
/** Jerusalem latitude for the equinox conversions: Har HaBayit (the Temple Mount, Old City), 31.778 N. */
export declare const JERUSALEM_LAT = 31.778;
/**
 * The exact degree form of "N minutes before visible sunrise / after visible sunset in Jerusalem at the equinox":
 * the sun's depression below the geometric horizon at hour angle H0 + N * 0.25 deg, where H0 is the hour angle of
 * visible sea-level sunset (centre at -0.833 deg) at declination 0 and latitude [lat] (Har HaBayit, 31.778 N).
 * With declination 0: cos H0 = -sin(0.833) / cos(lat) and sin(altitude) = cos(lat) * cos(H). Negative [minutes]
 * gives the time before sunset (a negative depression = height above the horizon).
 * 72 -> 16.050, 90 -> 19.798, 13.5 -> 3.701, 18 -> 4.6565, -18 -> -2.992.
 */
export declare function equinoxDepression(minutes: number, lat?: number): number;
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
