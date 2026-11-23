# kleikodesh-zmanim.js

Offline zmanim and a compact list of 564 places, as framework-agnostic ES modules (TypeScript source, `.d.ts` shipped).
No network access ever: the data files ship beside your code and are read through a pluggable loader.
Importing the library loads nothing; each data file is read on first need, once.

## API

```js
import { configure, listPlaces, searchPlaces, getPlace, zmanim, computeZmanim, ZMAN_NAMES, ROUNDING } from 'kleikodesh-zmanim'

configure({ baseUrl: '/zmanim-assets/' })            // optional; default: ../assets/ next to dist/ (import.meta.url)
configure({ loader: async (file) => arrayBuffer })   // or bring your own reader (Node fs, a cache, a bundle...)

await listPlaces('he')            // string[]; index = place id (index 0 empty). Loads names-he.txt only.
await searchPlaces('jeru', 'en')  // [{ id, name }]; prefix matches first; ignores case, accents, Hebrew points
await getPlace(1)                 // { id, lat, lng, elevation, tzid, rawOffsetMinutes }. Loads places.bin + tz.json once.
await zmanim(1, new Date(), ['sunrise', 'sunset'])     // { sunrise: '06:12', sunset: '17:01' }; only these are computed
computeZmanim({ lat, lng, tzid }, { year, month, day }) // synchronous core, no data files at all
```

`zmanim(place, date, which?)`: `place` is an id or a `getPlace` result; `date` a `Date` (its local calendar date) or
`{ year, month, day }`; `which` defaults to all of `ZMAN_NAMES`. Each value is `HH:MM` (hours 01-24) in the place's
time zone, or `null` where the sun never reaches that depression that day.

Also exported: `zmanInstants` (exact instants as BigInt epoch nanoseconds), `formatTime`, `epochMs`, `placeCount`,
`RECORD_SIZE`, and the types.

### Definitions (all from sea-level sunrise/sunset, standard NOAA calculator)

| name | definition | rounding |
|---|---|---|
| chatzotNight | solar midnight between yesterday's and today's chatzot | up |
| alot | sun 16.1 deg below the horizon, morning | up |
| misheyakir | sun 11.5 deg below, morning | up |
| sunrise | sea-level sunrise | up |
| sofShmaMga / sofTfillaMga | 3 / 4 temporal hours of the day from 72 min before sunrise to 72 min after sunset | down |
| sofShmaGra / sofTfillaGra | 3 / 4 temporal hours of sunrise..sunset | down |
| chatzot | solar noon | nearest |
| minchaGedola / minchaKetana / plag | 6.5 / 9.5 / 10.75 temporal hours (GRA) | up |
| sunset | sea-level sunset | down |
| tzeit | sun 8.5 deg below, evening | up |

Stringent rounding: a start rounds up, a deadline rounds down, chatzot to the nearest minute.
The printed values equal the KitveiHakodesh app's `dayZmanim()` exactly (test/fixtures/app-zmanim.json, recorded from it).

## Data

`data/places.tsv` is the source of truth: `id key he en lat lng elevation tzid` (tab separated, UTF-8).
Ids are stable: new places get new ids, an id is never reused (a removed place leaves its id empty).
`npm run build:assets` writes the shipped files into `assets/`:

| file | format |
|---|---|
| names-he.txt, names-en.txt | one name per line; line index = id (line 0 empty) |
| places.bin | record of 11 bytes per id at offset id*11 (record 0 unused), little endian: lat int32, lng int32 (degrees x 1e5), elevation int16 (m), tz index uint8 |
| tz.json | `{ ids: [IANA zone...], rawOffsetMinutes: [...] }` (standard offset, for the antimeridian rule only) |

Sizes: names-he 9100 B, names-en 9322 B, places.bin 6215 B, tz.json 1028 B.

`scripts/import-from-app.mjs` created places.tsv from the app's city list once; edit the TSV from now on.

## Solar Position Algorithm (src/spa.ts, standalone)

`src/spa.ts` is a standalone implementation of the Solar Position Algorithm, not yet used by the
zmanim. Source: Ibrahim Reda and Afshin Andreas, "Solar Position Algorithm for Solar Radiation Applications", National Renewable Energy Laboratory, Technical Report NREL/TP-560-34302, revised January 2008, https://docs.nlr.gov/docs/fy08osti/34302.pdf.

Written from scratch solely from this paper on 2026-11-23 by Claude Code (AI assistant) for
KleiKodesh; no other implementation was consulted. The code comments cite the paper's section
and equation numbers; see PROVENANCE.md.

- `spa(input)`: full position for one instant (sections 3.1-3.16 and A.1): apparent declination,
  right ascension, topocentric right ascension / declination / hour angle, zenith, azimuth,
  surface incidence, equation of time.
- `spaDay(y, m, d, deltaT?)` + `spaEvent(day, lat, lng, h0, kind, options?)`: section A.2 sun
  transit, rise and set for any sun-centre elevation (`zenithToH0(zenith, upperLimb)`), as a UT
  fraction of the day. One `spaDay` per date serves every place and angle.
- `defaultDeltaT(year)`: Espenak & Meeus polynomial (NASA/TP-2006-214141); pass your own deltaT
  for better accuracy.

## Build and test

```
npm install
npm run build     # assets + dist/
npm test          # vitest; parity compares with the app's recorded output (test/fixtures/app-zmanim.json)
```

## Credits and licenses

- Code: LGPL-2.1 (see LICENSE). The calculator and calendar logic are ported from an earlier zmanim library
  ( LGPL-2.1, commit ), itself a port of an earlier zmanim library zmanim
  by Eliyahu  (LGPL-2.1). The NOAA algorithm is after Jean Meeus, Astronomical Algorithms.
- Place data: contains data from GeoNames (geonames.org), licensed under CC BY 4.0.
  Some neighbourhood coordinates come from Wikidata (CC0). Where Wikidata has no elevation, it comes from the
  Open-Meteo elevation API (CC BY 4.0), based on the Copernicus DEM GLO-90 (produced using Copernicus WorldDEM-90
  (c) DLR e.V. 2010-2014 and (c) Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European
  Union and ESA; all rights reserved).
