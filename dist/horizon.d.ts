import { type Level } from './atmosphere.js';
/** Parsed assets/atmosphere.bin: AFGL t, ms, mw, ss, sw, then Bet Dagan month 1..12 x {00, 12 UTC}. */
export type AtmosphereTable = readonly (readonly Level[])[];
export declare function parseAtmospheres(buffer: ArrayBuffer): AtmosphereTable;
/** Inside the region the Bet Dagan soundings represent (Israel and its immediate neighbourhood). */
export declare const inBetDaganRegion: (lat: number, lng: number) => boolean;
export interface HorizonAir {
    table?: AtmosphereTable | null;
    lat: number;
    lng: number;
    /** Observer height above sea level, m. */
    height: number;
    month: number;
    day: number;
    /** The place's mean air temperature (C) for the day; NaN = use the profile as it is. */
    temperatureC: number;
}
/** Ray-traced refraction (arcmin) at apparent altitude [apparent] deg; [hour] 0 sunrise, 12 sunset, -1 both. */
export declare function tracedRefraction(air: HorizonAir, apparent: number, hour: 0 | 12 | -1): number;
/**
 * Sunrise/sunset from height over the sea-level horizon: dip (deg, with terrestrial refraction) and the refraction
 * (arcmin) of the ray grazing the sea surface, both from the same traced atmosphere. Dip 0 at or below sea level.
 */
export declare function tracedDipAndRefraction(air: HorizonAir, hour: 0 | 12 | -1): {
    dip: number;
    refraction: number;
};
