/**
 * WARNING: developed with AI (Claude Code). All times are approximations only, not a
 * halachic authority. Do not rely on them for halachic decisions; check a reliable luach
 * and consult a rav. Provided as is, no warranty.
 */
/** One-sentence disclaimer that apps should show beside any zmanim they display. */
export const DISCLAIMER = {
  en: 'Times are approximate and may be slightly inaccurate; check a reliable luach.',
  he: 'הזמנים משוערים ועשויים להיות לא מדויקים מעט; יש לבדוק בלוח אמין.',
} as const

export { CLIMATE_RECORD_SIZE, configure, getMonthlyTemperatures, getPlace, listPlaces, nearestPlaceId, placeCount, RECORD_SIZE, searchPlaces, toCivilDate, zmanim } from './places.js'
export type { AssetLoader, DateInput, Lang, Place } from './places.js'
export { GEO_RECORD_SIZE, listPlaceGeo, placeTree } from './geo.js'
export type { PlaceGeo, PlaceOption, PlaceTree } from './geo.js'
export { computeZmanim, HORIZON_ZMANIM, horizonDip, horizonZenith, sunEventMs, epochMs, formatTime, ROUNDING, ZMAN_NAMES, zmanInstants } from './zmanim.js'
export type { CivilDate, Coordinates, Rounding, ZmanName } from './zmanim.js'
export { horizonRefractionArcmin, refractionArcmin, standardPressure, standardTemperature } from './refraction.js'
export { defaultDeltaT, julianDay, spa, spaDay, spaEvent, spaSunTimes, SUNRISE_SUNSET_H0, zenithToH0 } from './spa.js'
export type { SpaDay, SpaEventOptions, SpaInput, SpaResult } from './spa.js'
export { defaultCandlesFor, defaultCommunityFor, getCommunity, listCommunities, primaryZmanim, ZMAN_GROUPS } from './communities.js'
export type { Community, ZmanGroup } from './communities.js'
