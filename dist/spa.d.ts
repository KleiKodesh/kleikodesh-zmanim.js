/**
 * Long-term Delta T in seconds (eq 2), for a decimal year. Polynomial expressions of F. Espenak and J. Meeus,
 * "Five Millennium Canon of Solar Eclipses: -1999 to +3000", NASA Technical Publication NASA/TP-2006-214141 (2006),
 * section "Polynomial expressions for Delta T". Implemented here only for 1986..2150, the long-term parabola outside.
 */
export declare function polynomialDeltaT(decimalYear: number): number;
/**
 * Default deltaT = TT - UT in seconds, for a decimal year: the observed/predicted table above inside 2000..2028;
 * before it the polynomial; after it the polynomial plus the table's last offset from it, fading out over 100 years
 * so the value stays continuous. Callers needing better accuracy should pass an observed value instead.
 */
export declare function defaultDeltaT(decimalYear: number): number;
/** 3.1.1 Julian Day for a UTC instant (milliseconds since 1970-01-01T00:00Z). */
export declare function julianDayFromUtcMs(ms: number): number;
/**
 * 3.1.1 Julian Day for a civil date/time (proleptic Gregorian). `timeZone` in hours is
 * subtracted as the paper describes (local time -> UT). `second` may have a fraction.
 */
export declare function julianDay(year: number, month: number, day: number, hour?: number, minute?: number, second?: number, timeZone?: number): number;
/** Intermediate values of the geocentric part, filled in place (no allocation). */
export interface SpaGeocentric {
    jd: number;
    jde: number;
    jc: number;
    jce: number;
    jme: number;
    /** Earth heliocentric longitude, latitude (degrees), radius vector (AU). 3.2 */
    L: number;
    B: number;
    R: number;
    /** Geocentric longitude and latitude (degrees). 3.3 */
    theta: number;
    beta: number;
    /** Nutation in longitude and obliquity (degrees). 3.4 */
    dPsi: number;
    dEps: number;
    /** True obliquity (degrees). 3.5 */
    eps: number;
    /** Apparent sun longitude (degrees). 3.7 */
    lambda: number;
    /** Apparent sidereal time at Greenwich (degrees). 3.8 */
    nu: number;
    /** Geocentric right ascension and declination (degrees). 3.9, 3.10 */
    alpha: number;
    delta: number;
}
export declare function newGeocentric(): SpaGeocentric;
/** 3.1.2 - 3.10: geocentric sun position at Julian Day `jd` (UT) with deltaT seconds. */
export declare function computeGeocentric(out: SpaGeocentric, jd: number, deltaT: number): SpaGeocentric;
/** A.1 eq A2: sun mean longitude M (degrees) for a Julian Ephemeris Millennium. */
export declare function sunMeanLongitude(j: number): number;
/** A.1 Equation of time in minutes, from a filled geocentric state. */
export declare function equationOfTime(g: SpaGeocentric): number;
/** Sun radius used by the paper (A.2), degrees. */
export declare const SUN_RADIUS = 0.26667;
/** Sun elevation h'0 the paper uses for sunrise/sunset (A.2), degrees. */
export declare const SUNRISE_SUNSET_H0 = -0.8333;
export interface SpaInput {
    /** Julian Day (UT), e.g. from julianDay() or julianDayFromUtcMs(). */
    jd: number;
    /** TT - UT in seconds. Default: defaultDeltaT of the date. */
    deltaT?: number;
    latitude: number;
    /** Degrees, positive east (3.11). */
    longitude: number;
    /** Metres. Default 0. */
    elevation?: number;
    /** Annual average local pressure, mbar. Default 1010. */
    pressure?: number;
    /** Annual average local temperature, C. Default 10. */
    temperature?: number;
    /** Surface slope (eq 47), degrees. Default 0. */
    slope?: number;
    /** Surface azimuth rotation from south, positive west (eq 47), degrees. Default 0. */
    azimuthRotation?: number;
    /** Atmospheric refraction at sunrise/sunset, degrees; with SUN_RADIUS it sets where eq 42 stops applying. Default 0.5667. */
    atmosRefract?: number;
}
export interface SpaResult extends SpaGeocentric {
    /** Observer local hour angle (degrees, westward from south). 3.11 */
    H: number;
    /** Equatorial horizontal parallax (degrees). 3.12.1 */
    xi: number;
    /** Parallax in right ascension (degrees). 3.12.5 */
    dAlpha: number;
    /** Topocentric right ascension, declination, local hour angle (degrees). 3.12.6, 3.12.7, 3.13 */
    alphaPrime: number;
    deltaPrime: number;
    hPrime: number;
    /** Topocentric elevation without and with refraction (degrees). 3.14 */
    e0: number;
    e: number;
    /** Topocentric zenith angle (degrees). 3.14.4 */
    zenith: number;
    /** Astronomers azimuth (westward from south) and azimuth (eastward from north), degrees. 3.15 */
    azimuthAstro: number;
    azimuth: number;
    /** Surface incidence angle (degrees). 3.16 */
    incidence: number;
    /** Equation of time (minutes). A.1 */
    eot: number;
}
/** Full SPA (sections 3.1 - 3.16 and A.1) for one instant. */
export declare function spa(input: SpaInput): SpaResult;
/** Per-day precompute for A.2 (one UT date). Build once per date, reuse for any place and angle. */
export interface SpaDay {
    /** JD at 0 UT of the date. */
    jd0: number;
    deltaT: number;
    /** A.2.1 apparent sidereal time at Greenwich at 0 UT (degrees). */
    nu: number;
    /** A.2.2 geocentric alpha, delta at 0 TT of D-1, D0, D+1 (degrees). */
    alphaM: number;
    alpha0: number;
    alphaP: number;
    deltaM: number;
    delta0: number;
    deltaP: number;
    /** Earth radius vector at 0 TT of D0 (for the optional topocentric step). */
    R: number;
}
/** Build the per-day values of A.2.1 - A.2.2 for a UT civil date. */
export declare function spaDay(year: number, month: number, day: number, deltaT?: number): SpaDay;
/** Converts a zenith angle to the sun-centre elevation h'0 of A.2.4. */
export declare function zenithToH0(zenith: number, upperLimb?: boolean): number;
export interface SpaEventOptions {
    /** Repeat the A.2.8 - A.2.14 correction this many times (paper: 1). */
    iterations?: number;
    /** Use topocentric alpha', delta', H' (eqs 33-41) in the correction step. Paper: false. */
    topocentric?: boolean;
    /** Metres, only with `topocentric`. */
    elevation?: number;
}
/**
 * A.2 Sun transit (`kind` 0), rise (-1) or set (+1) as a UT fraction of the day of `d`
 * (the paper's value; it can fall slightly outside [0,1) after correction).
 * `h0` is the sun-centre elevation in degrees (SUNRISE_SUNSET_H0 for the paper's sunrise/sunset;
 * use zenithToH0 for any zenith angle or for the upper limb). NaN when the sun never reaches h0.
 */
export declare function spaEvent(d: SpaDay, latitude: number, longitude: number, h0: number, kind: -1 | 0 | 1, options?: SpaEventOptions): number;
/** Convenience: transit, sunrise, sunset (paper A.2, h'0 = -0.8333) as UT day fractions. */
export declare function spaSunTimes(d: SpaDay, latitude: number, longitude: number): {
    transit: number;
    sunrise: number;
    sunset: number;
};
