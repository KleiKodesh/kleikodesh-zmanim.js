// Solar Position Algorithm (SPA).
//
// Source (the only one): Ibrahim Reda and Afshin Andreas, "Solar Position Algorithm for Solar
// Radiation Applications", National Renewable Energy Laboratory, Technical Report
// NREL/TP-560-34302, revised January 2008. https://docs.nlr.gov/docs/fy08osti/34302.pdf
//
// Written from scratch solely from this paper on 2026-11-23 by Claude Code (AI assistant) for
// KleiKodesh; no other implementation was consulted. Equations and appendix tables (A4.2 Earth
// periodic terms, A4.3 nutation terms) were transcribed from the PDF. Comments give the paper's
// section and equation numbers. See PROVENANCE.md.
//
// Deliberate, documented departures from the paper's text:
// - Julian Day comes from the UTC epoch (proleptic Gregorian calendar), anchored to the paper's
//   Table A4.1 value JD 2451545.0 = 2000-01-01 12:00 UT. The paper's Julian-calendar branch
//   (dates before 1582-10-15) is not supported.
// - A.2.10: day-to-day differences of right ascension are wrapped into [-180, 180) instead of the
//   paper's "limit to 0..1" rule; the two agree whenever no 360/0 wrap happens, and this keeps the
//   right sign when one does.
// - The A.2 rise/set correction step (A14) may be repeated (`iterations`), and may use
//   topocentric positions (eqs 33-41); the defaults are exactly the paper's A.2 procedure.
//
// No allocation inside any loop: the periodic sums walk flat typed arrays.
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
/** 3.2.6: limit to [0, 360). */
function limit360(x) {
    const f = x % 360;
    return f < 0 ? f + 360 : f;
}
/** 3.2.6 with 360 replaced by 1 (A.2.7). */
function limit1(x) {
    const f = x % 1;
    return f < 0 ? f + 1 : f;
}
/** A.2.11: limit to [-180, 180]. */
function limit180(x) {
    let h = x % 360;
    if (h <= -180)
        h += 360;
    else if (h >= 180)
        h -= 360;
    return h;
}
// ---------------------------------------------------------------- delta T default
/**
 * Default deltaT = TT - UT in seconds (eq 2), for a decimal year.
 * Polynomial expressions of F. Espenak and J. Meeus, "Five Millennium Canon of Solar Eclipses:
 * -1999 to +3000", NASA Technical Publication NASA/TP-2006-214141 (2006), section "Polynomial
 * expressions for Delta T". Implemented here only for 1986..2150, the long-term parabola outside.
 * Callers needing better accuracy should pass an observed/predicted value instead.
 */
export function defaultDeltaT(decimalYear) {
    const y = decimalYear;
    if (y >= 1986 && y < 2005) {
        const t = y - 2000;
        return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
    }
    if (y >= 2005 && y < 2050) {
        const t = y - 2000;
        return 62.92 + 0.32217 * t + 0.005589 * t * t;
    }
    const u = (y - 1820) / 100;
    if (y >= 2050 && y < 2150)
        return -20 + 32 * u * u - 0.5628 * (2150 - y);
    return -20 + 32 * u * u;
}
// ---------------------------------------------------------------- 3.1 Julian day
/** JD of 1970-01-01 00:00 UT, derived from Table A4.1 (JD 2451545.0 at 2000-01-01 12:00, 10957.5 days later). */
const JD_UNIX_EPOCH = 2451545.0 - 10957.5;
/** 3.1.1 Julian Day for a UTC instant (milliseconds since 1970-01-01T00:00Z). */
export function julianDayFromUtcMs(ms) {
    return ms / 86400000 + JD_UNIX_EPOCH;
}
/**
 * 3.1.1 Julian Day for a civil date/time (proleptic Gregorian). `timeZone` in hours is
 * subtracted as the paper describes (local time -> UT). `second` may have a fraction.
 */
export function julianDay(year, month, day, hour = 0, minute = 0, second = 0, timeZone = 0) {
    const d = new Date(0);
    d.setUTCFullYear(year, month - 1, day);
    const midnight = d.getTime(); // time part is 00:00:00.000
    return julianDayFromUtcMs(midnight) + (hour + minute / 60 + second / 3600 - timeZone) / 24;
}
export function newGeocentric() {
    return { jd: 0, jde: 0, jc: 0, jce: 0, jme: 0, L: 0, B: 0, R: 0, theta: 0, beta: 0, dPsi: 0, dEps: 0, eps: 0, lambda: 0, nu: 0, alpha: 0, delta: 0 };
}
/** Eqs 9-10: sum of A*cos(B + C*JME) over one table. */
function periodicSum(t, jme) {
    let s = 0;
    for (let i = 0; i < t.length; i += 3)
        s += t[i] * Math.cos(t[i + 1] + t[i + 2] * jme);
    return s;
}
/** Eq 11 (and its B, R forms): (X0 + X1*JME + ... ) / 1e8, in radians (or AU for R). */
function earthValue(terms, jme) {
    let s = 0;
    let p = 1;
    for (let k = 0; k < terms.length; k++) {
        s += periodicSum(terms[k], jme) * p;
        p *= jme;
    }
    return s / 1e8;
}
/** 3.1.2 - 3.10: geocentric sun position at Julian Day `jd` (UT) with deltaT seconds. */
export function computeGeocentric(out, jd, deltaT) {
    // 3.1.2 - 3.1.4
    const jde = jd + deltaT / 86400; // eq 5
    const jc = (jd - 2451545) / 36525; // eq 6
    const jce = (jde - 2451545) / 36525; // eq 7
    const jme = jce / 10; // eq 8
    // 3.2 Earth heliocentric L, B, R
    const L = limit360(earthValue(L_TERMS, jme) * R2D); // eqs 9-12, 3.2.6
    const B = earthValue(B_TERMS, jme) * R2D; // 3.2.7
    const R = earthValue(R_TERMS, jme); // 3.2.8
    // 3.3 geocentric longitude and latitude
    const theta = limit360(L + 180); // eq 13, 3.3.2
    const beta = -B; // eq 14
    // 3.4 nutation
    const jce2 = jce * jce;
    const jce3 = jce2 * jce;
    const x0 = 297.85036 + 445267.111480 * jce - 0.0019142 * jce2 + jce3 / 189474; // eq 15
    const x1 = 357.52772 + 35999.050340 * jce - 0.0001603 * jce2 - jce3 / 300000; // eq 16
    const x2 = 134.96298 + 477198.867398 * jce + 0.0086972 * jce2 + jce3 / 56250; // eq 17
    const x3 = 93.27191 + 483202.017538 * jce - 0.0036825 * jce2 + jce3 / 327270; // eq 18
    const x4 = 125.04452 - 1934.136261 * jce + 0.0020708 * jce2 + jce3 / 450000; // eq 19
    let sumPsi = 0;
    let sumEps = 0;
    for (let i = 0, y = 0, c = 0; i < 63; i++, y += 5, c += 4) {
        const arg = (x0 * NUT_Y[y] + x1 * NUT_Y[y + 1] + x2 * NUT_Y[y + 2] + x3 * NUT_Y[y + 3] + x4 * NUT_Y[y + 4]) * D2R;
        sumPsi += (NUT_ABCD[c] + NUT_ABCD[c + 1] * jce) * Math.sin(arg); // eq 20
        sumEps += (NUT_ABCD[c + 2] + NUT_ABCD[c + 3] * jce) * Math.cos(arg); // eq 21
    }
    const dPsi = sumPsi / 36000000; // eq 22
    const dEps = sumEps / 36000000; // eq 23
    // 3.5 true obliquity
    const u = jme / 10;
    const eps0 = 84381.448 + u * (-4680.93 + u * (-1.55 + u * (1999.25 + u * (-51.38 + u * (-249.67 +
        u * (-39.05 + u * (7.12 + u * (27.87 + u * (5.79 + u * 2.45))))))))); // eq 24, arc seconds
    const eps = eps0 / 3600 + dEps; // eq 25
    // 3.6 aberration, 3.7 apparent longitude
    const dTau = -20.4898 / (3600 * R); // eq 26
    const lambda = theta + dPsi + dTau; // eq 27
    // 3.8 apparent sidereal time at Greenwich
    const nu0 = limit360(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * jc * jc - jc * jc * jc / 38710000); // eq 28, 3.8.2
    const epsR = eps * D2R;
    const nu = nu0 + dPsi * Math.cos(epsR); // eq 29
    // 3.9 right ascension, 3.10 declination
    const lamR = lambda * D2R;
    const betaR = beta * D2R;
    const alpha = limit360(Math.atan2(Math.sin(lamR) * Math.cos(epsR) - Math.tan(betaR) * Math.sin(epsR), Math.cos(lamR)) * R2D); // eq 30, 3.9.2
    const delta = Math.asin(Math.sin(betaR) * Math.cos(epsR) + Math.cos(betaR) * Math.sin(epsR) * Math.sin(lamR)) * R2D; // eq 31
    out.jd = jd;
    out.jde = jde;
    out.jc = jc;
    out.jce = jce;
    out.jme = jme;
    out.L = L;
    out.B = B;
    out.R = R;
    out.theta = theta;
    out.beta = beta;
    out.dPsi = dPsi;
    out.dEps = dEps;
    out.eps = eps;
    out.lambda = lambda;
    out.nu = nu;
    out.alpha = alpha;
    out.delta = delta;
    return out;
}
// ---------------------------------------------------------------- A.1 equation of time
/** A.1 eq A2: sun mean longitude M (degrees) for a Julian Ephemeris Millennium. */
export function sunMeanLongitude(j) {
    return limit360(280.4664567 + 360007.6982779 * j + 0.03032028 * j * j + j ** 3 / 49931 - j ** 4 / 15300 - j ** 5 / 2000000);
}
/** A.1 Equation of time in minutes, from a filled geocentric state. */
export function equationOfTime(g) {
    const m = sunMeanLongitude(g.jme);
    let e = 4 * (m - 0.0057183 - g.alpha + g.dPsi * Math.cos(g.eps * D2R)); // eq A1, minutes
    if (e > 20)
        e -= 1440;
    else if (e < -20)
        e += 1440;
    return e;
}
// ---------------------------------------------------------------- 3.11 - 3.16 topocentric
/** Sun radius used by the paper (A.2), degrees. */
export const SUN_RADIUS = 0.26667;
/** Sun elevation h'0 the paper uses for sunrise/sunset (A.2), degrees. */
export const SUNRISE_SUNSET_H0 = -0.8333;
/** Decimal year of a Julian Day (for defaultDeltaT). */
function yearOfJd(jd) {
    return 2000 + (jd - 2451545) / 365.25;
}
/** Observer terms of eqs 34-36 (x, y). */
function observerXY(latitude, elevation, outXY) {
    const phi = latitude * D2R;
    const u = Math.atan(0.99664719 * Math.tan(phi)); // eq 34
    outXY[0] = Math.cos(u) + (elevation / 6378140) * Math.cos(phi); // eq 35
    outXY[1] = 0.99664719 * Math.sin(u) + (elevation / 6378140) * Math.sin(phi); // eq 36
}
const scratchXY = new Float64Array(2);
/** Eq 42: refraction correction (degrees) at true topocentric elevation e0. */
function refraction(e0, pressure, temperature) {
    return (pressure / 1010) * (283 / (273 + temperature)) * 1.02 / (60 * Math.tan((e0 + 10.3 / (e0 + 5.11)) * D2R));
}
/** Full SPA (sections 3.1 - 3.16 and A.1) for one instant. */
export function spa(input) {
    const deltaT = input.deltaT ?? defaultDeltaT(yearOfJd(input.jd));
    const elevation = input.elevation ?? 0;
    const pressure = input.pressure ?? 1010;
    const temperature = input.temperature ?? 10;
    const slope = input.slope ?? 0;
    const azRot = input.azimuthRotation ?? 0;
    const atmosRefract = input.atmosRefract ?? 0.5667;
    const phi = input.latitude * D2R;
    const r = newGeocentric();
    computeGeocentric(r, input.jd, deltaT);
    const H = limit360(r.nu + input.longitude - r.alpha); // eq 32, 3.11
    const xi = 8.794 / (3600 * r.R); // eq 33
    observerXY(input.latitude, elevation, scratchXY);
    const x = scratchXY[0];
    const y = scratchXY[1];
    const xiR = xi * D2R;
    const hR = H * D2R;
    const dR = r.delta * D2R;
    const den = Math.cos(dR) - x * Math.sin(xiR) * Math.cos(hR);
    const dAlphaR = Math.atan2(-x * Math.sin(xiR) * Math.sin(hR), den); // eq 37
    const dAlpha = dAlphaR * R2D;
    const alphaPrime = r.alpha + dAlpha; // eq 38
    const deltaPrimeR = Math.atan2((Math.sin(dR) - y * Math.sin(xiR)) * Math.cos(dAlphaR), den); // eq 39
    const hPrime = H - dAlpha; // eq 40
    const hpR = hPrime * D2R;
    const e0 = Math.asin(Math.sin(phi) * Math.sin(deltaPrimeR) + Math.cos(phi) * Math.cos(deltaPrimeR) * Math.cos(hpR)) * R2D; // eq 41
    // eq 42; "0 when the sun is below the horizon" - taken as the upper limb below the refracted horizon
    const de = e0 >= -1 * (SUN_RADIUS + atmosRefract) ? refraction(e0, pressure, temperature) : 0;
    const e = e0 + de; // eq 43
    const zenith = 90 - e; // eq 44
    const gammaAstro = limit360(Math.atan2(Math.sin(hpR), Math.cos(hpR) * Math.sin(phi) - Math.tan(deltaPrimeR) * Math.cos(phi)) * R2D); // eq 45
    const azimuth = limit360(gammaAstro + 180); // eq 46
    const zR = zenith * D2R;
    const slopeR = slope * D2R;
    const incidence = Math.acos(Math.cos(zR) * Math.cos(slopeR) + Math.sin(slopeR) * Math.sin(zR) * Math.cos((gammaAstro - azRot) * D2R)) * R2D; // eq 47
    r.H = H;
    r.xi = xi;
    r.dAlpha = dAlpha;
    r.alphaPrime = alphaPrime;
    r.deltaPrime = deltaPrimeR * R2D;
    r.hPrime = hPrime;
    r.e0 = e0;
    r.e = e;
    r.zenith = zenith;
    r.azimuthAstro = gammaAstro;
    r.azimuth = azimuth;
    r.incidence = incidence;
    r.eot = equationOfTime(r);
    return r;
}
/** Build the per-day values of A.2.1 - A.2.2 for a UT civil date. */
export function spaDay(year, month, day, deltaT) {
    const jd0 = julianDay(year, month, day);
    const dt = deltaT ?? defaultDeltaT(yearOfJd(jd0));
    const g = newGeocentric();
    const nu = computeGeocentric(g, jd0, dt).nu; // A.2.1 (0 UT)
    computeGeocentric(g, jd0 - 1, 0); // A.2.2 (0 TT: JDE = JD)
    const alphaM = g.alpha, deltaM = g.delta;
    computeGeocentric(g, jd0 + 1, 0);
    const alphaP = g.alpha, deltaP = g.delta;
    computeGeocentric(g, jd0, 0);
    return { jd0, deltaT: dt, nu, alphaM, alpha0: g.alpha, alphaP, deltaM, delta0: g.delta, deltaP, R: g.R };
}
/** Converts a zenith angle to the sun-centre elevation h'0 of A.2.4. */
export function zenithToH0(zenith, upperLimb = false) {
    return 90 - zenith - (upperLimb ? SUN_RADIUS : 0);
}
/** A.2.10 interpolation of alpha (wrap-safe) or delta at day fraction n. */
function interp(m, z, p, n, wrap) {
    let a = z - m;
    let b = p - z;
    if (wrap) {
        a = limit180(a);
        b = limit180(b);
    }
    return z + n * (a + b + (b - a) * n) / 2; // eq A9 / A10
}
/**
 * A.2 Sun transit (`kind` 0), rise (-1) or set (+1) as a UT fraction of the day of `d`
 * (the paper's value; it can fall slightly outside [0,1) after correction).
 * `h0` is the sun-centre elevation in degrees (SUNRISE_SUNSET_H0 for the paper's sunrise/sunset;
 * use zenithToH0 for any zenith angle or for the upper limb). NaN when the sun never reaches h0.
 */
export function spaEvent(d, latitude, longitude, h0, kind, options) {
    const phi = latitude * D2R;
    const m0 = (d.alpha0 - longitude - d.nu) / 360; // eq A3
    let m;
    if (kind === 0) {
        m = limit1(m0); // A.2.7
    }
    else {
        const arg = (Math.sin(h0 * D2R) - Math.sin(phi) * Math.sin(d.delta0 * D2R)) / (Math.cos(phi) * Math.cos(d.delta0 * D2R)); // eq A4
        if (arg < -1 || arg > 1)
            return NaN;
        const hh0 = Math.acos(arg) * R2D; // 0..180
        m = limit1(m0 + kind * hh0 / 360); // eqs A5, A6, A.2.7
    }
    const iterations = options?.iterations ?? 1;
    const topo = options?.topocentric === true;
    let x = 0, y = 0, xiR = 0;
    if (topo) {
        observerXY(latitude, options?.elevation ?? 0, scratchXY);
        x = scratchXY[0];
        y = scratchXY[1];
        xiR = 8.794 / (3600 * d.R) * D2R; // eq 33
    }
    for (let it = 0; it < iterations; it++) {
        const nuI = d.nu + 360.985647 * m; // eq A7
        const n = m + d.deltaT / 86400; // eq A8
        const alphaI = interp(d.alphaM, d.alpha0, d.alphaP, n, true); // eq A9
        let deltaI = interp(d.deltaM, d.delta0, d.deltaP, n, false); // eq A10
        let hI = limit180(nuI + longitude - alphaI); // eq A11
        if (topo) {
            const hR = hI * D2R;
            const dR = deltaI * D2R;
            const den = Math.cos(dR) - x * Math.sin(xiR) * Math.cos(hR);
            const dAlphaR = Math.atan2(-x * Math.sin(xiR) * Math.sin(hR), den); // eq 37
            deltaI = Math.atan2((Math.sin(dR) - y * Math.sin(xiR)) * Math.cos(dAlphaR), den) * R2D; // eq 39
            hI = hI - dAlphaR * R2D; // eq 40
        }
        if (kind === 0) {
            m = m - hI / 360; // eq A13
            continue;
        }
        const dR = deltaI * D2R;
        const hiR = hI * D2R;
        const h = Math.asin(Math.sin(phi) * Math.sin(dR) + Math.cos(phi) * Math.cos(dR) * Math.cos(hiR)) * R2D; // eq A12
        m = m + (h - h0) / (360 * Math.cos(dR) * Math.cos(phi) * Math.sin(hiR)); // eq A14 (A.2.15 for sunset)
    }
    return m;
}
/** Convenience: transit, sunrise, sunset (paper A.2, h'0 = -0.8333) as UT day fractions. */
export function spaSunTimes(d, latitude, longitude) {
    return {
        transit: spaEvent(d, latitude, longitude, 0, 0),
        sunrise: spaEvent(d, latitude, longitude, SUNRISE_SUNSET_H0, -1),
        sunset: spaEvent(d, latitude, longitude, SUNRISE_SUNSET_H0, 1),
    };
}
// ---------------------------------------------------------------- Appendix A.4 tables
// Table A4.2, term L0 (64 rows: A, B, C)
const L0 = new Float64Array([
    175347046, 0, 0,
    3341656, 4.6692568, 6283.07585,
    34894, 4.6261, 12566.1517,
    3497, 2.7441, 5753.3849,
    3418, 2.8289, 3.5231,
    3136, 3.6277, 77713.7715,
    2676, 4.4181, 7860.4194,
    2343, 6.1352, 3930.2097,
    1324, 0.7425, 11506.7698,
    1273, 2.0371, 529.691,
    1199, 1.1096, 1577.3435,
    990, 5.233, 5884.927,
    902, 2.045, 26.298,
    857, 3.508, 398.149,
    780, 1.179, 5223.694,
    753, 2.533, 5507.553,
    505, 4.583, 18849.228,
    492, 4.205, 775.523,
    357, 2.92, 0.067,
    317, 5.849, 11790.629,
    284, 1.899, 796.298,
    271, 0.315, 10977.079,
    243, 0.345, 5486.778,
    206, 4.806, 2544.314,
    205, 1.869, 5573.143,
    202, 2.458, 6069.777,
    156, 0.833, 213.299,
    132, 3.411, 2942.463,
    126, 1.083, 20.775,
    115, 0.645, 0.98,
    103, 0.636, 4694.003,
    102, 0.976, 15720.839,
    102, 4.267, 7.114,
    99, 6.21, 2146.17,
    98, 0.68, 155.42,
    86, 5.98, 161000.69,
    85, 1.3, 6275.96,
    85, 3.67, 71430.7,
    80, 1.81, 17260.15,
    79, 3.04, 12036.46,
    75, 1.76, 5088.63,
    74, 3.5, 3154.69,
    74, 4.68, 801.82,
    70, 0.83, 9437.76,
    62, 3.98, 8827.39,
    61, 1.82, 7084.9,
    57, 2.78, 6286.6,
    56, 4.39, 14143.5,
    56, 3.47, 6279.55,
    52, 0.19, 12139.55,
    52, 1.33, 1748.02,
    51, 0.28, 5856.48,
    49, 0.49, 1194.45,
    41, 5.37, 8429.24,
    41, 2.4, 19651.05,
    39, 6.17, 10447.39,
    37, 6.04, 10213.29,
    37, 2.57, 1059.38,
    36, 1.71, 2352.87,
    36, 1.78, 6812.77,
    33, 0.59, 17789.85,
    30, 0.44, 83996.85,
    30, 2.74, 1349.87,
    25, 3.16, 4690.48,
]);
// Table A4.2, term L1 (34 rows: A, B, C)
const L1 = new Float64Array([
    628331966747, 0, 0,
    206059, 2.678235, 6283.07585,
    4303, 2.6351, 12566.1517,
    425, 1.59, 3.523,
    119, 5.796, 26.298,
    109, 2.966, 1577.344,
    93, 2.59, 18849.23,
    72, 1.14, 529.69,
    68, 1.87, 398.15,
    67, 4.41, 5507.55,
    59, 2.89, 5223.69,
    56, 2.17, 155.42,
    45, 0.4, 796.3,
    36, 0.47, 775.52,
    29, 2.65, 7.11,
    21, 5.34, 0.98,
    19, 1.85, 5486.78,
    19, 4.97, 213.3,
    17, 2.99, 6275.96,
    16, 0.03, 2544.31,
    16, 1.43, 2146.17,
    15, 1.21, 10977.08,
    12, 2.83, 1748.02,
    12, 3.26, 5088.63,
    12, 5.27, 1194.45,
    12, 2.08, 4694,
    11, 0.77, 553.57,
    10, 1.3, 6286.6,
    10, 4.24, 1349.87,
    9, 2.7, 242.73,
    9, 5.64, 951.72,
    8, 5.3, 2352.87,
    6, 2.65, 9437.76,
    6, 4.67, 4690.48,
]);
// Table A4.2, term L2 (20 rows: A, B, C)
const L2 = new Float64Array([
    52919, 0, 0,
    8720, 1.0721, 6283.0758,
    309, 0.867, 12566.152,
    27, 0.05, 3.52,
    16, 5.19, 26.3,
    16, 3.68, 155.42,
    10, 0.76, 18849.23,
    9, 2.06, 77713.77,
    7, 0.83, 775.52,
    5, 4.66, 1577.34,
    4, 1.03, 7.11,
    4, 3.44, 5573.14,
    3, 5.14, 796.3,
    3, 6.05, 5507.55,
    3, 1.19, 242.73,
    3, 6.12, 529.69,
    3, 0.31, 398.15,
    3, 2.28, 553.57,
    2, 4.38, 5223.69,
    2, 3.75, 0.98,
]);
// Table A4.2, term L3 (7 rows: A, B, C)
const L3 = new Float64Array([
    289, 5.844, 6283.076,
    35, 0, 0,
    17, 5.49, 12566.15,
    3, 5.2, 155.42,
    1, 4.72, 3.52,
    1, 5.3, 18849.23,
    1, 5.97, 242.73,
]);
// Table A4.2, term L4 (3 rows: A, B, C)
const L4 = new Float64Array([
    114, 3.142, 0,
    8, 4.13, 6283.08,
    1, 3.84, 12566.15,
]);
// Table A4.2, term L5 (1 rows: A, B, C)
const L5 = new Float64Array([
    1, 3.14, 0,
]);
// Table A4.2, term B0 (5 rows: A, B, C)
const B0 = new Float64Array([
    280, 3.199, 84334.662,
    102, 5.422, 5507.553,
    80, 3.88, 5223.69,
    44, 3.7, 2352.87,
    32, 4, 1577.34,
]);
// Table A4.2, term B1 (2 rows: A, B, C)
const B1 = new Float64Array([
    9, 3.9, 5507.55,
    6, 1.73, 5223.69,
]);
// Table A4.2, term R0 (40 rows: A, B, C)
const R0 = new Float64Array([
    100013989, 0, 0,
    1670700, 3.0984635, 6283.07585,
    13956, 3.05525, 12566.1517,
    3084, 5.1985, 77713.7715,
    1628, 1.1739, 5753.3849,
    1576, 2.8469, 7860.4194,
    925, 5.453, 11506.77,
    542, 4.564, 3930.21,
    472, 3.661, 5884.927,
    346, 0.964, 5507.553,
    329, 5.9, 5223.694,
    307, 0.299, 5573.143,
    243, 4.273, 11790.629,
    212, 5.847, 1577.344,
    186, 5.022, 10977.079,
    175, 3.012, 18849.228,
    110, 5.055, 5486.778,
    98, 0.89, 6069.78,
    86, 5.69, 15720.84,
    86, 1.27, 161000.69,
    65, 0.27, 17260.15,
    63, 0.92, 529.69,
    57, 2.01, 83996.85,
    56, 5.24, 71430.7,
    49, 3.25, 2544.31,
    47, 2.58, 775.52,
    45, 5.54, 9437.76,
    43, 6.01, 6275.96,
    39, 5.36, 4694,
    38, 2.39, 8827.39,
    37, 0.83, 19651.05,
    37, 4.9, 12139.55,
    36, 1.67, 12036.46,
    35, 1.84, 2942.46,
    33, 0.24, 7084.9,
    32, 0.18, 5088.63,
    32, 1.78, 398.15,
    28, 1.21, 6286.6,
    28, 1.9, 6279.55,
    26, 4.59, 10447.39,
]);
// Table A4.2, term R1 (10 rows: A, B, C)
const R1 = new Float64Array([
    103019, 1.10749, 6283.07585,
    1721, 1.0644, 12566.1517,
    702, 3.142, 0,
    32, 1.02, 18849.23,
    31, 2.84, 5507.55,
    25, 1.32, 5223.69,
    18, 1.42, 1577.34,
    10, 5.91, 10977.08,
    9, 1.42, 6275.96,
    9, 0.27, 5486.78,
]);
// Table A4.2, term R2 (6 rows: A, B, C)
const R2 = new Float64Array([
    4359, 5.7846, 6283.0758,
    124, 5.579, 12566.152,
    12, 3.14, 0,
    9, 3.63, 77713.77,
    6, 1.87, 5573.14,
    3, 5.47, 18849.23,
]);
// Table A4.2, term R3 (2 rows: A, B, C)
const R3 = new Float64Array([
    145, 4.273, 6283.076,
    7, 3.92, 12566.15,
]);
// Table A4.2, term R4 (1 rows: A, B, C)
const R4 = new Float64Array([
    4, 2.56, 6283.08,
]);
const L_TERMS = [L0, L1, L2, L3, L4, L5];
const B_TERMS = [B0, B1];
const R_TERMS = [R0, R1, R2, R3, R4];
// Table A4.3 (63 rows): Y0..Y4
const NUT_Y = new Int8Array([
    0, 0, 0, 0, 1,
    -2, 0, 0, 2, 2,
    0, 0, 0, 2, 2,
    0, 0, 0, 0, 2,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    -2, 1, 0, 2, 2,
    0, 0, 0, 2, 1,
    0, 0, 1, 2, 2,
    -2, -1, 0, 2, 2,
    -2, 0, 1, 0, 0,
    -2, 0, 0, 2, 1,
    0, 0, -1, 2, 2,
    2, 0, 0, 0, 0,
    0, 0, 1, 0, 1,
    2, 0, -1, 2, 2,
    0, 0, -1, 0, 1,
    0, 0, 1, 2, 1,
    -2, 0, 2, 0, 0,
    0, 0, -2, 2, 1,
    2, 0, 0, 2, 2,
    0, 0, 2, 2, 2,
    0, 0, 2, 0, 0,
    -2, 0, 1, 2, 2,
    0, 0, 0, 2, 0,
    -2, 0, 0, 2, 0,
    0, 0, -1, 2, 1,
    0, 2, 0, 0, 0,
    2, 0, -1, 0, 1,
    -2, 2, 0, 2, 2,
    0, 1, 0, 0, 1,
    -2, 0, 1, 0, 1,
    0, -1, 0, 0, 1,
    0, 0, 2, -2, 0,
    2, 0, -1, 2, 1,
    2, 0, 1, 2, 2,
    0, 1, 0, 2, 2,
    -2, 1, 1, 0, 0,
    0, -1, 0, 2, 2,
    2, 0, 0, 2, 1,
    2, 0, 1, 0, 0,
    -2, 0, 2, 2, 2,
    -2, 0, 1, 2, 1,
    2, 0, -2, 0, 1,
    2, 0, 0, 0, 1,
    0, -1, 1, 0, 0,
    -2, -1, 0, 2, 1,
    -2, 0, 0, 0, 1,
    0, 0, 2, 2, 1,
    -2, 0, 2, 0, 1,
    -2, 1, 0, 2, 1,
    0, 0, 1, -2, 0,
    -1, 0, 1, 0, 0,
    -2, 1, 0, 0, 0,
    1, 0, 0, 0, 0,
    0, 0, 1, 2, 0,
    0, 0, -2, 2, 2,
    -1, -1, 1, 0, 0,
    0, 1, 1, 0, 0,
    0, -1, 1, 2, 2,
    2, -1, -1, 2, 2,
    0, 0, 3, 2, 2,
    2, -1, 0, 2, 2,
]);
// Table A4.3: a, b (for delta psi), c, d (for delta epsilon); blank cells are 0
const NUT_ABCD = new Float64Array([
    -171996, -174.2, 92025, 8.9,
    -13187, -1.6, 5736, -3.1,
    -2274, -0.2, 977, -0.5,
    2062, 0.2, -895, 0.5,
    1426, -3.4, 54, -0.1,
    712, 0.1, -7, 0,
    -517, 1.2, 224, -0.6,
    -386, -0.4, 200, 0,
    -301, 0, 129, -0.1,
    217, -0.5, -95, 0.3,
    -158, 0, 0, 0,
    129, 0.1, -70, 0,
    123, 0, -53, 0,
    63, 0, 0, 0,
    63, 0.1, -33, 0,
    -59, 0, 26, 0,
    -58, -0.1, 32, 0,
    -51, 0, 27, 0,
    48, 0, 0, 0,
    46, 0, -24, 0,
    -38, 0, 16, 0,
    -31, 0, 13, 0,
    29, 0, 0, 0,
    29, 0, -12, 0,
    26, 0, 0, 0,
    -22, 0, 0, 0,
    21, 0, -10, 0,
    17, -0.1, 0, 0,
    16, 0, -8, 0,
    -16, 0.1, 7, 0,
    -15, 0, 9, 0,
    -13, 0, 7, 0,
    -12, 0, 6, 0,
    11, 0, 0, 0,
    -10, 0, 5, 0,
    -8, 0, 3, 0,
    7, 0, -3, 0,
    -7, 0, 0, 0,
    -7, 0, 3, 0,
    -7, 0, 3, 0,
    6, 0, 0, 0,
    6, 0, -3, 0,
    6, 0, -3, 0,
    -6, 0, 3, 0,
    -6, 0, 3, 0,
    5, 0, 0, 0,
    -5, 0, 3, 0,
    -5, 0, 3, 0,
    -5, 0, 3, 0,
    4, 0, 0, 0,
    4, 0, 0, 0,
    4, 0, 0, 0,
    -4, 0, 0, 0,
    -4, 0, 0, 0,
    -4, 0, 0, 0,
    3, 0, 0, 0,
    -3, 0, 0, 0,
    -3, 0, 0, 0,
    -3, 0, 0, 0,
    -3, 0, 0, 0,
    -3, 0, 0, 0,
    -3, 0, 0, 0,
    -3, 0, 0, 0,
]);
