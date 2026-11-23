# kleikodesh-zmanim.js

Offline zmanim and a compact list of 1803 places, as framework-agnostic ES modules (TypeScript source, `.d.ts` shipped).
No network access ever: the data files ship beside your code and are read through a pluggable loader.
Importing the library loads nothing; each data file is read on first need, once.

## API

```js
import { configure, listPlaces, searchPlaces, getPlace, zmanim, computeZmanim, ZMAN_NAMES, ROUNDING } from 'kleikodesh-zmanim'

configure({ baseUrl: '/zmanim-assets/' })            // optional; default: ../assets/ next to dist/ (import.meta.url)
configure({ loader: async (file) => arrayBuffer })   // or bring your own reader (Node fs, a cache, a bundle...)

await listPlaces('he')            // string[]; index = place id (index 0 empty). Loads names-he.txt only.
await searchPlaces('jeru', 'en')  // [{ id, name }]; prefix matches first; ignores case, accents, Hebrew points
await getPlace(1)                 // { id, lat, lng, elevation, tzid, rawOffsetMinutes, monthlyTemperatureC }.
                                  // Loads places.bin + tz.json + climate.bin (21 KB) once, together.
await zmanim(1, new Date(), ['sunrise', 'sunset'])     // { sunrise: '06:12', sunset: '17:01' }; only these are computed
computeZmanim(await getPlace(1), { year, month, day })  // synchronous core
computeZmanim({ lat, lng, tzid, monthlyTemperatureC: 'standard' }, date) // bare coordinates: standard atmosphere, explicitly
```

Climate safety: the zmanim in `HORIZON_ZMANIM` (sunrise/sunset, everything built from them, the `Visible` lines) need
the place's monthly temperatures. Pass a `getPlace()` result (it carries them). A place object without
`monthlyTemperatureC` throws for those zmanim instead of silently using the standard atmosphere; pass 12 values or
`'standard'` to choose. Pure degree zmanim (alot, tzeit...) and chatzot need no temperatures.

`zmanim(place, date, which?)`: `place` is an id or a `getPlace` result; `date` a `Date` (its local calendar date) or
`{ year, month, day }`; `which` defaults to all of `ZMAN_NAMES`. Each value is `HH:MM` (hours 01-24) in the place's
time zone, or `null` where the sun never reaches that depression that day.

Also exported: `zmanInstants` (exact instants as BigInt epoch nanoseconds), `formatTime`, `epochMs`, `placeCount`,
`RECORD_SIZE`, and the types.

### Definitions (sun position: NREL SPA, see below; sunrise/sunset at sea level unless named Elevated)

| name | definition | rounding |
|---|---|---|
| chatzotNight | solar midnight between yesterday's and today's chatzot | up |
| alot90 | sun 19.8 deg below the horizon, morning (the "90 minutes" opinion) | up |
| alot90Visible | sun 19.8 deg below the visible horizon (see below) | up |
| alot90Chatzot | alot90, or chatzotNight on nights the sun never gets 19.8 deg down (1) | up |
| alot | sun 16.1 deg below the horizon, morning | up |
| alotVisible | sun 16.1 deg below the visible horizon | up |
| alotChatzot | alot, or chatzotNight on nights the sun never gets 16.1 deg down (1) | up |
| misheyakir | sun 11.5 deg below, morning | up |
| misheyakirVisible | sun 11.5 deg below the visible horizon | up |
| misheyakirChatzot | misheyakir, or chatzotNight on nights the sun never gets 11.5 deg down (1) | up |
| misheyakir11 / misheyakir10p2 | sun 11 / 10.2 deg below, morning (other published misheyakir angles) | up |
| sunriseElevated | sunrise over the horizon seen from the place's own elevation (dip + refraction) | up |
| sunrise | sea-level sunrise | up |
| sofShmaMga / sofTfillaMga | 3 / 4 temporal hours of the day from 72 min before sunrise to 72 min after sunset | down |
| sofShmaMga16 / sofTfillaMga16 | 3 / 4 temporal hours of the MGA day by degrees: alot 16.1 deg to the sun 16.1 deg below in the evening | down |
| sofShmaGra / sofTfillaGra | 3 / 4 temporal hours of sunrise..sunset | down |
| chatzot | solar noon | nearest |
| minchaGedola / minchaKetana / plag | 6.5 / 9.5 / 10.75 temporal hours (GRA) | up |
| minchaGedola30 | the later of 30 minutes after chatzot and minchaGedola (half a GRA temporal hour after chatzot) | up |
| plagMga | 10.75 temporal hours of the same MGA day as sofShmaMga (72 min before sunrise .. 72 min after sunset) | up |
| sunset | sea-level sunset | down |
| sunsetElevated | sunset below the horizon seen from the place's own elevation | down |
| tzeitGeonim | sun 3.7 deg below, evening (Geonim, about 13.5 minutes) | up |
| tzeitGeonimVisible | sun 3.7 deg below the visible horizon, evening | up |
| tzeit7083 | sun 7.083 deg below, evening: three medium stars, Rav Y. M. Tukaczinsky's measurement (Sefer Bein Hashmashos) | up |
| tzeit | sun 8.5 deg below, evening | up |
| tzeitVisible | sun 8.5 deg below the visible horizon, evening | up |

Degree lines return null on days the sun never gets that low (high latitudes in summer); no rule is invented for
them, except the explicit `...Chatzot` fallback lines:

(1) Fallback to chatzot halaila (solar midnight, the lowest sun) when the angle is never reached:
Beur HaGra, Orach Chaim 261:2 ("in lands leaning north, dawn begins in summer at midnight";
https://www.sefaria.org/Beur_HaGra_on_Shulchan_Arukh,_Orach_Chayim.261.2); STAR-K, Rabbi Dovid Heber with
Rav Moshe Heinemann, https://www.star-k.org/articles/?p=515 (notes 14, 15, 21, 23), which also cites
Moadim U'Zmanim 2:155 (glosses) and Sefer Bein Hashmashos p. 55.

"Visible" lines measure the depression from the apparent (refracted) sea-level horizon instead of the geometric one.
Refraction lifts the image of the horizon line: a point that appears on the horizon is geometrically R0 below it,
where R0 is the horizon refraction (the same Saemundsson/Meeus model as sunrise, at the place's pressure and monthly
temperature, about 34'). So the sun's centre is at zenith 90 + R0 + depression (no solar radius); this is the
convention of the standard sunrise altitude h0 = -0 deg 34' (Meeus, Astronomical Algorithms, 2nd ed., ch. 15)
extended below the horizon. The Visible lines come out about 2-4 minutes beyond the geometric ones.

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
and chatzot are geometric and unchanged. getPlace() loads climate.bin once with the place table.
`computeZmanim` takes `elevation` and `monthlyTemperatureC` (12 values, or 'standard') in its place argument.

Elevated sunrise/sunset: the horizon seen from height H lies lower by the geometric dip arccos(R / (R + H))
(R = 6371 km mean Earth radius; no dip below sea level), and refraction is taken at that depressed apparent
altitude with the same pressure/temperature model. Each place uses its own elevation from places.bin.

Stringent rounding: a start rounds up, a deadline rounds down, chatzot to the nearest minute.
Against the KitveiHakodesh app's former `dayZmanim()` (NOAA, fixed 34' refraction; recorded in
test/fixtures/app-zmanim.json) every printed value is within 1 minute: degree zmanim and chatzot differ only by the
NOAA -> SPA change (seconds, which can flip a printed minute), sunrise/sunset-based ones also by the refraction model.

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

Sizes (1803 places): names-he 27436 B, names-en 23595 B, places.bin 19844 B, tz.json 2023 B, climate.bin 21648 B.

`data/climate.tsv` (id, 12 monthly means, 0.1 C) is made once by `node scripts/fetch-climate.mjs`: mean of the
daily mean 2 m temperature 2016-2025 from the Open-Meteo Historical Weather API at each place's elevation
(sequential, paused, resumable). It is not refetched by the normal build.
Every place has temperatures. For newly added places, run the fetch-climate-parallel workflow (or
`node scripts/fetch-climate.mjs`, which resumes from the rows already in data/climate.tsv), then rebuild the assets;
until then a new place uses the standard-atmosphere temperature (-128 in climate.bin).

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
npm test          # vitest; parity uses the recorded fixture test/fixtures/app-zmanim.json
```

## Credits and licenses

- Code: LGPL-2.1 (see LICENSE). The sun position is the clean-room NREL SPA (src/spa.ts, PROVENANCE.md); the
  former NOAA port is gone. src/zmanim.ts was rewritten around SPA, but it was written by editing the earlier
  port and keeps its design (per-day lazy cache, MGA 72-minute day, temporal-hour arithmetic, antimeridian date
  rule), so it is still treated as derived from an earlier zmanim library (
  LGPL-2.1, commit ), itself a port of an earlier zmanim library zmanim by Eliyahu  (LGPL-2.1).
- Place data: contains data from GeoNames (geonames.org), licensed under CC BY 4.0.
  Some neighbourhood coordinates come from Wikidata (CC0). Where Wikidata has no elevation, it comes from the
  Open-Meteo elevation API (CC BY 4.0), based on the Copernicus DEM GLO-90 (produced using Copernicus WorldDEM-90
  (c) DLR e.V. 2010-2014 and (c) Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European
  Union and ESA; all rights reserved).
- Seven neighbourhood points (Ramat Beit Shemesh Aleph, Bet and Gimel, Nofei Aviv, Kiryat Sefer, Brachfeld,
  Green Park) (c) OpenStreetMap contributors, ODbL 1.0, https://www.openstreetmap.org/copyright. Their
  elevations come from the Open-Meteo elevation API (above).
- Climate data (climate.bin): weather data by Open-Meteo.com (https://open-meteo.com/), CC BY 4.0, from the
  ERA5 / ERA5-Land reanalysis by the Copernicus Climate Change Service (Hersbach et al. 2018, Munoz Sabater 2019).
- Refraction method: Saemundsson (1986), Bennett (1982), Meeus, Astronomical Algorithms (1998) ch. 16;
  U.S. Standard Atmosphere 1976 / ICAO Doc 7488. Written independently from these publications.
