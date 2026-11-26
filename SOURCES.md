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
| misheyakir66, misheyakir60, misheyakir40 | Igrot Moshe OC 4:6 (40 min with misheyakir - checked in the text); Pri Megadim, Eshel Avraham 58:2 and Teshuvot Ivra 3 not confirmed; see also (secondary) OU Kosher Halacha Yomis, outorah.org/p/78963 | 66 min: Pri Megadim; about an hour: Rav Henkin; 40 min: Rav Chaim Kanievsky (secondary only) |
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
| plagAlotTzeitGeonim | Ben Ish Chai year 1, Vayakhel (plag and dawn discussed - located in the text); Or LeTzion vol. 2 p.147; Ma'amar Mordechai vol. 4 siman 12 (not opened) | hours counted from dawn, the day ending at the Geonim's 13.5-minute nightfall; plag at its 10.75th hour as a stringency. Not confirmed in a primary text |

Dr. Cohn's letter in Melamed LeHo'il is signed from Rawitsch; he later worked at the Strasbourg observatory, where his
1899 tables ("Tabellen enthaltend die Zeitangaben fuer den Beginn der Nacht und des Tages") appeared. The siman does not
name those tables or a Strasbourg custom; the tables themselves were not seen.

## Halachic sources

Checked 2026-11-26 in the local seforim library (Otzaria-based seforim.db): the cited siman / daf / perek was located and
the key words of the statement were found in it. Sefaria could not be reached from the maintainer's network, so no row is
"verified Sefaria". Books not in that library are marked as read earlier from the scan, or not found.

| Line | Value | Primary source (exact location) | Status |
|---|---|---|---|
| alot, alot72z, fastStart72, MGA lines | dawn 4 mil = 72 min | Pesachim 93b-94a (R. Yehuda, 4 mil); SA OC 459:2 and MB 459:15 (mil = 18 min); Biur Halacha 89:1 (sha'a vechomesh) | verified local seforim |
| alot90, alot90z, *Mga90, *Mga19 | dawn 5 mil = 90 min | Pesachim 93b (R. Yochanan, 5 mil); MB 459:15 | verified local seforim |
| alot96, tzeitRt96 | 4 mil of 24 min | SA HaRav OC 89:1 (dawn 4 mil before netz); OC 261:5 (Rabbeinu Tam, 4 mil); OC 459:10 (24-min mil) | verified local seforim (89:1, 261:5); 459:10 section located, "24 minutes" wording not matched |
| alot120, *Mga120, tzeit18 | mil of 24 min | Rambam, commentary on Mishna Pesachim 3:2 (mil = two fifths of an hour) | verified local seforim |
| alot, alot90 (degrees) | 16.05 / 19.798 deg | Derived: depth of the sun 72 / 90 min before visible sunrise in Jerusalem at the equinox (equinoxDepression); Birur Zmanim 1 p.66 (about 16 / 19.75 deg) | derived; Birur Zmanim read earlier from the scan, not reopened |
| sofShma*, sofTfilla* | 3 / 4 hours | Mishna Berachot 1:2, 4:1; SA OC 58:1, 89:1 | verified local seforim |
| MGA vs Gra day | dawn-nightfall vs sunrise-sunset | Magen Avraham 58:1; Mishna Berura 58:4 | verified local seforim |
| minchaGedola, minchaKetana, plag | 6.5 / 9.5 / 10.75 h | Rambam Tefilla 3:2, 3:4; SA OC 233:1; MB 233:1 (half hour after midday) | verified local seforim |
| temporal hours | 1/12 of the day | SA OC 233:1 (Rema); Aruch HaShulchan OC 233:14 | verified local seforim |
| *Fixed lines, chatzotFixedLocal | clock hours | Aruch HaShulchan OC 233:14; Igrot Moshe OC 1:24 (chatzot) | verified local seforim (keywords found; the fixed-hour reading is our summary) |
| tzeitGeonim, tzeit13p5, beinHashmashotRt | 3/4 mil = 13.5 min | Shabbat 34b (Rabba in the name of Shmuel); SA OC 261:2 | verified local seforim |
| tzeitGeonim (degrees) | 3.701 deg | Derived: equinoxDepression(13.5) | derived |
| tzeitRt72, tzeitRt90 | 4 mil after sunset | Tosafot Shabbat 35a; SA OC 261:2 with Rema; Igrot Moshe OC 4:62 (72 and 96 min) | verified local seforim |
| tzeit (8.5), tzeit7083 | three medium stars | Shabbat 35b (medium stars); Biur Halacha 293:2 (small stars) | verified local seforim |
| tzeit 8.5 deg | 8.5 deg | commonly attributed to R. Yechiel Michel Tukachinsky (about 36 min after sunset in Jerusalem) | attribution as commonly stated; his own text not yet located (local seforim searched 2026-11-26) |
| tzeit7083, alot12 | 7 deg 5 min / 12 deg | Melamed LeHo'il 1:30 (Dr. B. Cohn's letters) | verified local seforim |
| tzeit645 | 6.45 deg | Bein Hashmashot (Tukachinsky) pp.50, 67, 72 (25 min average); the 6.45 deg angle itself: "Birur Halacha YD 262" as cited - that book is R. B. Zilber's, not R. Tukachinsky's, attribution unclear | Bein Hashmashot read earlier from the scan; angle not found |
| tzeit18, tzeit18Sun | 18 min / 4.6565 deg | Bein Hashmashot pp.71-72 (R. Shmuel Salant); Derived: equinoxDepression(18) | read earlier from the scan; degree derived |
| beinHashmashotYereim | 2.992 deg above | Sefer Yereim (bein hashmashot before sunset); Derived: equinoxDepression(-18) | Yereim text located (bein hashmashot passages, siman not pinned); degree derived |
| tzeit40, tzeit45 | 40 / 45 min | Birur Zmanim 2 p.18 (Chazon Ish) | read earlier from the scan |
| tzeit50 | 50 min | Igrot Moshe OC 4:62 ("50 minutes") | verified local seforim |
| tzeit20, tzeit24, tzeit30 | fixed margins | community custom | not found (no single source) |
| tzeit13p5z | 13.5 seasonal min | Kitzur Shulchan Aruch Yalkut Yosef (OC volume) | verified local seforim (statement found; siman not pinned) |
| misheyakir (11.5 / 11 / 10.2 / 10.5 deg) | angles | Berachot 9b; SA OC 18:3, 30:1, 58:1 (criterion only); angles 11.5 (= 52 min in Jerusalem), 11, 10.2: R. Y. Goldstein, shulchanaruchharav.com "What time in the morning may one begin to don Tefillin" fn. 16, citing Kovetz Otzros Yerushalayim; 10.5: none | criterion verified local seforim; 11.5 / 11 / 10.2 secondary only (article opened 2026-11-26; Otzros Yerushalayim not opened, no posek named for 11 / 10.2); 10.5 modelling choice, not found |
| misheyakir7p65 | 7.65 deg | Igrot Moshe OC 4:6 (40 min found; 35 not matched); Derived: depth about 36 min before sunrise | partly verified local seforim; degree derived |
| misheyakir12p85 | 12.85 deg | Birur Halacha (Zilber) OC 18 | not found |
| misheyakir66 | 66 min | Pri Megadim, Eshel Avraham 58:2 | siman located, statement not confirmed |
| misheyakir60 | 60 min | Rav Henkin, Teshuvot Ivra 3 | not found |
| misheyakir40 | 40 min | Rav Chaim Kanievsky; Igrot Moshe OC 4:6 | Kanievsky secondary only; Igrot Moshe verified local seforim |
| Baal HaTanya lines | 16.9 / 6 / 1.583 deg | SA HaRav OC 89:1, 261:5 (time-based only) | angles secondary only (chabad.org 3209349, no primary cited) |
| Ben Ish Chai lines | dawn to nightfall, nightfall 20 min | Ben Ish Chai year 1, Vayakhel ("a third of an hour") | verified local seforim |
| Harari 25 / 40, Hillel 3.8, Asym | as defined | none checked (Yisrael Vehazmanim III:22 cited for Asym) | not found (Hillel 3.8: local seforim searched 2026-11-26) |
| chatzotNight | midnight | Berachot 3b (harp at midnight); SA OC 235:3 | verified local seforim |
| candles18-40 | fixed minutes | SA OC 261:2, 263 (adding to Shabbat; lighting) - minutes are custom | verified local seforim (principle only) |
| chametz times | end of 4th / 5th hour | Mishna Pesachim 1:4; SA OC 443:1 | verified local seforim |
| fastStart | dawn | SA OC 564:1 | verified local seforim |
| Kiddush Levana | 3 / 7 days; half month; 15 days | SA OC 426:3-4 with Rema; MB 426:17, 426:20; Rambam Kiddush HaChodesh 6:2-3, 6:8 | verified local seforim (426:4 "seven days" wording not matched) |
| alot12 | whole east lit | Yerushalmi Berachot 1:1 | verified local seforim |

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
| Ray tracing instead of a closed formula | ray-traced R(A) | Young 2004 AJ 127:3622, doi:10.1086/420806; Schaefer & Liller 1990 PASP 102:796, doi:10.1086/132705; Young, aty.sdsu.edu/explain/sunset_time.html | refraction "depends on all the details of the temperature profile" (Young, web page) | verified: Young web page (opened 2026-11-26); Young 2004 and Schaefer & Liller 1990 full text (inversions and near-surface lapse rate dominate horizon refraction; CI run 45789903306, 2026-11-26) |
| Day-to-day and seasonal variability of horizon refraction | - | Sampson, Lozowski, Peterson & Hube 2003, PASP 115:1256-1261, doi:10.1086/378214 | Edmonton timings: mean 0.669 deg, sd 0.175 deg; sunrise 0.714 deg > sunset 0.579 deg; largest in coldest months | verified: Sampson et al. 2003 abstract and table 1 (0.669 / 0.175; sunrise 0.714, sunset 0.579; CI run 45789903306, 2026-11-26) |
| Refraction integral in zenith angle | R = int -r n'/(n + r n') dz | Hohenkerk & Sinclair 1985, HM NAO Technical Note 63; Explanatory Supplement (Seidelmann ed. 1992) sec. 3.28 | integrand finite at the horizon | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Below-horizon rays (tangent point) | two branches from z = 90 deg | Auer & Standish 2000, AJ 119:2472-2474, doi:10.1086/301325 | method for all zenith angles | verified: Auer & Standish 2000 full text (method for all zenith angles, tables to z = 91 deg; CI run 45789903306, 2026-11-26) |
| Top of model atmosphere | 80 km | Hohenkerk & Sinclair 1985 | refraction above it negligible | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Refractive index of moist air | gamma, 11.2684e-6, 287.6155, 1.62887, 0.01360 | SOFA iauRefco (iausofa.org); Barrell & Sears 1939, Phil. Trans. R. Soc. A 238:1-64, doi:10.1098/rsta.1939.0004 | iauRefco dry term 77.53484e-6 = 287.6155 * 273.15e-6 / 1013.25 | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Effective wavelength | 0.574 um | - | Modelling choice, no single published value (near the eye's V(lambda) peak 0.555 um) | unsourced |
| Dry-air gas constant | 287.05287 J/(kg K) | ISO 2533:1975 | standard value | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Standard gravity | 9.80665 m/s^2 | 3rd CGPM 1901; U.S. Standard Atmosphere 1976 | defined value | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Earth radius | 6 371 008.8 m | Moritz 2000, J. Geodesy 74:128-133 (GRS 80 R1) | mean radius | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Standard atmosphere: lapse 6.5 K/km, exponent 5.25588, r0 6 356 766 m | as listed | U.S. Standard Atmosphere 1976, NOAA-S/T 76-1562 | standard values | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Generic profiles | AFGL t, ms, mw, ss, sw | Anderson et al. 1986, AFGL-TR-86-0110 | profiles at 15, 45, 60 N | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Profile latitude bands and season weight | 23.5 / 52 deg, cosine | - | Modelling choice, no single published value | unsourced |
| Israel profiles | Bet Dagan ISM00040179, 1995-2024, 00/12 UTC | NOAA NCEI IGRA v2 (doi:10.7289/V5X63K0Q); Durre, Vose & Wuertz 2006, J. Climate 19:53-68, doi:10.1175/JCLI3594.1 | public-domain radiosonde archive | verified: IGRA v2 dataset page (doi:10.7289/V5X63K0Q; CI run 45789903306, 2026-11-26); Durre et al. 2006 citation metadata verified (Crossref) |
| Climate period of the profiles | 1995-2024 | - | Modelling choice, no single published value (30-year span) | unsourced |
| Bet Dagan region box | 29-33.6 N, 34-36.2 E | - | Modelling choice, no single published value | unsourced |
| Saturation vapour pressure | 6.112 exp(17.62 t / (243.12 + t)) | WMO-No. 8, annex 4.B | Magnus formula over water | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Boundary layer taper | BOUNDARY_LAYER 1500 m | Stull 1988; Seidel, Ao & Li 2010 JGR 115 D16113, doi:10.1029/2009JD013680; Uzan, Egert & Alpert 2016 AMT 9:4387, doi:10.5194/amt-9-4387-2016; Uzan et al. 2020 ACP 20:12177-12192, doi:10.5194/acp-20-12177-2020 | Chosen within the published range: Uzan et al. 2020, "the average summer PBL height is under 2 km a.s.l." in Israel, ~250 m lower at the shoreline | verified: Uzan et al. 2020 full text (summer PBL height under 2 km a.s.l.; ~250 m lower at the shoreline; CI run 45789903306, 2026-11-26); other citations metadata verified (Crossref) |
| Surface layer | SURFACE_LAYER 200 m | Stull 1988 ch. 12; Niedzwiedz, Lupikasza, Malarzewski & Budzik 2021, Theor. Appl. Climatol. 146:897-919, doi:10.1007/s00704-021-03752-4; Young, aty.sdsu.edu/explain/atmos_refr/dip.html | Chosen within the published range: Niedzwiedz et al. 2021, "the depth of 81% of inversions ranged between 50 and 300 m"; dip "depends almost entirely on the difference in temperature between the air at eye level" and the horizon | verified (page opened 2026-11-26) (Young page); secondary only (via indexed abstract/record, not opened) (Niedzwiedz) |
| Event-hour surface temperature | mean 2 m T at sunrise / sunset | Sampson et al. 2003 (above); Hersbach et al. 2020 QJRMS 146:1999-2049, doi:10.1002/qj.3803; Open-Meteo (Zippenfenig, open-meteo.com, CC BY 4.0) | refraction largest in cold air; ERA5 hourly 2 m T | verified: Sampson et al. 2003 abstract (refraction largest in the coldest months; CI run 45789903306, 2026-11-26); ERA5 citation metadata verified (Crossref); minimum temperature for sunrise: Keller & Hall 2022 Fig. 3 caption ("The WorldClim monthly minimum temperatures were used for ground temperatures"), full text verified |
| Climate period of place temperatures | 2016-2025 | - | Modelling choice, no single published value (recent ten years) | unsourced |
| Terrestrial refraction to terrain | k = 503 P / T^2 (0.0342 + dT/dh) | Bomford, Geodesy (1952) p. 158; Keller & Hall 2022, Computers & Geosciences 161:105044, doi:10.1016/j.cageo.2022.105044, eq. 1-2 | coefficient from P, T, lapse rate | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Observer height and dip in the same atmosphere | cos dip = n(RE) RE / (n0 r0) | Keller & Hall 2000, Computers & Geosciences 26:991-1000; Keller & Hall 2022 (above) | traced dip | secondary only (via indexed abstract/record, not opened) (2000 citation seen in a published reference list) |
| Winter inversion lean | 15 s, night > 13 h, horizon <= 0.01 deg | Keller & Hall 2022 sec. 3 | empirical, Jerusalem sites only | verified: Keller & Hall 2022 full text, sec. 3 p. 5-6: "(1) nights longer than 13 h, and (2) the sun rose that day over terrain with a near horizontal view angle of 0.01 or less"; 15 s subtracted on those days (Fig. 3 caption) |
| Dip reference check | 1.76' sqrt(h) | Bowditch, Pub. 9; Young dip page (1.75') | standard dip | verified (page opened 2026-11-26) (Young page) |
| Upper limb on the standard horizon | 16' + 34' = 0.8333 deg | Reda & Andreas 2008, NREL/TP-560-34302, A.2 | h'0 = -0.8333 deg | verified (paper read for spa.ts, see PROVENANCE.md) |
| Terrain model | Copernicus DEM GLO-90 | registry.opendata.aws/copernicus-dem | free use with attribution | secondary only (citation as recorded in this repo; source not reachable for this check) |
| Terrain constants | EYE 1.6 m, MAX_KM 150, MIN_M 500, OPEN_CELLS 5 | - | Modelling choice, no single published value | unsourced |
| Numerics | 8-point Gauss-Legendre, anomaly step 0.5 K, height grid, SPA iterations 3 | Abramowitz & Stegun 1964, table 25.4 (nodes) | numerical choices | unsourced (choices) |

## Data inputs and licences

Every data input of the library, the script that reads it (file:line of the request or read), its upstream source and
licence, and what attribution the licence asks for. Licence status checked online on 2026-11-26 where the page was
reachable. The library code is LGPL-2.1; the data below is distributed with it under its own terms (README "Credits
and licenses" carries the required notices).

| Input | Built by | Upstream source | Licence | Attribution required | Status |
|---|---|---|---|---|---|
| places.tsv ids 1-564 (names he/en, lat, lng, elevation, tzid) | not in this repo: imported from the KitveiHakodesh app (commit a0a2e44), whose list was built from GeoNames (app commit b4f6d2c2) | GeoNames (geonames.org) | CC BY 4.0 (geonames.org/about.html, checked) | yes: credit GeoNames + licence | GAP: build script, dump file and date not kept; per-column origin (Hebrew names, elevation) not recorded |
| places.tsv ids 565-1802 (names, coords, elevation, tzid) | scripts/places-pass.mjs (Wikidata search :77, labels :86; Open-Meteo elevation :145) | Wikidata; Open-Meteo elevation API (Copernicus DEM GLO-90) | Wikidata CC0 (checked); Open-Meteo CC BY 4.0 (checked) | Wikidata none; Open-Meteo yes + Copernicus DEM notice | traced; tzid assignment method not stated in the script header |
| places.tsv Lucerne and hand-picked rows | scripts/places-lookup.mjs (:28, :33 Wikidata; :42 Open-Meteo) | Wikidata; Open-Meteo | CC0; CC BY 4.0 | as above | traced (human picked from lookup output) |
| places.tsv 128 Israeli localities (commits 929bb4d, 1bd76a4) | no script in repo (coords converted from the Israeli grid; elevation = CBS average height) | Israel Central Bureau of Statistics localities list 2025 | CBS open licence v2.1 (3 Jan 2016): worldwide, royalty-free, commercial use and derivative works allowed; no implied endorsement; facts and data themselves carry no copyright | credit CBS with file name, retrieval date, link and "as is" (see README) | verified (licence text read 2026-11-26); no import script kept |
| places.tsv ids 1804-1810 (coords, names) | scripts/osm-lookup.mjs (Overpass :23, Nominatim :45, elevation :57) | OpenStreetMap; Open-Meteo elevation | ODbL 1.0; CC BY 4.0 | yes: "(c) OpenStreetMap contributors" | traced (PROVENANCE.md); 7 features < 100 = insubstantial under OSMF guideline (checked), so no share-alike on places.tsv, provided no further OSM extracts are added |
| places.tsv Hebrew names (spelling fixes) | scripts/check-he-names.mjs (Wikidata :11) | Wikidata labels, Hebrew Wikipedia titles | CC0 (labels); titles are facts | none | traced (check only; fixes by hand) |
| places.tsv tzid | as for the rows above | IANA tz database zone names | public domain | none | partly traced (see gaps) |
| assets/tz.json (standard offsets) | scripts/build-assets.mjs:14-16, :73 (Intl.DateTimeFormat of the build Node/ICU) | IANA tz database via ICU | public domain (tzdb); ICU Unicode licence for ICU itself, not shipped | none | traced |
| assets/places.bin, names-he.txt, names-en.txt | scripts/build-assets.mjs:5, :45-47 | data/places.tsv | as places.tsv | as places.tsv | traced |
| assets/geo.bin, countries.json | scripts/build-geo.mjs:39, :41, :79-80 | places.tsv, data/geo-aliases.tsv (hand-written), ZONE_COUNTRY map (hand-written in the script); ISO 3166 codes | own work; ISO codes are facts | none | traced |
| data/climate.tsv -> climate.bin | scripts/fetch-climate.mjs:37; build-assets.mjs:50, :54 | Open-Meteo Historical Weather API, ERA5/ERA5-Land (C3S), 2016-2025 | CC BY 4.0 (checked) + Copernicus C3S licence (checked) | yes: Open-Meteo credit; "Contains modified Copernicus Climate Change Service information [year]" + EC/ECMWF disclaimer | traced |
| data/climate-minmax.tsv -> climate-minmax.bin | scripts/fetch-climate-minmax.mjs:34; build-assets.mjs:59, :63 | same | same | same | traced |
| data/climate-sunevent.tsv -> climate-sunevent.bin | scripts/fetch-climate-sunevent.mjs:87; build-assets.mjs:68, :72 | same (hourly) | same | same | traced |
| data/atmosphere.tsv -> atmosphere.bin | scripts/build-atmosphere.mjs:43 (AFGL), :89 (IGRA), :168, :176 | AFGL profiles (Anderson et al. 1986), read from the copies shipped with libRadtran; NOAA NCEI IGRA v2 station ISM00040179 | U.S. government works, public domain | none required (citation given) | traced; the AFGL .dat copies come from libRadtran (GPL) but are the AFGL public-domain data, no libRadtran code used |
| U.S. Standard Atmosphere 1976 constants | src/atmosphere.ts, src/refraction.ts (constants) | NOAA-S/T 76-1562 | U.S. government work, public domain | none | traced (citation) |
| data/horizon.bin -> horizon-NN.bin | scripts/compute-horizon.py:52 (DEM tiles), build-horizon.mjs:10, :16, build-horizon-chunks.mjs:8, :19 | Copernicus DEM GLO-90, AWS Open Data registry | Copernicus DEM licence (free use, redistribution of derived products allowed with notice) | yes: DLR/Airbus/EU-ESA notice (README) | traced; licence page not re-fetched this time |
| Default Delta T table | src/spa.ts:49-50 (hand-entered) | IERS Rapid Service/Prediction Center (USNO) deltat data, IERS Bulletin A | USNO: U.S. government work, public domain; IERS products freely usable with citation | citation (given in spa.ts) | traced |
| Default Delta T polynomial | src/spa.ts | Espenak & Meeus, NASA/TP-2006-214141 | U.S. government work, public domain | none | traced (PROVENANCE.md) |
| data/communities.json -> assets/communities.json | scripts/build-communities.mjs:4, :11 | own text; facts cited from Hebrew Wikipedia, chabad.org, oukosher.org (URLs in placeSources/sources; no text copied) | own work | none (sources dropped from the asset, kept in data/) | traced |
| data/explanations.json -> docs/zmanim*.md | scripts/build-explanations.mjs:4, :19 | own text; halachic sources in this file | own work | none | traced; documentation only, not shipped |
| references/README.md, citations | scripts/collect-references.mjs, verify-citations.mjs, check-claims.mjs | Crossref, OpenAlex metadata (links only) | Crossref metadata CC0; OpenAlex CC0 | none | traced; not shipped |

Gaps and conflicts:

- GAP: places.tsv ids 1-564 - the GeoNames import script, dump name and date were not kept in this repo; which column
  came from GeoNames (Hebrew names via alternate names? elevation via GeoNames dem/elevation?) is not recorded.
- GAP: the 128 CBS localities (commits 929bb4d, 1bd76a4) have no import script kept. Their licence (CBS open licence
  v2.1) allows this use with attribution, given in README.
- No licence conflicts with LGPL-2.1 found: CC BY 4.0 and the Copernicus licences only add attribution; CC0 and public
  domain add nothing. ODbL share-alike does not apply while OSM use stays an insubstantial extract (7 features, one-off);
  adding more OSM points over time would count together and could make places.tsv an ODbL derived database.
