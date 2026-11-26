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
| `TZEIT_7083`: tzeit7083, plagAlot12Tzeit7083 | Melamed LeHo'il 1, siman 30 (letter of Dr. Baruch Cohn) | his twilight tables set three medium stars at the sun 7 deg 5 min below the horizon |
| `ALOT_12`: alot12, plagAlot12Tzeit7083 | Melamed LeHo'il 1, siman 30 (Dr. Baruch Cohn's letters) | the light over the whole east face is at the sun 12 deg below; he holds that is dawn and adds tables for it |

Status of this table: rows whose code comment says "checked in the text" were read in the books by an earlier session;
they were not reopened in the 2026-11-26 provenance check. Rows citing web articles are secondary only.

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

## Refraction model - design choices and their sources

Status: "verified" = the source itself was opened on the date given. "secondary only" = not reopened in the 2026-11-26
check (most publisher and DOI pages are not reachable from the maintainer's network); the citation is as written when
the model was built. No choice here was made to agree with any other calendar's times.

| Choice | Value | Source | Supporting statement | Status |
|---|---|---|---|---|
| Ray tracing instead of a closed formula | ray-traced R(A) | Young 2004 AJ 127:3622, doi:10.1086/420806; Schaefer & Liller 1990 PASP 102:796, doi:10.1086/132705; Young, aty.sdsu.edu/explain/sunset_time.html | refraction "depends on all the details of the temperature profile" (Young, web page) | verified (page opened 2026-11-26) for the web page; secondary only (citation as recorded in this repo; source not reachable for this check) for the journal papers |
| Day-to-day and seasonal variability of horizon refraction | - | Sampson, Lozowski, Peterson & Hube 2003, PASP 115:1256-1261, doi:10.1086/378214 | Edmonton timings: mean 0.669 deg, sd 0.175 deg; sunrise 0.714 deg > sunset 0.579 deg; largest in coldest months | secondary only (via indexed abstract/record, not opened) |
| Refraction integral in zenith angle | R = int -r n'/(n + r n') dz | Hohenkerk & Sinclair 1985, HM NAO Technical Note 63; Explanatory Supplement (Seidelmann ed. 1992) sec. 3.28 | integrand finite at the horizon | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Below-horizon rays (tangent point) | two branches from z = 90 deg | Auer & Standish 2000, AJ 119:2472-2474, doi:10.1086/301325 | method for all zenith angles | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Top of model atmosphere | 80 km | Hohenkerk & Sinclair 1985 | refraction above it negligible | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Refractive index of moist air | gamma, 11.2684e-6, 287.6155, 1.62887, 0.01360 | SOFA iauRefco (iausofa.org); Barrell & Sears 1939, Phil. Trans. R. Soc. A 238:1-64, doi:10.1098/rsta.1939.0004 | iauRefco dry term 77.53484e-6 = 287.6155 * 273.15e-6 / 1013.25 | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Effective wavelength | 0.574 um | - | Modelling choice, no single published value (near the eye's V(lambda) peak 0.555 um) | unsourced |
| Dry-air gas constant | 287.05287 J/(kg K) | ISO 2533:1975 | standard value | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Standard gravity | 9.80665 m/s^2 | 3rd CGPM 1901; U.S. Standard Atmosphere 1976 | defined value | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Earth radius | 6 371 008.8 m | Moritz 2000, J. Geodesy 74:128-133 (GRS 80 R1) | mean radius | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Standard atmosphere: lapse 6.5 K/km, exponent 5.25588, r0 6 356 766 m | as listed | U.S. Standard Atmosphere 1976, NOAA-S/T 76-1562 | standard values | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Generic profiles | AFGL t, ms, mw, ss, sw | Anderson et al. 1986, AFGL-TR-86-0110 | profiles at 15, 45, 60 N | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Profile latitude bands and season weight | 23.5 / 52 deg, cosine | - | Modelling choice, no single published value | unsourced |
| Israel profiles | Bet Dagan ISM00040179, 1995-2024, 00/12 UTC | NOAA NCEI IGRA v2 (doi:10.7289/V5X63K0Q); Durre, Vose & Wuertz 2006, J. Climate 19:53-68, doi:10.1175/JCLI3594.1 | public-domain radiosonde archive | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Climate period of the profiles | 1995-2024 | - | Modelling choice, no single published value (30-year span) | unsourced |
| Bet Dagan region box | 29-33.6 N, 34-36.2 E | - | Modelling choice, no single published value | unsourced |
| Saturation vapour pressure | 6.112 exp(17.62 t / (243.12 + t)) | WMO-No. 8, annex 4.B | Magnus formula over water | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Boundary layer taper | BOUNDARY_LAYER 1500 m | Stull 1988; Seidel, Ao & Li 2010 JGR 115 D16113, doi:10.1029/2009JD013680; Uzan, Egert & Alpert 2016 AMT 9:4387, doi:10.5194/amt-9-4387-2016; Uzan et al. 2020 ACP 20:12177-12192, doi:10.5194/acp-20-12177-2020 | Modelling choice, no single published value; inside published boundary-layer ranges | secondary only (via indexed abstract/record, not opened) (Uzan 2020); secondary only (citation as recorded in this repo; source not reachable for this check) (others) |
| Surface layer | SURFACE_LAYER 200 m | Stull 1988 ch. 12; Niedzwiedz, Lupikasza, Malarzewski & Budzik 2021, Theor. Appl. Climatol. 146:897-919, doi:10.1007/s00704-021-03752-4; Young, aty.sdsu.edu/explain/atmos_refr/dip.html | Modelling choice, no single published value; dip "depends almost entirely on the difference in temperature between the air at eye level" and the horizon | verified (page opened 2026-11-26) (Young page); secondary only (via indexed abstract/record, not opened) (Niedzwiedz) |
| Event-hour surface temperature | mean 2 m T at sunrise / sunset | Sampson et al. 2003 (above); Hersbach et al. 2020 QJRMS 146:1999-2049, doi:10.1002/qj.3803; Open-Meteo (Zippenfenig, open-meteo.com, CC BY 4.0) | refraction largest in cold air; ERA5 hourly 2 m T | secondary only (via indexed abstract/record, not opened) (Sampson); secondary only (citation as recorded in this repo; source not reachable for this check) (others) |
| Climate period of place temperatures | 2016-2025 | - | Modelling choice, no single published value (recent ten years) | unsourced |
| Terrestrial refraction to terrain | k = 503 P / T^2 (0.0342 + dT/dh) | Bomford, Geodesy (1952) p. 158; Keller & Hall 2022, Computers & Geosciences 161:105044, doi:10.1016/j.cageo.2022.105044, eq. 1-2 | coefficient from P, T, lapse rate | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Observer height and dip in the same atmosphere | cos dip = n(RE) RE / (n0 r0) | Keller & Hall 2000, Computers & Geosciences 26:991-1000; Keller & Hall 2022 (above) | traced dip | secondary only (via indexed abstract/record, not opened) (2000 citation seen in a published reference list) |
| Winter inversion lean | 15 s, night > 13 h, horizon <= 0.01 deg | Keller & Hall 2022 sec. 3 | empirical, Jerusalem sites only | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Dip reference check | 1.76' sqrt(h) | Bowditch, Pub. 9; Young dip page (1.75') | standard dip | verified (page opened 2026-11-26) (Young page) |
| Upper limb on the standard horizon | 16' + 34' = 0.8333 deg | Reda & Andreas 2008, NREL/TP-560-34302, A.2 | h'0 = -0.8333 deg | verified (paper read for spa.ts, see PROVENANCE.md) |
| Terrain model | Copernicus DEM GLO-90 | registry.opendata.aws/copernicus-dem | free use with attribution | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Terrain constants | EYE 1.6 m, MAX_KM 150, MIN_M 500, OPEN_CELLS 5 | - | Modelling choice, no single published value | unsourced |
| Numerics | 8-point Gauss-Legendre, anomaly step 0.5 K, height grid, SPA iterations 3 | Abramowitz & Stegun 1964, table 25.4 (nodes) | numerical choices | unsourced (choices) |
