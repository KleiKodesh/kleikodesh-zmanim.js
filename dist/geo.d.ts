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
