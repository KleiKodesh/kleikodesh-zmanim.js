// Horizon refraction from air pressure and temperature, for sunrise and sunset.
// Independent implementation from the published literature:
// - Refraction of a body at true altitude h (degrees), in arcminutes, at 1010 hPa and 10 C:
//     R = 1.02 / tan(h + 10.3 / (h + 5.11))
//   T. Saemundsson, Sky and Telescope 72 (1986) p. 70; the inverse of G. G. Bennett, "The calculation of
//   astronomical refraction in marine navigation", Journal of Navigation 35 (1982) 255-259.
//   Scaled for other conditions by (P / 1010) * (283 / (273 + T)): J. Meeus, Astronomical Algorithms,
//   2nd ed. (1998), chapter 16, formulas 16.4 and the remark that follows.
// - Pressure from elevation: the barometric formula of the U.S. Standard Atmosphere 1976 (NOAA/NASA/USAF)
//   troposphere layer, equal to the ICAO Standard Atmosphere (Doc 7488) below 11 km:
//     P = 1013.25 * (1 - 0.0065 * H / 288.15) ^ 5.25588,   T_std = 15 - 0.0065 * H.
// Sunrise is when the sun's upper limb is at apparent altitude 0, so its true altitude h satisfies
// h + R(h) = 0; it is solved by fixed-point iteration (3-4 steps to well under 0.01').
const DEG = Math.PI / 180;
/** Pressure in hPa at [elevation] meters (US Standard Atmosphere 1976 / ICAO, troposphere). */
export function standardPressure(elevation) {
    return 1013.25 * Math.pow(1 - 0.0065 * elevation / 288.15, 5.255877);
}
/** Standard-atmosphere temperature in C at [elevation] meters. */
export const standardTemperature = (elevation) => 15 - 0.0065 * elevation;
/** Saemundsson refraction in arcminutes at true altitude [h] degrees, for [pressure] hPa and [temperature] C. */
export function refractionArcmin(h, pressure, temperature) {
    return 1.02 / Math.tan((h + 10.3 / (h + 5.11)) * DEG) * (pressure / 1010) * (283 / (273 + temperature));
}
/**
 * Refraction (arcminutes) at an apparent altitude [apparent] degrees (default 0, the sea-level horizon; negative
 * for a horizon dipped by the observer's height): solves h + R(h) = apparent for the true altitude h.
 */
export function horizonRefractionArcmin(pressure, temperature, apparent = 0) {
    let r = 34;
    for (let i = 0; i < 8; i++) {
        const next = refractionArcmin(apparent - r / 60, pressure, temperature);
        if (Math.abs(next - r) < 1e-4)
            return next;
        r = next;
    }
    return r;
}
/** Linear interpolation of 12 monthly means (each at mid-month) to a day of the year; NaN entries are skipped. */
export function temperatureOn(monthly, month, day) {
    const m = month - 1;
    const v = monthly[m];
    if (Number.isNaN(v))
        return NaN;
    const mid = 15.5;
    const otherM = day >= mid ? (m + 1) % 12 : (m + 11) % 12;
    const o = monthly[otherM];
    if (Number.isNaN(o))
        return v;
    const f = Math.abs(day - mid) / 30.44;
    return v + (o - v) * f;
}
// Near-ground temperature inversion term.
// Ray curvature near the horizon is proportional to (P / T^2) * (0.0342 + dT/dz), dT/dz in K/m and 0.0342 K/m =
// g / R_air the autoconvective gradient (A. T. Young, "Sunset science IV. Low-altitude refraction", Astron. J. 127
// (2004) 3622-3637; B. E. Schaefer & W. Liller, PASP 102 (1990) 796-805). In a uniform layer the horizon refraction
// therefore scales with (0.0342 + dT/dz) (c = 1 below). The Saemundsson / Bennett horizon value above is an empirical
// mean of observations made in ordinary, non-inverted air, so it is kept for any gradient up to isothermal (0 K/km)
// and only a surface inversion (dT/dz > 0) adds to it:
//     R' = R * (1 + c * max(0, dT/dz) / (0.0342 - 0.0065)),   c = 1,
// dT/dz being the place's monthly mean gradient at sunrise/sunset between 2 m and the first pressure level above the
// ground (data/lapse.tsv). Checked, not tuned, against published Edmonton sunset observations (test/inversion.test.ts):
// Sampson, Lozowski & Machel 2005 (26 winter sunsets, mean 0.699 deg, SD 0.118) and Peterson, Lozowski, Hube &
// Sampson 2003 (135 sunsets, mean 0.579 deg, SD 0.108).
export const INVERSION_C = 1;
/** Physical range kept for the mean inversion gradient, K/km. */
const INVERSION_MAX_K_PER_KM = 30;
/** Factor on horizon refraction for a mean near-ground gradient [lapseKPerKm] (K/km); 1 for NaN or any non-inverted gradient. */
export function inversionFactor(lapseKPerKm) {
    if (Number.isNaN(lapseKPerKm))
        return 1;
    const g = Math.max(0, Math.min(INVERSION_MAX_K_PER_KM, lapseKPerKm));
    return 1 + INVERSION_C * g / (34.2 - 6.5);
}
