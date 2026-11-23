/** Pressure in hPa at [elevation] meters (US Standard Atmosphere 1976 / ICAO, troposphere). */
export declare function standardPressure(elevation: number): number;
/** Standard-atmosphere temperature in C at [elevation] meters. */
export declare const standardTemperature: (elevation: number) => number;
/** Saemundsson refraction in arcminutes at true altitude [h] degrees, for [pressure] hPa and [temperature] C. */
export declare function refractionArcmin(h: number, pressure: number, temperature: number): number;
/** Refraction (arcminutes) at the apparent horizon: solves h + R(h) = 0 for the true altitude h. */
export declare function horizonRefractionArcmin(pressure: number, temperature: number): number;
/** Linear interpolation of 12 monthly means (each at mid-month) to a day of the year; NaN entries are skipped. */
export declare function temperatureOn(monthly: readonly number[], month: number, day: number): number;
