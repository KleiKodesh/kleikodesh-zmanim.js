/** Mean Earth radius, m (IUGG). */
export declare const EARTH_RADIUS = 6371008.8;
/** Depth over which a surface temperature anomaly is tapered off into the free atmosphere, m. */
export declare const BOUNDARY_LAYER = 1500;
/**
 * Depth of the surface layer below the observer over which the anomaly fades in, m, for a local low-level profile
 * (one measured over the coastal plain): below it the air is the profile's own, i.e. the air over the plain/sea at
 * the distant horizon and the grazing ray's tangent point.
 */
export declare const SURFACE_LAYER = 200;
/** One level of a model atmosphere: geometric height m, temperature K, pressure hPa, water-vapour pressure hPa. */
export interface Level {
    z: number;
    t: number;
    p: number;
    e: number;
}
/** Interpolates [levels] at height [z]: T, e linear, ln p linear; continues below the lowest level with BELOW_LAPSE. */
export declare function levelAt(levels: readonly Level[], z: number): Level;
/**
 * The model atmosphere seen by an observer at [height] m: [levels] (a monthly mean profile) with a surface
 * temperature anomaly [deltaT] K (place climate minus profile) as a surface layer over the observer's own terrain:
 * the profile's air below height - [surfaceLayer], rising linearly to the full anomaly at the observer, tapered
 * linearly to 0 over BOUNDARY_LAYER above. Dip and terrestrial refraction follow the difference between the air at
 * eye level and the air at the horizon (A. T. Young, https://aty.sdsu.edu/explain/atmos_refr/dip.html), so the
 * distant low horizon keeps the profile's air instead of the hill's. [surfaceLayer] Infinity (a generic, non-local
 * profile, whose anomaly is a climate correction for the whole column): the full anomaly at and below the observer. pressure re-integrated hydrostatically from the profile's own
 * pressure at the observer.
 */
export declare class Atmosphere {
    readonly height: number;
    /** Layer boundaries as radii from the Earth's centre, and T, slope, p, e, slope at each boundary. */
    private readonly r;
    private readonly t;
    private readonly dt;
    private readonly p;
    private readonly e;
    private readonly de;
    private readonly k;
    readonly r0: number;
    readonly n0: number;
    private readonly memo;
    constructor(levels: readonly Level[], height: number, deltaT?: number, surfaceLayer?: number);
    /** p(top of layer i) / p(bottom of layer i). */
    private layerRatio;
    private layerPressure;
    private layer;
    /** n - 1 at radius [r]. */
    nm1(r: number): number;
    /** n - 1 and dn/dr at [r] inside layer [i]. */
    private index;
    /** Radius in layer [i] where n r = [target] (n r rises with r: no ducting assumed). */
    private radiusFor;
    /**
     * Bending (radians) of the ray with invariant [c] = n r sin z between radii [ra] < [rb], where it is not
     * descending past a tangent point in between: integral over z of -r n' / (n + r n').
     */
    private bend;
    /** Radius of the tangent point of a ray with invariant [c] (n r = c), below the observer. */
    private tangent;
    /** Astronomical refraction (arcminutes) for a ray leaving the observer at apparent altitude [apparent] degrees. */
    refraction(apparent: number): number;
    /**
     * Dip (degrees) of the sea-level horizon seen from the observer, with terrestrial refraction in this same
     * atmosphere: the ray grazing the sea surface, cos(dip) = n(R_E) R_E / (n_0 r_0). 0 at or below sea level.
     */
    dip(): number;
}
/** U.S. Standard Atmosphere 1976 (NOAA/NASA/USAF), 0-80 km, dry: its base levels and lapse rates (geopotential). */
export declare function usStandard1976(): Level[];
