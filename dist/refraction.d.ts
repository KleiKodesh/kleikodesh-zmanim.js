/** Pressure in hPa at [elevation] meters (US Standard Atmosphere 1976 / ICAO, troposphere). */
export declare function standardPressure(elevation: number): number;
/** Standard-atmosphere temperature in C at [elevation] meters. */
export declare const standardTemperature: (elevation: number) => number;
/** Saemundsson refraction in arcminutes at true altitude [h] degrees, for [pressure] hPa and [temperature] C. */
export declare function refractionArcmin(h: number, pressure: number, temperature: number): number;
/**
 * Refraction (arcminutes) at an apparent altitude [apparent] degrees (default 0, the sea-level horizon; negative
 * for a horizon dipped by the observer's height): solves h + R(h) = apparent for the true altitude h.
 */
export declare function horizonRefractionArcmin(pressure: number, temperature: number, apparent?: number): number;
/** Linear interpolation of 12 monthly means (each at mid-month) to a day of the year; NaN entries are skipped. */
export declare function temperatureOn(monthly: readonly number[], month: number, day: number): number;
