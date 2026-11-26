// The classic closed-form refraction formula. Kept as a reference (tests compare the ray-traced refraction of
// src/atmosphere.ts with it); the zmanim no longer use it.
// Independent implementation from the published literature:
// - Refraction of a body at true altitude h (degrees), in arcminutes, at 1010 hPa and 10 C:
//     R = 1.02 / tan(h + 10.3 / (h + 5.11))
//   T. Saemundsson, Sky and Telescope 72 (1986) p. 70; the inverse of G. G. Bennett, "The calculation of
//   astronomical refraction in marine navigation", Journal of Navigation 35 (1982) 255-259,
//   doi:10.1017/S0373463300022037. Secondary only: both as given in Meeus (1998) ch. 16 (eq. 16.4 and its source note).
//   Scaled for other conditions by (P / 1010) * (283 / (273 + T)): J. Meeus, Astronomical Algorithms,
//   2nd ed. (1998), chapter 16, formulas 16.4 and the remark that follows.
// - Pressure from elevation: the barometric formula of the U.S. Standard Atmosphere 1976 (NOAA/NASA/USAF)
//   troposphere layer, equal to the ICAO Standard Atmosphere (Doc 7488) below 11 km:
//     P = 1013.25 * (1 - 0.0065 * H / 288.15) ^ 5.25588,   T_std = 15 - 0.0065 * H.
//   (NOAA-S/T 76-1562 (1976); exponent g0 M0 / (R* L) = 9.80665 * 0.0289644 / (8.31432 * 0.0065) = 5.25588.)
// Sunrise is when the sun's upper limb is at apparent altitude 0, so its true altitude h satisfies
// h + R(h) = 0; it is solved by fixed-point iteration (3-4 steps to well under 0.01').

const DEG = Math.PI / 180

/** Pressure in hPa at [elevation] meters (US Standard Atmosphere 1976 / ICAO, troposphere). */
export function standardPressure(elevation: number): number {
  return 1013.25 * Math.pow(1 - 0.0065 * elevation / 288.15, 5.255877)
}

/** Standard-atmosphere temperature in C at [elevation] meters. */
export const standardTemperature = (elevation: number): number => 15 - 0.0065 * elevation

/** Saemundsson refraction in arcminutes at true altitude [h] degrees, for [pressure] hPa and [temperature] C. */
export function refractionArcmin(h: number, pressure: number, temperature: number): number {
  return 1.02 / Math.tan((h + 10.3 / (h + 5.11)) * DEG) * (pressure / 1010) * (283 / (273 + temperature))
}

/**
 * Refraction (arcminutes) at an apparent altitude [apparent] degrees (default 0, the sea-level horizon; negative
 * for a horizon dipped by the observer's height): solves h + R(h) = apparent for the true altitude h.
 */
export function horizonRefractionArcmin(pressure: number, temperature: number, apparent = 0): number {
  let r = 34
  for (let i = 0; i < 8; i++) {
    const next = refractionArcmin(apparent - r / 60, pressure, temperature)
    if (Math.abs(next - r) < 1e-4) return next
    r = next
  }
  return r
}

/** Linear interpolation of 12 monthly means (each at mid-month) to a day of the year; NaN entries are skipped. Numerical choice (mid-month = day 15.5, mean month 30.44 d). */
export function temperatureOn(monthly: readonly number[], month: number, day: number): number {
  const m = month - 1
  const v = monthly[m]!
  if (Number.isNaN(v)) return NaN
  const mid = 15.5
  const otherM = day >= mid ? (m + 1) % 12 : (m + 11) % 12
  const o = monthly[otherM]!
  if (Number.isNaN(o)) return v
  const f = Math.abs(day - mid) / 30.44
  return v + (o - v) * f
}
