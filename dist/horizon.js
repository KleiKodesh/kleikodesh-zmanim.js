// Which model atmosphere a place gets, and its ray-traced horizon refraction (src/atmosphere.ts).
//
// - Israel and its neighbourhood: the monthly mean radiosonde profiles of Bet Dagan (NOAA IGRA v2, station
//   ISM00040179, 1995-2024; scripts/build-atmosphere.mjs): the 00 UTC (night) profile for sunrise, the 12 UTC
//   (afternoon) profile for sunset, blended between neighbouring months by the day of the month.
// - Elsewhere: the AFGL standard profiles (Anderson et al. 1986, AFGL-TR-86-0110): tropical within 23.5 deg of the
//   equator, midlatitude summer/winter to 52 deg, subarctic summer/winter beyond, blended over the year by season.
// - Without the profile table (bare coordinates): the U.S. Standard Atmosphere 1976.
// The profile is moved to the place's own climate: the anomaly T_place - T_profile at the observer's height is
// applied at the observer and tapered off over the boundary layer above (atmosphere.ts); below the observer, Bet Dagan
// (a coastal-plain profile) keeps its own air under a 200 m surface layer over the observer's terrain, so the distant
// low horizon and the grazing ray's tangent point see the plain's air; the generic profiles take the anomaly in full.
// T_place is the monthly mean 2 m temperature AT sunrise for sunrise and AT sunset for sunset (else the mean daily minimum / maximum), measured against
// the profile actually traced (Bet Dagan 00 / 12 UTC, or the daily-mean AFGL profile) at the observer's height, so the
// surface air is that of the event's hour while the air aloft (where the diurnal cycle is small) stays the profile's.
// Bet Dagan 00 UTC (02-03 local) is 2.5-4.8 h before sunrise, 12 UTC (14-15 local) 2.5-5 h before sunset. The record
// also has 06/18 UTC launches, but few complete ones (about 100 a month at 06 UTC, 0-100 at 18 UTC, 1995-2010), too
// uneven for event-hour profiles. Where unknown, the monthly mean against the profile's daily mean. Deep-angle lines
// do not use any of this (they are geometric).
import { Atmosphere, levelAt, SURFACE_LAYER, usStandard1976 } from './atmosphere.js';
export function parseAtmospheres(buffer) {
    const v = new DataView(buffer);
    const count = v.getUint16(0, true);
    const out = [];
    let o = 2;
    for (let i = 0; i < count; i++) {
        const n = v.getUint16(o, true);
        o += 2;
        const levels = [];
        for (let k = 0; k < n; k++, o += 16)
            levels.push({ z: v.getFloat32(o, true), t: v.getFloat32(o + 4, true), p: v.getFloat32(o + 8, true), e: v.getFloat32(o + 12, true) });
        out.push(levels);
    }
    return out;
}
const AFGL_T = 0, AFGL_MS = 1, AFGL_MW = 2, AFGL_SS = 3, AFGL_SW = 4, BET_DAGAN = 5;
const US1976 = usStandard1976();
/** Inside the region the Bet Dagan soundings represent (Israel and its immediate neighbourhood). */
export const inBetDaganRegion = (lat, lng) => lat >= 29 && lat <= 33.6 && lng >= 34 && lng <= 36.2;
/** Weighted profiles for [lat, lng] on month/day; [hour] 0 sunrise, 12 sunset, -1 both (mean). */
function profiles(table, lat, lng, month, day, hour) {
    if (!table)
        return [[-1, 1]];
    if (inBetDaganRegion(lat, lng)) {
        const m = month - 1;
        const other = day >= 15.5 ? (m + 1) % 12 : (m + 11) % 12;
        const f = Math.min(0.5, Math.abs(day - 15.5) / 30.44);
        const hours = hour < 0 ? [0, 1] : [hour ? 1 : 0];
        const out = [];
        for (const h of hours) {
            out.push([BET_DAGAN + m * 2 + h, (1 - f) / hours.length], [BET_DAGAN + other * 2 + h, f / hours.length]);
        }
        return out;
    }
    const a = Math.abs(lat);
    if (a < 23.5)
        return [[AFGL_T, 1]];
    // Day of the year from month/day (non-leap is enough here); summer weight 0 mid-January, 1 mid-July (north).
    const doy = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][month - 1] + day;
    let w = (1 - Math.cos(2 * Math.PI * (doy - 15) / 365.25)) / 2;
    if (lat < 0)
        w = 1 - w;
    return a < 52 ? [[AFGL_MS, w], [AFGL_MW, 1 - w]] : [[AFGL_SS, w], [AFGL_SW, 1 - w]];
}
const levelsOf = (table, i) => (i < 0 || !table ? US1976 : table[i]);
/**
 * Temperature (K) the anomaly is measured from: the profile's daily mean at [z] (Bet Dagan: mean of 00 and 12 UTC);
 * [diurnal] (a daily minimum/maximum is applied): the traced profile's own temperature there.
 */
function referenceT(table, i, z, diurnal = false) {
    if (i >= BET_DAGAN && table && !diurnal) {
        const base = BET_DAGAN + Math.floor((i - BET_DAGAN) / 2) * 2;
        return (levelAt(table[base], z).t + levelAt(table[base + 1], z).t) / 2;
    }
    return levelAt(levelsOf(table, i), z).t;
}
/** Anomaly grid step, K: refraction is traced at grid anomalies and interpolated linearly between them. */
const ANOMALY_STEP = 0.5;
const cache = new Map();
const CACHE_SIZE = 96;
function atmosphere(table, i, height, anomaly) {
    const key = `${table ? 't' : 'u'}${i}|${height}|${anomaly}`;
    let a = cache.get(key);
    if (!a) {
        // Bet Dagan is measured over the coastal plain: below the observer the air is its own (surface layer only).
        a = new Atmosphere(levelsOf(table, i), height, anomaly, table && i >= BET_DAGAN ? SURFACE_LAYER : Infinity);
        if (cache.size >= CACHE_SIZE)
            cache.delete(cache.keys().next().value);
        cache.set(key, a);
    }
    return a;
}
/** Sum over the place's profiles of weight x f(atmosphere), the anomaly interpolated on its grid. */
function traced(air, hour, f) {
    let total = 0;
    for (const [i, w] of profiles(air.table, air.lat, air.lng, air.month, air.day, hour)) {
        if (w === 0)
            continue;
        const anomaly = Number.isNaN(air.temperatureC) ? 0 : air.temperatureC + 273.15 - referenceT(air.table, i, air.height, air.diurnal);
        const g = anomaly / ANOMALY_STEP, lo = Math.floor(g), frac = g - lo;
        const a = f(atmosphere(air.table, i, air.height, lo * ANOMALY_STEP));
        const b = frac > 1e-9 ? f(atmosphere(air.table, i, air.height, (lo + 1) * ANOMALY_STEP)) : a;
        total += w * (a + (b - a) * frac);
    }
    return total;
}
/** Ray-traced refraction (arcmin) at apparent altitude [apparent] deg; [hour] 0 sunrise, 12 sunset, -1 both. */
export function tracedRefraction(air, apparent, hour) {
    return traced(air, hour, (a) => a.refraction(apparent));
}
/**
 * Sunrise/sunset from height over the sea-level horizon: dip (deg, with terrestrial refraction) and the refraction
 * (arcmin) of the ray grazing the sea surface, both from the same traced atmosphere. Dip 0 at or below sea level.
 */
export function tracedDipAndRefraction(air, hour) {
    const dip = traced(air, hour, (a) => a.dip());
    const refraction = traced(air, hour, (a) => a.refraction(-a.dip()));
    return { dip, refraction };
}
