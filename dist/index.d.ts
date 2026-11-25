/**
 * WARNING: developed with AI (Claude Code). All times are approximations only, not a
 * halachic authority. Do not rely on them for halachic decisions; check a reliable luach
 * and consult a rav. Provided as is, no warranty.
 */
/** One-sentence disclaimer that apps should show beside any zmanim they display. */
export declare const DISCLAIMER: {
    readonly en: "Times are approximate and may be slightly inaccurate.";
    readonly he: "הזמנים משוערים ועשויים להיות לא מדויקים מעט.";
};
export { CLIMATE_RECORD_SIZE, configure, getMonthlyLapseRates, getMonthlyTemperatures, getPlace, getTerrainHorizon, HORIZON_CHUNK, LAPSE_SCALE, listPlaces, nearestPlaceId, placeCount, RECORD_SIZE, searchPlaces, toCivilDate, zmanim } from './places.js';
export type { AssetLoader, DateInput, Lang, Place } from './places.js';
export { GEO_RECORD_SIZE, listPlaceGeo, placeTree } from './geo.js';
export type { PlaceGeo, PlaceOption, PlaceTree } from './geo.js';
export { computeZmanim, HORIZON_ZMANIM, horizonDip, equinoxDepression, JERUSALEM_LAT, NO_TERRAIN, TERRAIN_BINS, TERRAIN_ZMANIM, terrainAltitude, horizonZenith, sunEventMs, epochMs, formatTime, ROUNDING, ZMAN_NAMES, zmanInstants } from './zmanim.js';
export type { CivilDate, Coordinates, Rounding, ZmanName } from './zmanim.js';
export { horizonRefractionArcmin, INVERSION_C, inversionFactor, refractionArcmin, standardPressure, standardTemperature } from './refraction.js';
export { defaultDeltaT, julianDay, spa, spaDay, spaEvent, spaSunTimes, SUNRISE_SUNSET_H0, zenithToH0 } from './spa.js';
export type { SpaDay, SpaEventOptions, SpaInput, SpaResult } from './spa.js';
export { defaultCandlesFor, defaultCommunityFor, getCommunity, listCommunities, primaryZmanim, ZMAN_GROUPS } from './communities.js';
export type { Community, ZmanGroup } from './communities.js';
export { MOLAD_INTERVAL_MS, moladIndexAtOrBefore, moladMs, SPECIAL_KINDS, SPECIAL_ROUNDING, SPECIAL_ZMAN_NAMES, specialZmanim, specialZmanInstants } from './special.js';
export type { SpecialKind, SpecialZmanName } from './special.js';
