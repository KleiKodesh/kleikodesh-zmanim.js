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

### Sunrise/sunset refraction (pressure and temperature)

Sunrise and sunset are when the upper limb of the sun touches the apparent sea-level horizon: zenith =
90 deg + solar radius 16' + horizon refraction R. R is no longer a fixed 34'; it depends on the air:

- Refraction (arcmin) at true altitude h: R = 1.02 / tan(h + 10.3 / (h + 5.11)) at 1010 hPa and 10 C
  (Saemundsson, Sky and Telescope 72, 1986, p. 70; inverse of Bennett, Journal of Navigation 35, 1982),
  scaled by (P / 1010) * (283 / (273 + T)) as in Meeus, Astronomical Algorithms, 2nd ed., ch. 16.
  At the apparent horizon the true altitude satisfies h + R(h) = 0, solved by a few fixed-point steps.
- Pressure P from the place's elevation: U.S. Standard Atmosphere 1976 / ICAO standard atmosphere,
  P = 1013.25 * (1 - 0.0065 H / 288.15)^5.25588 hPa.
- Temperature T: the place's monthly mean (climate.bin), interpolated linearly between mid-month values.
  Without data: the standard-atmosphere temperature 15 - 0.0065 H C.

Only sunrise, sunset and the zmanim built from them (GRA / MGA hours, mincha, plag) change, typically by
5-35 seconds against the old fixed 34' (more at high places). Degree-based zmanim (alot, misheyakir, tzeit)
and chatzot are geometric and unchanged. Only those zmanim load climate.bin, once.
`computeZmanim` takes optional `elevation` and `monthlyTemperatureC` (12 values) in its place argument.

Stringent rounding: a start rounds up, a deadline rounds down, chatzot to the nearest minute.
Degree zmanim and chatzot equal the KitveiHakodesh app's former `dayZmanim()` exactly; sunrise/sunset-based ones differ
only by the refraction change above.

## Data

`data/places.tsv` is the source of truth: `id key he en lat lng elevation tzid` (tab separated, UTF-8).
Ids are stable: new places get new ids, an id is never reused (a removed place leaves its id empty).
`npm run build:assets` writes the shipped files into `assets/`:

| file | format |
|---|---|
| names-he.txt, names-en.txt | one name per line; line index = id (line 0 empty) |
| places.bin | record of 11 bytes per id at offset id*11 (record 0 unused), little endian: lat int32, lng int32 (degrees x 1e5), elevation int16 (m), tz index uint8 |
| climate.bin | 12 bytes per id at offset id*12 (record 0 unused): monthly mean temperature, int8 C, -128 = unknown |
| tz.json | `{ ids: [IANA zone...], rawOffsetMinutes: [...] }` (standard offset, for the antimeridian rule only) |

Sizes: names-he 9074 B, names-en 9322 B, places.bin 6215 B, tz.json 1028 B, climate.bin 6780 B.

`data/climate.tsv` (id, 12 monthly means, 0.1 C) is made once by `node scripts/fetch-climate.mjs`: mean of the
daily mean 2 m temperature 2016-2025 from the Open-Meteo Historical Weather API at each place's elevation
(sequential, paused, resumable). It is not refetched by the normal build.

`scripts/import-from-app.mjs` created places.tsv from the app's city list once; edit the TSV from now on.

## Build and test

```
npm install
npm run build     # assets + dist/
npm test          # vitest; parity tests need the KitveiHakodesh app checked out next to this folder
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
- Climate data (climate.bin): weather data by Open-Meteo.com (https://open-meteo.com/), CC BY 4.0, from the
  ERA5 / ERA5-Land reanalysis by the Copernicus Climate Change Service (Hersbach et al. 2018, Munoz Sabater 2019).
- Refraction method: Saemundsson (1986), Bennett (1982), Meeus, Astronomical Algorithms (1998) ch. 16;
  U.S. Standard Atmosphere 1976 / ICAO Doc 7488. Written independently from these publications.
