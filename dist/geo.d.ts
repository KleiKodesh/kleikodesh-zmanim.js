import { type Lang } from './places.js';
/** Bytes per place id in geo.bin: uint16 city place id, uint8 country index. */
export declare const GEO_RECORD_SIZE = 3;
export interface PlaceGeo {
    /** ISO 3166 codes, sorted. */
    countries: readonly string[];
    /** Number of places (ids are 1..count). */
    count: number;
    /** The place's country (ISO code). */
    countryOf: (id: number) => string;
    /** The place id of the city the place belongs to; the place itself when it is a city. */
    cityOf: (id: number) => number;
}
/** Every place's country and city. Loads geo.bin and countries.json (about 6 KB) once. */
export declare function listPlaceGeo(): Promise<PlaceGeo>;
/** A name with what it stands for: a country (ISO code) or a place (id). */
export interface PlaceOption<K> {
    key: K;
    name: string;
}
/** Every place grouped country > city > neighbourhood, names in one language, each list sorted by name. */
export interface PlaceTree {
    /** Countries that have places, named in [lang] (Intl.DisplayNames), sorted. */
    countries: readonly PlaceOption<string>[];
    /** A country's cities, sorted; sorted on first ask only. */
    citiesOf: (country: string) => readonly PlaceOption<number>[];
    /** The city first, then its neighbourhoods sorted; just the city when it has none. */
    placesOf: (city: number) => readonly PlaceOption<number>[];
    countryOf: (id: number) => string;
    cityOf: (id: number) => number;
}
/**
 * The three-step place picker's data in [lang]. Loads geo.bin, countries.json and that names file once.
 * Only the country list is sorted up front; each country's cities and each city's neighbourhoods are
 * grouped by id in one pass and sorted the first time they are asked for.
 */
export declare function placeTree(lang: Lang): Promise<PlaceTree>;
