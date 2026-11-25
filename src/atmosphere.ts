// Ray-traced astronomical refraction through a spherically stratified model atmosphere, for every horizon event
// (sunrise/sunset at the place's own height, from height over the sea-level horizon, over the terrain horizon).
//
// Method (independent implementation from the published literature):
// - The refraction integral in a spherically stratified atmosphere, integrated over the ray's zenith angle z,
//     R = integral of  -r n'(r) / (n + r n'(r))  dz,     with the invariant  n r sin z = const  (Bouguer),
//   C. Y. Hohenkerk & A. T. Sinclair, "The computation of angular atmospheric refraction at large zenith angles",
//   HM Nautical Almanac Office, NAO Technical Note 63 (1985); as given in P. K. Seidelmann (ed.), Explanatory
//   Supplement to the Astronomical Almanac (1992), section 3.28. Integrating in z (not in height) keeps the
//   integrand finite at the horizon; L. H. Auer & E. M. Standish, "Astronomical refraction: computational method
//   for all zenith angles", Astronomical Journal 119 (2000) 2472-2474, extend it below the horizon: a ray with a
//   negative apparent altitude first descends to its tangent point (n r = const with z = 90 deg) and then rises, so
//   R = B(tangent -> top of the atmosphere) + B(tangent -> observer), each branch integrated in z from 90 deg.
//   The integral is split at the model's layer boundaries (where n' jumps) and each piece is done by 8-point
//   Gauss-Legendre quadrature; r(z) on a piece comes from Newton's method on n(r) r = C / sin z.
// - Sunrise/sunset seen from an elevation, the dip of the horizon with terrestrial refraction in the same
//   atmosphere (the ray to the sea-level horizon is tangent to it: cos(dip) = n(R_E) R_E / (n_0 r_0)), and negative
//   apparent altitudes: J. Keller & A. Hall, "Sunrise and sunset from elevations: refraction through a layered
//   atmosphere", Computers & Geosciences 161 (2022) 105044 (open access).
// - Refractive index of moist air in the optical band (Hohenkerk & Sinclair; the formula of the IAU SOFA routine
//   iauRefco, after Barrell & Sears 1939):
//     n - 1 = (gamma P - 11.2684e-6 e) / T,  gamma = (287.6155 + 1.62887 / w^2 + 0.01360 / w^4) 273.15e-6 / 1013.25
//   P total pressure and e water-vapour pressure in hPa, T in K, wavelength w = 0.574 micrometres (visual).
// - Layers: temperature and vapour pressure linear in height between the model's levels, pressure from the
//   hydrostatic equation (dry-air gas constant, gravity falling as (R_E / r)^2), anchored at the observer. Above the
//   last level (80 km) n = 1.

const DEG = Math.PI / 180
/** Mean Earth radius, m (IUGG). */
export const EARTH_RADIUS = 6_371_008.8
const RD = 287.05287
const G0 = 9.80665
const WAVELENGTH_UM = 0.574
const GAMMA = (287.6155 + (1.62887 + 0.0136 / WAVELENGTH_UM ** 2) / WAVELENGTH_UM ** 2) * 273.15e-6 / 1013.25
const VAPOUR = 11.2684e-6
/** Top of the model atmosphere, m (Hohenkerk & Sinclair integrate to 80 km). */
const TOP = 80_000
/** Temperature gradient used to continue a profile below its lowest level, K/m (standard troposphere). */
const BELOW_LAPSE = -0.0065
/** Depth over which a surface temperature anomaly is tapered off into the free atmosphere, m. */
export const BOUNDARY_LAYER = 1500
/**
 * Depth of the surface layer below the observer over which the anomaly fades in, m, for a local low-level profile
 * (one measured over the coastal plain): below it the air is the profile's own, i.e. the air over the plain/sea at
 * the distant horizon and the grazing ray's tangent point.
 */
export const SURFACE_LAYER = 200

/** One level of a model atmosphere: geometric height m, temperature K, pressure hPa, water-vapour pressure hPa. */
export interface Level { z: number, t: number, p: number, e: number }

// 8-point Gauss-Legendre nodes/weights on [-1, 1].
const GL_X = [-0.9602898564975363, -0.7966664774136267, -0.525532409916329, -0.1834346424956498, 0.1834346424956498, 0.525532409916329, 0.7966664774136267, 0.9602898564975363]
const GL_W = [0.1012285362903763, 0.2223810344533745, 0.3137066458778873, 0.362683783378362, 0.362683783378362, 0.3137066458778873, 0.2223810344533745, 0.1012285362903763]

/** Interpolates [levels] at height [z]: T, e linear, ln p linear; continues below the lowest level with BELOW_LAPSE. */
export function levelAt(levels: readonly Level[], z: number): Level {
  const a0 = levels[0]!
  if (z <= a0.z) {
    const t = a0.t + BELOW_LAPSE * (z - a0.z)
    return { z, t, p: a0.p * Math.pow(t / a0.t, -G0 / (RD * BELOW_LAPSE)), e: a0.e }
  }
  for (let i = 1; i < levels.length; i++) {
    const b = levels[i]!
    if (z <= b.z) {
      const a = levels[i - 1]!
      const f = (z - a.z) / (b.z - a.z)
      return { z, t: a.t + (b.t - a.t) * f, p: Math.exp(Math.log(a.p) + (Math.log(b.p) - Math.log(a.p)) * f), e: a.e + (b.e - a.e) * f }
    }
  }
  const l = levels[levels.length - 1]!
  return { z, t: l.t, p: l.p * Math.exp(-G0 * (z - l.z) / (RD * l.t)), e: 0 }
}

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
export class Atmosphere {
  /** Layer boundaries as radii from the Earth's centre, and T, slope, p, e, slope at each boundary. */
  private readonly r: Float64Array
  private readonly t: Float64Array
  private readonly dt: Float64Array
  private readonly p: Float64Array
  private readonly e: Float64Array
  private readonly de: Float64Array
  private readonly k: Float64Array
  readonly r0: number
  readonly n0: number
  private readonly memo = new Map<number, number>()

  constructor(levels: readonly Level[], readonly height: number, deltaT = 0, surfaceLayer = Infinity) {
    const bottom = Math.min(height, 0) - 500
    const zs = new Set<number>([bottom, height, height + BOUNDARY_LAYER, TOP])
    if (height - surfaceLayer > bottom) zs.add(height - surfaceLayer)
    for (const l of levels) if (l.z > bottom && l.z < TOP) zs.add(l.z)
    const z = [...zs].sort((a, b) => a - b)
    const n = z.length
    this.r = new Float64Array(n); this.t = new Float64Array(n); this.dt = new Float64Array(n)
    this.p = new Float64Array(n); this.e = new Float64Array(n); this.de = new Float64Array(n); this.k = new Float64Array(n)
    const w = (h: number): number => (h <= height - surfaceLayer ? 0 : h <= height ? 1 - (height - h) / surfaceLayer
      : h >= height + BOUNDARY_LAYER ? 0 : 1 - (h - height) / BOUNDARY_LAYER)
    const at = z.map((h) => levelAt(levels, h))
    for (let i = 0; i < n; i++) {
      this.r[i] = EARTH_RADIUS + z[i]!
      this.t[i] = at[i]!.t + deltaT * w(z[i]!)
      this.e[i] = Math.max(0, at[i]!.e)
    }
    for (let i = 0; i < n - 1; i++) {
      const dz = z[i + 1]! - z[i]!
      this.dt[i] = (this.t[i + 1]! - this.t[i]!) / dz
      this.de[i] = (this.e[i + 1]! - this.e[i]!) / dz
    }
    // Hydrostatic pressure, anchored at the observer (index of [height]).
    const io = z.indexOf(height)
    this.p[io] = levelAt(levels, height).p
    for (let i = 0; i < n - 1; i++) {
      // k = g / (R a) for the layer, gravity at its middle.
      const g = G0 * (EARTH_RADIUS / ((this.r[i]! + this.r[i + 1]!) / 2)) ** 2
      this.k[i] = g / RD
    }
    for (let i = io; i < n - 1; i++) this.p[i + 1] = this.p[i]! * this.layerRatio(i)
    for (let i = io - 1; i >= 0; i--) this.p[i] = this.p[i + 1]! / this.layerRatio(i)
    this.r0 = EARTH_RADIUS + height
    this.n0 = 1 + this.nm1(this.r0)
  }

  /** p(top of layer i) / p(bottom of layer i). */
  private layerRatio(i: number): number {
    const a = this.dt[i]!, k = this.k[i]!, t0 = this.t[i]!, h = this.r[i + 1]! - this.r[i]!
    return Math.abs(a) < 1e-9 ? Math.exp(-k * h / t0) : Math.pow((t0 + a * h) / t0, -k / a)
  }

  private layerPressure(i: number, r: number): number {
    const a = this.dt[i]!, k = this.k[i]!, t0 = this.t[i]!, h = r - this.r[i]!
    return this.p[i]! * (Math.abs(a) < 1e-9 ? Math.exp(-k * h / t0) : Math.pow((t0 + a * h) / t0, -k / a))
  }

  private layer(r: number): number {
    const rr = this.r
    let lo = 0, hi = rr.length - 2
    if (r <= rr[0]!) return 0
    if (r >= rr[hi]!) return hi
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (rr[m]! <= r) lo = m; else hi = m }
    return lo
  }

  /** n - 1 at radius [r]. */
  nm1(r: number): number {
    if (r >= this.r[this.r.length - 1]!) return 0
    const i = this.layer(r), h = r - this.r[i]!
    const t = this.t[i]! + this.dt[i]! * h
    return (GAMMA * this.layerPressure(i, r) - VAPOUR * (this.e[i]! + this.de[i]! * h)) / t
  }

  /** n - 1 and dn/dr at [r] inside layer [i]. */
  private index(r: number, i: number): [number, number] {
    const h = r - this.r[i]!
    const t = this.t[i]! + this.dt[i]! * h
    const p = this.layerPressure(i, r)
    const e = this.e[i]! + this.de[i]! * h
    const g = this.k[i]! // g / R
    const dp = -g * p / t
    const nm1 = (GAMMA * p - VAPOUR * e) / t
    const dn = (GAMMA * dp - VAPOUR * this.de[i]!) / t - nm1 * this.dt[i]! / t
    return [nm1, dn]
  }

  /** Radius in layer [i] where n r = [target] (n r rises with r: no ducting assumed). */
  private radiusFor(target: number, i: number, guess: number): number {
    let r = guess
    const lo = this.r[i]!, hi = this.r[i + 1]!
    for (let it = 0; it < 30; it++) {
      const [nm1, dn] = this.index(r, i)
      const f = (1 + nm1) * r - target
      const d = 1 + nm1 + r * dn
      let next = r - f / d
      if (next < lo) next = (r + lo) / 2
      if (next > hi) next = (r + hi) / 2
      if (Math.abs(next - r) < 1e-6) return next
      r = next
    }
    return r
  }

  /**
   * Bending (radians) of the ray with invariant [c] = n r sin z between radii [ra] < [rb], where it is not
   * descending past a tangent point in between: integral over z of -r n' / (n + r n').
   */
  private bend(c: number, ra: number, rb: number): number {
    if (rb <= ra) return 0
    let total = 0
    let i = this.layer(ra)
    let rLow = ra
    const zOf = (r: number): number => Math.asin(Math.min(1, c / ((1 + this.nm1(r)) * r)))
    let zLow = zOf(ra)
    while (rLow < rb && i < this.r.length - 1) {
      const rHigh = Math.min(rb, this.r[i + 1]!)
      const zHigh = zOf(rHigh)
      // z decreases going up; integrate over [zHigh, zLow].
      const mid = (zLow + zHigh) / 2, half = (zLow - zHigh) / 2
      if (half > 0) {
        let s = 0
        for (let q = 0; q < 8; q++) {
          const z = mid + half * GL_X[q]!
          const target = c / Math.sin(z)
          const guess = rLow + (rHigh - rLow) * (zLow - z) / (zLow - zHigh)
          const r = this.radiusFor(target, i, guess)
          const [nm1, dn] = this.index(r, i)
          s += GL_W[q]! * (-r * dn / (1 + nm1 + r * dn))
        }
        total += s * half
      }
      rLow = rHigh; zLow = zHigh; i++
    }
    return total
  }

  /** Radius of the tangent point of a ray with invariant [c] (n r = c), below the observer. */
  private tangent(c: number): number {
    // n r is increasing in r: bisection over the whole model, then Newton in its layer.
    let lo = this.r[0]!, hi = this.r0
    if ((1 + this.nm1(lo)) * lo >= c) return lo
    for (let it = 0; it < 60 && hi - lo > 1e-4; it++) {
      const m = (lo + hi) / 2
      if ((1 + this.nm1(m)) * m < c) lo = m; else hi = m
    }
    return (lo + hi) / 2
  }

  /** Astronomical refraction (arcminutes) for a ray leaving the observer at apparent altitude [apparent] degrees. */
  refraction(apparent: number): number {
    const cached = this.memo.get(apparent)
    if (cached !== undefined) return cached
    const top = this.r[this.r.length - 1]!
    const c = this.n0 * this.r0 * Math.cos(apparent * DEG)
    let b: number
    if (apparent >= 0) b = this.bend(c, this.r0, top)
    else {
      const rt = this.tangent(c)
      b = this.bend(c, rt, top) + this.bend(c, rt, this.r0)
    }
    const arcmin = b / DEG * 60
    this.memo.set(apparent, arcmin)
    return arcmin
  }

  /**
   * Dip (degrees) of the sea-level horizon seen from the observer, with terrestrial refraction in this same
   * atmosphere: the ray grazing the sea surface, cos(dip) = n(R_E) R_E / (n_0 r_0). 0 at or below sea level.
   */
  dip(): number {
    if (this.height <= 0) return 0
    const c = (1 + this.nm1(EARTH_RADIUS)) * EARTH_RADIUS
    return Math.acos(Math.min(1, c / (this.n0 * this.r0))) / DEG
  }
}

/** U.S. Standard Atmosphere 1976 (NOAA/NASA/USAF), 0-80 km, dry: its base levels and lapse rates (geopotential). */
export function usStandard1976(): Level[] {
  const RE = 6_356_766
  const base: Array<[number, number]> = [[0, -0.0065], [11000, 0], [20000, 0.001], [32000, 0.0028], [47000, 0], [51000, -0.0028], [71000, -0.002], [84852, 0]]
  const out: Level[] = []
  let t = 288.15, p = 1013.25
  for (let i = 0; i < base.length - 1; i++) {
    const [h0, a] = base[i]!
    const h1 = base[i + 1]![0]
    for (let h = h0; h < h1; h += 1000) {
      const z = RE * h / (RE - h)
      if (z > TOP + 1000) return out
      out.push({ z, t, p, e: 0 })
      const step = Math.min(1000, h1 - h)
      const t1 = t + a * step
      p = Math.abs(a) < 1e-12 ? p * Math.exp(-G0 * step / (RD * t)) : p * Math.pow(t1 / t, -G0 / (RD * a))
      t = t1
    }
  }
  return out
}
