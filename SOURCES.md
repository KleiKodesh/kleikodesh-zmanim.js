# Sources

Book citations behind the library's zman lines and constants. Paraphrased; nothing is copied from the books.
Page numbers are PDF page numbers of the HebrewBooks scans.

## Books

- **Birur Zmanim**, part 1 - R. Yaakov Beyer, Bnei Brak 5776. HebrewBooks 69317.
- **Birur Zmanim**, part 2 - R. Yaakov Beyer, Bnei Brak. HebrewBooks 69318.
- **Bein Hashmashot** - R. Yechiel Michel Tukachinsky, Jerusalem 1929. HebrewBooks 6656.
- **Shu"t Melamed LeHo'il**, part 1 (Orach Chaim) - R. David Zvi Hoffmann. Read in the Otzaria library text (by siman).

Not cited here, and not Birur Zmanim (earlier notes had them as copies of part 1): HebrewBooks 67371 is
*Achuzat Sadeh* on the times of the day, R. Shmuel David HaLevi Siegel, Baltimore 1980; HebrewBooks 65509 is a
2017 Monroe NY wedding booklet on the times and festivals of the year (Shabbat, Rosh Chodesh, Chanuka, Purim).

## Lines and constants

| Line / constant | Book and page | What it supports |
|---|---|---|
| `ALOT` (16.05 deg = equinoxDepression(72), exact): alot, alotChatzot, tzeitRt16, sofShmaMga16, sofTfillaMga16 | Birur Zmanim 1, p.66 | 72 minutes in Eretz Yisrael at the equinox is about 16 deg below the horizon, not 18 |
| `ALOT_90` (19.798 deg = equinoxDepression(90), exact): alot90, alot90Chatzot, sofShmaMga19, sofTfillaMga19, plagMga19 | Birur Zmanim 1, p.66 | 90 minutes is about 19.75 deg |
| `TZEIT_GEONIM` (3.701), `TZEIT_18_SUN` (4.6565), `BH_YEREIM` (2.992 above) | this library, `equinoxDepression` | the exact depth N minutes from visible sea-level sunset (sun centre -0.833 deg) at declination 0, Har HaBayit 31.778 N |
| alot90 and plagAlot90Tzeit645 | Bein Hashmashot, p.105 | his tables put dawn about an hour and a half before sunrise |
| sofShmaMga, sofTfillaMga, plagMga, sofShmaMga90, sofTfillaMga90, plagMga90 | Birur Zmanim 2, pp.209-239 | calendars rightly use a 90-minute dawn; "MGA" hours run from dawn to nightfall |
| Mil of 18 / 22.5 / 24 min: tzeitRt72, tzeitRt90, tzeitRt96, alot96, alot120, tzeit13p5 | Bein Hashmashot, pp.18-19; Birur Zmanim 2, pp.33-35 | 18 (Gra / Terumat HaDeshen line), 22.5 (Rashi, R. Chananel, most Rishonim), 24 (Ulla and Rava; Rambam) |
| `TZEIT_645`: tzeit645, plagAlot72Tzeit645 | Bein Hashmashot, pp.50, 67, 72 | three medium stars in Jerusalem about 22-28 minutes after sunset by season, average 25 |
| `BH_YEREIM`: beinHashmashotYereim | Bein Hashmashot, p.33; Birur Zmanim 2, pp.228-231 | the Yereim puts bein hashmashot before sunset; some were strict for it |
| sunriseElevated, sunsetElevated | Bein Hashmashot, p.105 | on Mount Carmel sunrise is under 3 minutes earlier and sunset 2-3 minutes later |
| `DIP_ARCMIN_PER_SQRT_M` (1.76'): reference check for the traced dip of sunriseElevated, sunsetElevated | Nautical Almanac dip table; Bowditch, The American Practical Navigator (Pub. 9), dip D = 1.76' sqrt(h m); A. T. Young, "Dip of the horizon" (aty.sdsu.edu/explain/atmos_refr/dip.html) | the visible horizon's dip includes terrestrial refraction; the geometric arccos(R/(R+h)) = 1.93' sqrt(h) is too large and put the elevated sunset about 0.45 min late at 750 m |
| tzeit40 | Birur Zmanim 2, p.18 | Chazon Ish: Yom Kippur ends 40 minutes after sunset, Shabbat 45, a brit 35 |
| tzeit45 | Birur Zmanim 2, p.18 | a Chazon Ish letter: his 45 minutes at the end of Shabbat include Rabbeinu Tam (via R. D. Frankel) |
| misheyakir66, misheyakir60, misheyakir40 | OU Kosher Halacha Yomis, outorah.org/p/78963 | 66 min: Pri Megadim, Eshel Avraham 58:2; about an hour: Rav Henkin (Ezras Torah luach, Teshuvot Ivra 3); 40 min: Rav Chaim Kanievsky (Igrot Moshe OC 4:6: 35-40) |
| `MISHEYAKIR_LECHUMRA` (10.5 deg): misheyakirLechumra | SA OC 18:3, 30:1, 58:1; en.wikipedia.org/wiki/Zmanim | misheyakir is when one recognises an acquaintance at 4 amot / tells tchelet from white; published angles span 10.2-11.5 deg, 10.5 is a later, stringent pick |
| tzeitGeonim, beinHashmashotRt | Birur Zmanim 2, pp.11-14 | the Minchat Kohen's reading of Rabbeinu Tam: nightfall when three stars are seen, bein hashmashot the quarter hour before |
| plag | Birur Zmanim 1, pp.320-321; Birur Zmanim 2, pp.257-268 | plag is 1.25 hours before the end of the day |
| `TZEIT_18_SUN`: tzeit18, tzeit18Sun | Bein Hashmashot, pp.71-72 | Jerusalem batei midrash pray maariv 17-18 minutes after sunset, per R. Shmuel Salant |
| `TZEIT_7083`: tzeit7083, plagAlot12Tzeit7083 | Melamed LeHo'il 1, siman 30 (letter of Dr. Baruch Cohn); also Hebcal (hebcal.com/home/4463) | his twilight tables set three medium stars at the sun 7 deg 5 min below the horizon |
| `ALOT_12`: alot12, plagAlot12Tzeit7083 | Melamed LeHo'il 1, siman 30 (Dr. Baruch Cohn's letters) | the light over the whole east face is at the sun 12 deg below; he holds that is dawn and adds tables for it |

## Not confirmed

The lines described only by their definition (the Harari 25 / 40, Hillel and asymmetric day lines) stay unnamed:
these books do not support those attributions.

| Line | Source (secondary, not checked in the text) | What it supports |
|---|---|---|
| plagAlotTzeitGeonim | Zemaneh Yosef website (github.com/Zemaneh-Yosef/royzmanimwebsite, _includes/zmanDescription/plagHamincha.md; no license file, so facts and citations only, no text copied) | contemporary authorities count the seasonal hours from dawn but end the day at the Geonim's 13.5-minute nightfall (Ben Ish Chai year 1, Vayakhel 8; Or LeTzion vol. 2 p.147; Ma'amar Mordechai vol. 4 siman 12); it suggests plag at the 10.75th hour of that day as a stringency |

Dr. Cohn's letter in Melamed LeHo'il is signed from Rawitsch; he later worked at the Strasbourg observatory, where his
1899 tables ("Tabellen enthaltend die Zeitangaben fuer den Beginn der Nacht und des Tages") appeared. The siman does not
name those tables or a Strasbourg custom; the tables themselves were not seen.

## Horizon refraction (all sunrise/sunset lines)

Ray-traced through a layered model atmosphere (src/atmosphere.ts, src/horizon.ts). Written independently from:

- C. Y. Hohenkerk & A. T. Sinclair, The computation of angular atmospheric refraction at large zenith angles, HM
  Nautical Almanac Office, NAO Technical Note 63 (1985); P. K. Seidelmann (ed.), Explanatory Supplement to the
  Astronomical Almanac (1992), sec. 3.28 - the refraction integral in zenith angle and the optical refractive index.
- L. H. Auer & E. M. Standish, Astronomical refraction: computational method for all zenith angles, Astronomical
  Journal 119 (2000) 2472-2474 - rays below the horizon (tangent point).
- C. Keller & J. K. Hall, Using a digital terrain model to calculate visual sunrise and sunset times, Computers &
  Geosciences 26 (2000) 991-1000 - sunrise over a terrain horizon, negative apparent altitudes.
- C. Keller & J. K. Hall, Using a ray tracing program to calculate sunrise times over a digital terrain model based
  visible horizon using a simplified atmospheric model, part II, Computers & Geosciences 161 (2022) 105044,
  https://doi.org/10.1016/j.cageo.2022.105044 (open access) - observer height, dip, terrestrial refraction to the
  terrain (Bomford's formula), standard column at the minimum temperature, the winter low-inversion lean (15 s after
  nights over 13 h on a level horizon), all checked against observed sunrises in Jerusalem and Bnei Brak.
  Caveat: the 15 s lean is an EMPIRICAL correction from those observations (section 3), not modelled physics; it
  stands in for the unmodelled ground temperature inversion of long winter nights, is validated only at the
  Jerusalem observation sites (not Bnei Brak or other terrain), so applying it elsewhere is an extrapolation. On by
  default; configure({ empiricalInversionCorrection: false }) turns it off.
- G. Bomford, Geodesy, Clarendon Press, Oxford (1952) p. 158 - coefficient of terrestrial refraction from P, T, dT/dh.
- U.S. Standard Atmosphere 1976 (NOAA/NASA/USAF); G. P. Anderson et al., AFGL atmospheric constituent profiles
  (0-120 km), AFGL-TR-86-0110 (1986).
- NOAA NCEI Integrated Global Radiosonde Archive v2 (I. Durre et al. 2016, doi:10.7289/V5X63K0Q), station
  ISM00040179 Bet Dagan, 1995-2024 (scripts/build-atmosphere.mjs).
- Magnus formula for saturation vapour pressure: WMO-No. 8 (Guide to Instruments and Methods of Observation), annex 4.B.
- Place temperatures (climate.bin: monthly mean; climate-sunevent.bin: monthly mean at the hour of sunrise and of
  sunset, from hourly data; climate-minmax.bin: monthly mean daily minimum and maximum, the fallback): Open-Meteo Historical Weather API (open-meteo.com, CC BY 4.0), ERA5 / ERA5-Land reanalysis by the
  Copernicus Climate Change Service (Hersbach et al. 2018, Munoz Sabater 2019; Copernicus licence), 2016-2025, at each
  place's own elevation (scripts/fetch-climate.mjs, scripts/fetch-climate-sunevent.mjs, scripts/fetch-climate-minmax.mjs). Chosen over WorldClim 2.1
  normals (CC BY 4.0, 1970-2000) and GHCN station normals (stations only, uneven coverage): recent, every place alike,
  and consistent with the mean already used. Cold, dense air refracts more; the air of the event's own hour is used
  because sunset comes hours after the daily maximum, when the air near the ground has already cooled.
