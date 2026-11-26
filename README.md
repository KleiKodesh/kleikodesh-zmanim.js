> **WARNING - not a halachic source.** This library was developed with AI (Claude Code). All times are approximations only. It is not a halachic authority: do not rely on it for halachic decisions. Always check a reliable luach and consult a rav. Provided as is, with no warranty of any kind.
>
> <div dir="rtl">
>
> **אזהרה - אינו מקור הלכתי.** פותח בעזרת בינה מלאכותית (Claude Code). הזמנים הם הערכה משוערת בלבד ואינם מקור הלכתי. אין לסמוך עליהם להכרעת הלכה; יש לבדוק בלוח אמין ולהתייעץ עם רב. מסופק כמות שהוא, ללא כל אחריות.
>
> </div>

# kleikodesh-zmanim.js

Offline zmanim and a compact list of 1803 places, as framework-agnostic ES modules (TypeScript source, `.d.ts` shipped).
No network access ever: the data files ship beside your code and are read through a pluggable loader.
Importing the library loads nothing; each data file is read on first need, once.

## API

```js
import { configure, listPlaces, searchPlaces, getPlace, zmanim, computeZmanim, ZMAN_NAMES, ROUNDING } from 'kleikodesh-zmanim'

configure({ baseUrl: '/zmanim-assets/' })            // optional; default: ../assets/ next to dist/ (import.meta.url)
configure({ loader: async (file) => arrayBuffer })   // or bring your own reader (Node fs, a cache, a bundle...)
configure({ empiricalInversionCorrection: false })   // optional; drop the empirical winter-inversion 15 s (see Lines)

await listPlaces('he')            // string[]; index = place id (index 0 empty). Loads names-he.txt only.
await searchPlaces('jeru', 'en')  // [{ id, name }]; prefix matches first; ignores case, accents, Hebrew points
await getPlace(1)                 // { id, lat, lng, elevation, tzid, rawOffsetMinutes, monthlyTemperatureC }.
                                  // Loads places.bin + tz.json + climate.bin (23 KB each) once, together;
                                  // zmanim() adds atmosphere.bin (25 KB) on the first sunrise/sunset-type line.
await nearestPlaceId(lat, lng)     // id of the listed place nearest a point; reads places.bin only
await placeTree('he')             // country > city > neighbourhood picker data; each list sorted on first ask
await zmanim(1, new Date(), ['sunrise', 'sunset'])     // { sunrise: '06:12', sunset: '17:01' }; only these are computed
computeZmanim(await getPlace(1), { year, month, day })  // synchronous core
computeZmanim({ lat, lng, tzid, monthlyTemperatureC: 'standard' }, date) // bare coordinates: standard atmosphere, explicitly
```

Climate safety: the zmanim in `HORIZON_ZMANIM` (sunrise/sunset, everything built from them) need
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
| chatzotNight | solar midnight between yesterday's and today's chatzot | down |
| alot90 | sun 19.798 deg below the horizon, morning (the "90 minutes" opinion) | down |
| alot90Chatzot | alot90, or chatzotNight on nights the sun never gets 19.798 deg down (1) | down |
| alot | sun 16.05 deg below the horizon, morning | down |
| alotChatzot | alot, or chatzotNight on nights the sun never gets 16.05 deg down (1) | down |
| misheyakir | sun 11.5 deg below, morning | up |
| misheyakirChatzot | misheyakir, or chatzotNight on nights the sun never gets 11.5 deg down (1) | up |
| misheyakir11 / misheyakir10p2 | sun 11 / 10.2 deg below, morning (other published misheyakir angles) | up |
| misheyakirLechumra | sun 10.5 deg below, morning: a later, stringent misheyakir (SA OC 18:3, 30:1, 58:1; published angles span 10.2-11.5 deg) | up |
| sunriseElevated | sunrise over the horizon seen from the place's own elevation (dip + refraction) | up |
| sunrise | sea-level sunrise | up |
| sunriseTerrain | the sun's upper limb clears the real terrain horizon at its azimuth (horizon-NN.bin; null without data) | up |
| sofShmaMga / sofTfillaMga | 3 / 4 temporal hours of the day from 72 min before sunrise to 72 min after sunset | down |
| sofShmaMga16 / sofTfillaMga16 | 3 / 4 temporal hours of the MGA day by degrees: alot 16.05 deg to the sun 16.05 deg below in the evening | down |
| sofShmaGra / sofTfillaGra | 3 / 4 temporal hours of sunrise..sunset | down |
| chatzot | solar noon | down |
| minchaGedola / minchaKetana / plag | 6.5 / 9.5 / 10.75 temporal hours (GRA) | up |
| minchaGedola30 | the later of 30 minutes after chatzot and minchaGedola (half a GRA temporal hour after chatzot) | up |
| plagMga | 10.75 temporal hours of the same MGA day as sofShmaMga (72 min before sunrise .. 72 min after sunset) | up |
| sofShmaMga90 / sofTfillaMga90 / plagMga90 | 3 / 4 / 10.75 temporal hours of the MGA day from 90 fixed min before sunrise to 90 after sunset (5 mil of 18 min: Pesachim 93b; SA OC 459:2) | down / down / up |
| sofShmaMga120 / sofTfillaMga120 / plagMga120 | the same for a day of 120 fixed min each side (5 mil of 24 min: Pesachim 93b; Rambam on Mishna Pesachim 3:2) | down / down / up |
| sofShmaMga19 / sofTfillaMga19 / plagMga19 | the same for the day from the sun 19.798 deg below in the morning to 19.798 deg below in the evening | down / down / up |
| sofShmaMga72z / sofTfillaMga72z / plagMga72z | the same for the day from alot72z to tzeitRt72Zmanis (a tenth of the GRA day each side) | down / down / up |
| sofShmaMga90z / sofTfillaMga90z / plagMga90z | the same for the day from alot90z to tzeit90z (an eighth of the GRA day each side) | down / down / up |
| sunsetTerrain | the sun's upper limb sinks below the real terrain horizon at its azimuth (horizon-NN.bin; null without data) | down |
| sunset | sea-level sunset | down |
| candles40 / candles30 / candles22 / candles20 / candles18 | candle lighting 40 / 30 / 22 / 20 / 18 minutes before sea-level sunset, by community custom (adding to Shabbat before sunset: SA OC 261:2) | down |
| sunsetElevated | sunset below the horizon seen from the place's own elevation | down |
| tzeitGeonim | sun 3.701 deg below, evening (Geonim, about 13.5 minutes) | up |
| tzeit7083 | sun 7.083 deg below, evening: three medium stars (Dr. Baruch Cohn, Melamed LeHo'il 1:30) | up |
| alot12 | sun 12 deg below, morning: the light spreads over the whole east (Dr. Baruch Cohn, Melamed LeHo'il 1:30) | down |
| plagAlot12Tzeit7083 | plag (10.75 seasonal hours) of a day from alot12 to tzeit7083 | up |
| tzeit | sun 8.5 deg below, evening | up |
| tzeitRt72 | Rabbeinu Tam: 72 fixed minutes after sunset (4 mil of 18 min; Tosafot Shabbat 35a, from Pesachim 94a; SA OC 261:2 with Rema) | up |
| tzeitRt72Zmanis | Rabbeinu Tam in seasonal minutes: sunset plus a tenth of the sunrise..sunset day | up |
| tzeitRt16 | Rabbeinu Tam by degrees: sun 16.05 deg below, evening (the depth 72 minutes after sunset at the Jerusalem equinox) | up |
| alot72z / alot90z | dawn in seasonal minutes: a tenth / an eighth of the sunrise..sunset day before sunrise (4 mil, Pesachim 94a; 5 mil, Pesachim 93b) | down |
| tzeit90z | nightfall in seasonal minutes: an eighth of the sunrise..sunset day after sunset (5 mil, Pesachim 93b) | up |
| tzeit13p5 / tzeit18 | 13.5 / 18 fixed minutes after sunset: 3/4 mil (Shabbat 34b; SA OC 261:2) at 18 / 24 min a mil (SA OC 459:2; Rambam on Mishna Pesachim 3:2) | up |
| tzeit18Sun | 18 minutes (3/4 mil at 24 min a mil) by the sun's position: the sun 4.657 deg below the true horizon, its depth 18 minutes after sunset in Jerusalem at the equinox (computed with this library's SPA) | up |
| tzeit645 | Rav Y. M. Tucazinsky's nightfall: the sun 6.45 deg below the true horizon (Birur Halacha, Yoreh De'ah 262) | up |
| tzeit13p5z | 13.5 seasonal minutes (3/4 mil) after sunset - Rav Ovadia Yosef, Kitzur Yalkut Yosef OC, Hilchot Shabbat (checked in the text) | up |
| sofShmaBenIshChai / sofTfillaBenIshChai / plagBenIshChai | 3 / 4 / 10.75 seasonal hours of a day from dawn (72 min) to nightfall a third of an hour after sunset - Ben Ish Chai, Shana Rishona, Vayakhel (checked in the text) | down / down / up |
| alot96 / alot120 | dawn 4 / 5 mil of 24 min before sunrise (96 / 120 fixed minutes) - Shulchan Aruch HaRav OC 89:1 with OC 459:10 (checked in the text); the 120-minute reading per HaMichlol, Alot HaShachar note 3 | down |
| tzeitRt90 / tzeitRt96 | Rabbeinu Tam: 4 mil of 22.5 / 24 min after sunset (90 / 96 fixed minutes) - Igrot Moshe OC 4:62; Shulchan Aruch HaRav OC 261:5 with OC 459:10 (checked in the text) | up |
| beinHashmashotYereim | start of bein hashmashot per the Yereim: 3/4 mil (18 min) before sunset, as the sun 2.992 deg above the true horizon (its height 18 minutes before sunset in Jerusalem at the equinox); degree-based method per Rabbi Yedidya Manet, Zmanei HaHalacha Lema'aseh p. 11 | down |
| plagAlot90Tzeit645 / plagAlot72Tzeit645 | plag (10.75 seasonal hours) of a day from dawn (19.798 / 16.05 deg) to tzeit645 - the Magen Avraham's day from dawn to nightfall (Magen Avraham 58:1; SA OC 233:1) | up |
| tzeit20 / tzeit24 / tzeit30 / tzeit40 / tzeit50 | 20 / 24 / 30 / 40 / 50 fixed minutes after sunset, by community custom (50: Rav Moshe Feinstein, Igrot Moshe OC 4:62) | up |
| tzeit45 | 45 fixed minutes after sunset - the Chazon Ish's end of Shabbat, which already includes Rabbeinu Tam (Birur Zmanim vol 2 p.18) | up |
| beinHashmashotRt | start of twilight per Rabbeinu Tam: sunset + 58.5 min (3.25 mil of 18 min; Tosafot Shabbat 35a, Pesachim 94a; SA OC 261:2). Twilight ends at tzeitRt72; by the Geonim it is sunset..tzeitGeonim | down |
| misheyakir7p65 / misheyakir12p85 | sun 7.65 deg below (Igrot Moshe; Rav Yaakov Kamenetsky, Zmanei Yisrael p. 117; Lakewood custom) / 12.85 deg below (Birur Halacha OC 18, time of need), morning | up |
| misheyakir66 / misheyakir60 / misheyakir40 | 66 / 60 / 40 fixed minutes before sunrise - Pri Megadim, Eshel Avraham 58:2 (6 min after a 72-min dawn) / Rav Henkin (Teshuvot Ivra 3, not opened) / Rav Chaim Kanievsky; per OU Kosher Halacha Yomis, outorah.org/p/78963 | up |
| alotBaalHatanya / tzeitBaalHatanya | Baal HaTanya: sun 16.9 deg below, morning / 6 deg below, evening (Shulchan Aruch HaRav; angles secondary only - see also chabad.org 3209349) | down / up |
| sunriseBaalHatanya / sunsetBaalHatanya | Baal HaTanya's netz / shkia amiti: the sun's centre 1.583 deg below the true horizon (a few minutes before sea-level sunrise / after sea-level sunset) | up / down |
| sofShmaBaalHatanya / sofTfillaBaalHatanya / minchaGedolaBaalHatanya / minchaKetanaBaalHatanya / plagBaalHatanya | 3 / 4 / 6.5 / 9.5 / 10.75 temporal hours of the day netz amiti..shkia amiti | down / down / up / up / up |
| sofShmaHarari40/25, sofTfillaHarari40/25, minchaGedolaHarari40/25, minchaKetanaHarari40/25, plagHarari40/25 | Magen Avraham's day: 3 / 4 / 6.5 / 9.5 / 10.75 temporal hours of a day from alot72z to sunset + 40 min (outside Israel) / + 25 min (Israel); its midpoint is not chatzot | down / down / up / up / up |
| minchaGedolaHillel | a day ending at the Geonim's nightfall: the later of chatzot + half a temporal hour of a day 16.05 deg..3.701 deg and chatzot + 30 min | up |
| plagAlotTzeitGeonim | 10.75 temporal hours into a day from dawn 16.05 deg to the Geonim's nightfall 3.701 deg (a stringency) | up |
| minchaKetanaHillel / plagHillel | a day ending at the Geonim's nightfall: 2.5 / 1.25 temporal hours (of a day 16.05 deg..3.8 deg) before the sun is 3.8 deg below | up |
| chatzotFixedLocal | 12:00 local mean time (longitude / 15 hours from UTC); Aruch HaShulchan OC 233:14 (checked in the text) | down |
| sofShmaGraFixed / sofTfillaGraFixed | half and two thirds of the morning to the fixed chatzot: sunrise + 1/2 / 2/3 of (chatzotFixedLocal - sunrise) | down |
| sofShmaMga72Fixed / sofShmaMga16Fixed | dawn (72 min before sunrise / 16.05 deg) + half of (chatzotFixedLocal - dawn) | down |
| minchaGedolaFixed / minchaKetanaFixed / plagFixed | chatzotFixedLocal + 30 min / + 3.5 / + 4.75 hours of (sunset - chatzotFixedLocal) / 6 | up |
| sofShmaAsym / sofTfillaAsym / plagAsym | 3 / 4 / 10.75 temporal hours of a day from dawn 16.05 deg to nightfall 7.083 deg (Ben Ish Chai and others; Yisrael Vehazmanim vol. III no. 22) | down / down / up |

Degree lines return null on days the sun never gets that low (high latitudes in summer); no rule is invented for
them, except the explicit `...Chatzot` fallback lines:

(1) Fallback to chatzot halaila (solar midnight, the lowest sun) when the angle is never reached:
Beur HaGra, Orach Chaim 261:2 ("in lands leaning north, dawn begins in summer at midnight";
https://www.sefaria.org/Beur_HaGra_on_Shulchan_Arukh,_Orach_Chayim.261.2); STAR-K, Rabbi Dovid Heber with
Rav Moshe Heinemann, https://www.star-k.org/articles/?p=515 (notes 14, 15, 21, 23), which also cites
Moadim U'Zmanim 2:155 (glosses) and Sefer Bein Hashmashos p. 55.

### Special days: specialZmanim(place, date, kind)

The library has no Hebrew calendar; the caller says which kind of day it is (`SPECIAL_KINDS`), and only that kind's
lines are computed. `specialZmanInstants` gives the exact instants; `specialZmanim` prints HH:MM with `SPECIAL_ROUNDING`.
The end of a fast and of Shabbat/Yom Tov are the existing tzeit lines above (no duplicates).

```js
specialZmanim(await getPlace(1), { year: 2026, month: 4, day: 1 }, 'erevPesach')  // { sofAchilatChametzGra: '09:..', ... }
specialZmanInstants(place, date, 'kiddushLevana')   // instants; may fall on other days, the caller prints their dates
moladMs(moladIndexAtOrBefore(Date.now()))           // the last molad, epoch ms UTC
```

| kind | name | definition | rounding | sources |
|---|---|---|---|---|
| erevPesach | sofAchilatChametzMga | end of 4th temporal hour, day 72 min before sunrise .. 72 min after sunset | down | Mishna Pesachim 1:4; Pesachim 11b-12b; SA OC 443:1; Magen Avraham 58:1, MB 58:4 |
| erevPesach | sofAchilatChametzMga16 | the same, day from alot 16.05 deg to 16.05 deg in the evening | down | as above |
| erevPesach | sofAchilatChametzGra | end of 4th temporal hour, sunrise .. sunset | down | as above; MB 58:4 |
| erevPesach | sofBiurChametzMga / Mga16 / Gra | end of the 5th hour, same three days | down | as above |
| fastDay | fastStart90 | 90 fixed minutes before sunrise (5 mil) | down | SA OC 564:1; Pesachim 94a; SA OC 459:2, MB 459:15 |
| fastDay | fastStart72 | 72 fixed minutes before sunrise (4 mil) | down | as above |
| fastDay | fastStart16 | sun 16.05 deg below the horizon (= alot) | down | SA OC 564:1; Pesachim 94a |
| kiddushLevana | kiddushLevanaStart3 | molad + 3 full days | up | MB 426:20 |
| kiddushLevana | kiddushLevanaStart7 | molad + 7 full days | up | SA OC 426:4 |
| kiddushLevana | kiddushLevanaEndHalf | molad + half of 29 d 12 h 793 chalakim (14 d 18 h 22 min 1.7 s) | down | Rema OC 426:3 (Maharil) |
| kiddushLevana | kiddushLevanaEnd15 | molad + 15 full days | down | SA OC 426:3; MB 426:17 |

The molad: BaHaRaD (Monday night 5 h 204 chalakim, Rambam Kiddush HaChodesh 6:8) plus whole mean months of
29 d 12 h 793 chalakim (6:2-3), in Jerusalem mean local time (UT + 2:20:56); the epoch day R.D. -1373427 is from
Reingold and Dershowitz, Calendrical Calculations. Tested against published molads of Tishrei 5786 and 5787.

### Explanations

What each zman is, its method and its sources are documentation only, not shipped data: see
[docs/zmanim.md](docs/zmanim.md) (English) and [docs/zmanim.he.md](docs/zmanim.he.md) (Hebrew). Both are generated
from `data/explanations.json` by `scripts/build-explanations.mjs` (part of `npm run build`).

### Community customs

`listCommunities(lang)`, `getCommunity(id)`, `defaultCommunityFor(placeId)`, `defaultCandlesFor(placeId)` and
`primaryZmanim(communityId, placeId?)` read `assets/communities.json` (under 1 KB, loaded once on first call; built
from `data/communities.json`). A community names the primary line only for groups (`ZMAN_GROUPS`) with a public,
verifiable custom; other groups keep the app's default. Candle lighting falls back to the place's city, then country.

| id | primary lines | source |
|---|---|---|
| ashkenaz | sofShmaGra, sofTfillaGra, plag | https://he.wikipedia.org/wiki/זמני_היום_בהלכה (sha'ah zmanit: Gra method, custom of many Ashkenazim) |
| mizrach | sofShmaMga, sofTfillaMga, plagMga | same page (dawn to nightfall: custom of Yemenite and Edot HaMizrach communities) |
| chabad | sofShmaGra, sofTfillaGra, plag | same page (Rabbi Shneur Zalman of Liadi ruled by the Gra method) |
| jerusalem | candles40 | https://he.wikipedia.org/wiki/הדלקת_נרות_שבת ; https://en.wikipedia.org/wiki/Shabbat_candles |

Place defaults: Jerusalem (and its neighbourhoods) community `jerusalem`, candles40; Petah Tikva candles40; Haifa
candles30; elsewhere in Israel candles20 (https://he.wikipedia.org/wiki/הדלקת_נרות_שבת); outside Israel candles18
(https://www.chabad.org/library/article_cdo/aid/529865/jewish/About-Lighting-Times.htm,
https://oukosher.org/halacha-yomis/light-shabbos-candles-eighteen-minutes-shkia-sunset).

### Sunrise/sunset refraction (ray-traced through a layered model atmosphere)

Every horizon event is the sun's upper limb at an apparent altitude A, with refraction R(A) found by tracing the
ray through a spherically stratified atmosphere (src/atmosphere.ts, src/horizon.ts); zenith = 90 - A + R(A) + 16'.

- Refraction integral R = integral of -r n' / (n + r n') dz over the ray's zenith angle z with n r sin z constant:
  Hohenkerk & Sinclair, NAO Technical Note 63 (1985), as in the Explanatory Supplement to the Astronomical Almanac
  (1992) sec. 3.28; below the horizon the ray descends to its tangent point and rises again (Auer & Standish,
  Astron. J. 119, 2000, 2472). Split at the layer boundaries, 8-point Gauss-Legendre per piece.
- Observer height and dip: Keller & Hall, Computers & Geosciences 26 (2000) 991-1000 and 161 (2022) 105044
  (https://doi.org/10.1016/j.cageo.2022.105044). The observer sits at the
  place's height; the dip of the sea-level horizon is traced in the same air (cos D = n(R_E) R_E / (n_0 r_0)), which
  reproduces the navigators' 1.76' sqrt(h) within 1%.
- Refractive index (optical, 0.574 um, with water vapour): Hohenkerk & Sinclair / IAU SOFA iauRefco form.
- Air: layers with T and water-vapour pressure linear in height, p hydrostatic (anchored at the observer).
  Israel and neighbours: monthly mean Bet Dagan radiosonde profiles (NOAA IGRA v2, ISM00040179, 1995-2024),
  00 UTC for sunrise and 12 UTC for sunset, blended between months (06/18 UTC launches exist but too few are
  complete for event-hour profiles). Elsewhere: AFGL standard profiles
  (Anderson et al. 1986: tropical; midlatitude or subarctic summer/winter blended by season). Bare coordinates:
  U.S. Standard Atmosphere 1976. The profile is moved to the place's own climate: T_place - T_profile at the
  observer's height applied at the observer and tapered off over 1.5 km above. Below the observer, Bet Dagan (a
  coastal-plain profile) keeps its own air under a 200 m surface layer over the observer's terrain, so the distant
  low horizon and the grazing ray's tangent point see the plain's air, not the hill's (dip and terrestrial
  refraction follow the eye-level vs horizon air difference: A. T. Young, aty.sdsu.edu); the generic profiles take
  the anomaly in full. T_place is the monthly mean 2 m temperature
  AT sunrise for sunrise-side lines and AT sunset for sunset-side lines (climate-sunevent.bin), against the traced
  profile itself; where unknown, the mean daily minimum / maximum, then the monthly mean (against the profile's daily
  mean).

Lines: sunrise/sunset = A 0 from the place's own height (a level plain at that height); Elevated = A = -dip to
the sea-level horizon (none at or below sea level); Terrain = A = the terrain horizon toward the sun (its altitudes
carry the place's terrestrial refraction, see Terrain horizon). Terrain lines in the Bet Dagan region trace the U.S.
Standard Atmosphere 1976 moved to the event-hour temperature, not the coastal soundings, and sunrise there is 15 s
earlier after a night over 13 h when the horizon at the sun is within 0.01 deg of level: the model and the
low-inversion lean that Keller & Hall (2022) checked against years of observed sunrises in Jerusalem and Bnei Brak
(about 15 s; the unchanged coastal soundings did worst at the Jerusalem site). Caveat: the 15 s is an EMPIRICAL
correction from those observations (Computers & Geosciences 161 (2022) 105044, section 3), not modelled physics; it
stands in for the ground temperature inversion of long winter nights, which is not modelled. It was validated only at
the Jerusalem observation sites (not Bnei Brak or other terrain), so elsewhere it is an extrapolation. It is on by
default; `configure({ empiricalInversionCorrection: false })` turns it off. Degree lines
(alot, misheyakir, tzeit) and chatzot are geometric. Checks (test/raytrace.test.ts): the refraction constant
(60.4" at 0 C) within 0.6%, Bennett within 0.12' from 5 to 60 deg, an independent step-by-step ray integration
within 0.05', the dip formula within 3%. A month of every zman for one place takes about 60 ms.

Stringent rounding: a start rounds up, a deadline rounds down; dawn and chatzot round down (earlier).
Accuracy: sunrise, sunset, solar noon and civil twilight agree with the US Naval Observatory's published times
within their whole-minute rounding (no bias); the sun position reproduces the NREL paper's worked example.

## Data

`data/places.tsv` is the source of truth: `id key he en lat lng elevation tzid` (tab separated, UTF-8).
Ids are stable: new places get new ids, an id is never reused (a removed place leaves its id empty).
`npm run build:assets` writes the shipped files into `assets/`:

| file | format |
|---|---|
| names-he.txt, names-en.txt | one name per line; line index = id (line 0 empty) |
| places.bin | record of 11 bytes per id at offset id*11 (record 0 unused), little endian: lat int32, lng int32 (degrees x 1e5), elevation int16 (m), tz index uint8 |
| climate.bin | 12 bytes per id at offset id*12 (record 0 unused): monthly mean temperature, int8 C, -128 = unknown |
| climate-sunevent.bin | 24 bytes per id at offset id*24 (record 0 unused): 12 monthly mean temperatures at sunrise, then 12 at sunset, int8 half degrees C (value / 2), -128 = unknown; loaded with climate.bin, optional (missing = min/max) |
| climate-minmax.bin | 24 bytes per id at offset id*24 (record 0 unused): 12 monthly mean daily minima, then 12 maxima, int8 C, -128 = unknown; fallback, loaded only for a place whose sunrise/sunset temperatures are incomplete (missing = mean) |
| atmosphere.bin | model atmospheres (scripts/build-atmosphere.mjs, workflow build-atmosphere): uint16 count, then per profile uint16 levels + float32 z m, T K, p hPa, e hPa; AFGL t, ms, mw, ss, sw, then Bet Dagan month 1..12 x {00, 12 UTC} |
| tz.json | `{ ids: [IANA zone...], rawOffsetMinutes: [...] }` (standard offset, for the antimeridian rule only) |

Sizes (1803 places): names-he 27436 B, names-en 23595 B, places.bin 19844 B, tz.json 2023 B, climate.bin 21648 B.

`data/climate.tsv` (id, 12 monthly means, 0.1 C) is made once by `node scripts/fetch-climate.mjs`: mean of the
daily mean 2 m temperature 2016-2025 from the Open-Meteo Historical Weather API at each place's elevation
(sequential, paused, resumable). It is not refetched by the normal build.
Every place has temperatures. For newly added places, run the fetch-climate-parallel workflow (or
`node scripts/fetch-climate.mjs`, which resumes from the rows already in data/climate.tsv), then rebuild the assets;
until then a new place uses the standard-atmosphere temperature (-128 in climate.bin).
`data/climate-minmax.tsv` (id, 12 monthly mean daily minima, 12 maxima, 0.1 C) is made the same way by
`scripts/fetch-climate-minmax.mjs` (workflow fetch-climate-minmax): daily minimum and maximum 2 m temperature 2016-2025,
same API and licence. climate-minmax.bin is 46536 B.
`data/climate-sunevent.tsv` (id, 12 monthly mean temperatures at sunrise, 12 at sunset, 0.1 C) comes from
`scripts/fetch-climate-sunevent.mjs` (workflow fetch-climate-sunevent, parallel runners): hourly 2 m temperature
2016-2025 (UTC), same API and licence, interpolated to each day's sunrise and sunset from this library's SPA and
averaged per month. Fetched once per 0.1 deg reanalysis cell; each place keeps its own level through
T_event(place) = T_mean(place) + T_event(cell) - T_mean(cell). climate-sunevent.bin is 46536 B.

`data/atmosphere.tsv` / `assets/atmosphere.bin` come from `scripts/build-atmosphere.mjs`, run by the
build-atmosphere workflow (it downloads the IGRA v2 station file and the AFGL profiles, both public domain).

### Terrain horizon (horizon-NN.bin)

`assets/horizon-NN.bin` (NN = id / 64, two digits): 64 places per file (row = id % 64), 242 int16 LE (484 bytes) per place =
the apparent altitude of the terrain horizon, hundredths of a degree, -32768 = no data;
bins: azimuth 30..150 then 210..330 (from north, eastward), one per degree. 15,488 bytes per file. Only the chosen
place's file loads, and only when sunriseTerrain/sunsetTerrain is asked for (`getTerrainHorizon(id)`); a place
added after the last data run has no row (its chunk may be missing) and those lines are null. The full-precision
source is `data/horizon.bin` (int16 hundredths, not shipped); `scripts/build-horizon-chunks.mjs` splits it, and a
bin steeper than 22.4 deg is left empty.
Made in CI (workflow horizon-parallel, scripts/compute-horizon.py + scripts/build-horizon.mjs) from the Copernicus
DEM GLO-90: a grey-scale opening of about 450 m removes buildings and trees from the surface model; from the highest
ground within 500 m of the place (+ 1.6 m eye height) rays every degree of azimuth sample the terrain from 500 m to 150 km; a point at
distance d and height H is seen at atan((H - h - d^2 (1 - k) / 2R) / d), R = 6371 km, with the place's terrestrial
refraction coefficient k = 503 P / T^2 (0.0342 - 0.0065) (Bomford, Geodesy, 1952, p. 158; standard lapse rate; P the
standard pressure at the eye, T the yearly mean of the monthly mean daily minimum: 0.15-0.18 in Israel), as
Keller & Hall (2022, eq. 1-2), whose check against ray tracing to the terrain agreed within 0.06'; the horizon is the highest such angle. The zman: refraction (refraction.ts) at that apparent altitude,
the sun's azimuth from SPA, iterated from the sea-level time.

data/places.tsv is the source of truth: built from open sources (GeoNames, Wikidata, the Israeli CBS list of localities, Open-Meteo elevations, seven OpenStreetMap points); edit the TSV and rebuild.

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
npm test          # vitest
```

## Credits and licenses

- Code: LGPL-2.1 (see LICENSE). The sun position is the clean-room NREL SPA (src/spa.ts, PROVENANCE.md). All code is this library's own; each zman is defined from the halachic sources cited
  beside it (in src/zmanim.ts, data/explanations.json and the docs).
- Place data: contains data from GeoNames (geonames.org), licensed under CC BY 4.0.
  Some neighbourhood coordinates come from Wikidata (CC0). Where Wikidata has no elevation, it comes from the
  Open-Meteo elevation API (CC BY 4.0), based on the Copernicus DEM GLO-90 (produced using Copernicus WorldDEM-90
  (c) DLR e.V. 2010-2014 and (c) Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European
  Union and ESA; all rights reserved).
- Israeli localities: some coordinates and elevations from the Israel Central Bureau of Statistics list of localities
  (2025). Time zones: IANA tz database (public domain). Full input-by-input list: SOURCES.md, "Data inputs and licences".
- Seven neighbourhood points (Ramat Beit Shemesh Aleph, Bet and Gimel, Nofei Aviv, Kiryat Sefer, Brachfeld,
  Green Park) (c) OpenStreetMap contributors, ODbL 1.0, https://www.openstreetmap.org/copyright. Their
  elevations come from the Open-Meteo elevation API (above).
- Terrain horizon (horizon-NN.bin): computed from the Copernicus DEM GLO-90, (c) DLR e.V. 2010-2014 and (c) Airbus
  Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA; all rights reserved.
  Free use under the Copernicus DEM licence (https://spacedata.copernicus.eu/documents/20123/121286/CSCDA_ESA_Mission-specific+Annex_31_Oct_22.pdf);
  tiles from the AWS Open Data registry (https://registry.opendata.aws/copernicus-dem/).
- Climate data (climate.bin, climate-minmax.bin, climate-sunevent.bin): weather data by Open-Meteo.com (https://open-meteo.com/), CC BY 4.0, from the
  ERA5 / ERA5-Land reanalysis by the Copernicus Climate Change Service (Hersbach et al. 2018, Munoz Sabater 2019).
  Contains modified Copernicus Climate Change Service information 2016-2025. Neither the European Commission nor ECMWF is
  responsible for any use that may be made of the Copernicus information or data it contains.
- Model atmospheres (atmosphere.bin): NOAA NCEI IGRA v2 (Durre et al. 2016), station ISM00040179 Bet Dagan, public
  domain; AFGL atmospheric constituent profiles (Anderson et al. 1986, AFGL-TR-86-0110), public domain.
- Refraction method: ray tracing after Hohenkerk & Sinclair (1985, NAO TN 63; Explanatory Supplement 1992 sec. 3.28),
  Auer & Standish (2000, AJ 119:2472), Keller & Hall (2000, Computers & Geosciences 26:991; 2022, 161:105044), Bomford (1952, Geodesy); U.S. Standard
  Atmosphere 1976. Reference only: Saemundsson (1986), Bennett (1982), Meeus (1998) ch. 16. Written independently from these publications.
