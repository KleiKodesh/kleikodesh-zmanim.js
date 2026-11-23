# Provenance of src/spa.ts

## What

`src/spa.ts` (Solar Position Algorithm: sun position, equation of time, sun transit, rise/set at
any angle) and its tests `test/spa.test.ts`. Written on 2026-11-23 by Claude Code (AI assistant)
for KleiKodesh, from scratch.

## The single source

Ibrahim Reda and Afshin Andreas, "Solar Position Algorithm for Solar Radiation Applications",
National Renewable Energy Laboratory (now the National Laboratory of the Rockies), Technical
Report NREL/TP-560-34302, revised January 2008.

- URL: https://docs.nlr.gov/docs/fy08osti/34302.pdf
- Downloaded manually by the maintainer in a browser on 2026-11-23 (not by the AI).
- File size: 1272380 bytes.
- SHA-256: 0860fa6039bbc33071523456ada989e73ca5874c4c993e28a2166444a724e9cd (checked before use).
- Cross-check 2026-11-23: two further official copies (https://www.nlr.gov/docs/fy08osti/34302.pdf and the OSTI
  copy https://www.osti.gov/servlets/purl/15003974, byte-identical to each other, SHA-256
  1b9e2b6131d89ebc17fe4c047e64a0168143c949bfe6fafe06d856d651555cc2) have the same size (1,272,380 bytes) and the
  same extracted text (pdftotext output identical, 7,995 words) as the copy used; only internal PDF bytes differ
  (per-download document identifiers). The content used is therefore the official paper.
- The PDF is not stored in this repository.

## Method

- Title, authors and report number were confirmed from the PDF's text first.
- The PDF's text was extracted locally with pdftotext. Equations of sections 3.1-3.16 and
  appendix A.1-A.2 were written into TypeScript from that text; each step carries a comment with
  the paper's section/equation number.
- Table A4.2 (Earth periodic terms) and Table A4.3 (nutation terms) were transcribed from the
  PDF text by a small script; row numbers and row counts were checked (L0 64, L1 34, L2 20, L3 7,
  L4 3, L5 1, B0 5, B1 2, R0 40, R1 10, R2 6, R3 2, R4 1; nutation 63 rows). Blank cells of
  Table A4.3 were placed into their columns using the PDF's column layout and set to 0.
- Equation 4 (Julian Day) is an image in the PDF and was not read. Instead the Julian Day is
  counted from the UTC epoch, anchored to the paper's Table A4.1 entry JD 2451545.0 =
  2000-01-01 12:00 UT, and checked against the Gregorian rows of Table A4.1. Dates before
  1582-10-15 (the paper's Julian-calendar branch) are not supported.
- Debugging was done only against the paper's own published values.
- Documented departures (see the header of src/spa.ts): right-ascension differences in A.2.10
  are wrapped into [-180, 180); the A.2 correction step can be repeated and can use topocentric
  positions (off by default, so the defaults are the paper's procedure); refraction (eq 42) is
  applied while the true elevation is above -(0.26667 + 0.5667) degrees, our reading of "below
  the horizon".
- Default deltaT: F. Espenak and J. Meeus, "Five Millennium Canon of Solar Eclipses: -1999 to
  +3000", NASA/TP-2006-214141 (2006), polynomial expressions for Delta T (formula text only, from
  the AI's general knowledge of the publication; no code from anywhere).

## Not consulted

No other implementation or data was opened, read, searched or fetched: no git history or files
of KleiKodesh/KleiKodeshProject's hebrew-calendar folder (spaCalculator.ts, spaTables.ts,
solarPosition.ts, horizonRefraction.ts, atmosphere*), nothing under a local folder, no
an earlier zmanim library /  / hebcal source, no SPA port in any language (npm, GitHub,
Stack Overflow, the NREL SPA C code mentioned in the paper's A.6), no a luach site or data. No
web browsing was done.

Disclosure: while learning this repository's API for the NOAA comparison test, the AI viewed the
first 30 lines and lines 115-140 of this repository's own `src/noaa.ts` (which is a an earlier zmanim library
port; it holds NOAA, not SPA, formulas). Nothing from it was used in `src/spa.ts`; in particular
the Julian Day is computed differently (see Method). The tests call its exported functions as a
black box only.

## Test vectors (all from the paper)

- Table A4.1: Julian Day examples (Gregorian rows).
- Appendix A.5 / Table A5.1: 2003-10-17 12:30:30 local, time zone -7, latitude 39.742476,
  longitude -105.1786, elevation 1830.14 m, 820 mbar, 11 C, deltaT 67 s, slope 30, azimuth
  rotation -10, refraction 0.5667.

| Value | Paper | spa.ts |
|---|---|---|
| JD | 2452930.312847 | 2452930.312847 |
| L | 24.0182616917 | 24.0182616917 |
| B | -0.0001011219 | -0.0001011219 |
| R | 0.9965422974 | 0.9965422974 |
| delta psi | -0.00399840 | -0.00399840 |
| delta epsilon | 0.00166657 | 0.00166657 |
| epsilon | 23.440465 | 23.440465 |
| lambda | 204.0085519281 | 204.0085519281 |
| alpha | 202.22741 | 202.22741 |
| delta | -9.31434 | -9.31434 |
| H | 11.105900 | 11.105902 |
| alpha' | 202.22704 | 202.22704 |
| delta' | -9.316179 | -9.316179 |
| H' | 11.10629 | 11.10627 (the paper's own H - (alpha' - alpha) is 11.10627) |
| zenith | 50.11162 | 50.11162 |
| azimuth | 194.34024 | 194.34024 |
| incidence | 25.18700 | 25.18700 |
| M (A2) | 205.8971722516 | 205.8971722516 |
| EOT | 14.641503 min | 14.641511 min |
| transit | 18:46:04.97 UT | 18:46:04.962 |
| sunrise | 13:12:43.46 UT | 13:12:43.462 |
| sunset | 00:20:19.19 UT | 00:20:19.177 |

Sanity (not a source): rise/transit/set and a 16.1-degree dawn compared with this library's NOAA
results for 5 places x 5 dates, all within 1 minute (most within 0.03 minute).

## Wiring into the zmanim (2026-11-23)

src/zmanim.ts now takes every sun event from `spaDay` + `spaEvent` (A.2, 3 correction iterations):
sunrise/sunset (sun-centre zenith 90 + 16' + refraction from src/refraction.ts, plus the horizon dip
for the Elevated variants), all degree-based zmanim (`zenithToH0`), and chatzot (transit, kind 0).
SPA returns the event of a UT date; zmanim.ts moves the UT date until the event falls inside the
place's local mean solar day. src/noaa.ts (the an earlier zmanim library NOAA port) was deleted, and the NOAA
sanity comparison in test/spa.test.ts with it. Parity with the app's old NOAA-based output is checked
against the recorded fixture (all values within 1 printed minute). The wiring was done by the same
AI, with the same "not consulted" list as above; no outside source was opened for it.

# Provenance of the OpenStreetMap place points

Seven rows of data/places.tsv take their coordinates (object centre, 5 decimals) and names from
OpenStreetMap, (c) OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright).
They were looked up by scripts/osm-lookup.mjs (GitHub Actions, workflow osm-lookup) on 2026-11-23 and
checked by hand. This is an insubstantial extract under the OSMF "Substantial Extract" community
guideline (fewer than 100 features); nothing else in this repository comes from OpenStreetMap.
Elevations: Open-Meteo elevation API.

| id | key | OSM object |
| --- | --- | --- |
| 1804 | ramatBeitShemeshAleph | way/619125161 |
| 1805 | ramatBeitShemeshBet | way/92395863 |
| 1806 | ramatBeitShemeshGimel | node/1116270420 |
| 1807 | nofeiAviv | node/1155956162 |
| 1808 | kiryatSefer | node/12039482269 |
| 1809 | brachfeld | node/12039420566 |
| 1810 | greenPark | node/12039420564 |
