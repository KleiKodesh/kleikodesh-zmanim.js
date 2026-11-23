// data/places.tsv (+ data/geo-aliases.tsv) -> assets/geo.bin + assets/countries.json:
// each place's country and the city it belongs to, for pickers that filter by country,
// then city, then neighbourhood. Kept apart from places.bin so that list stays as it is.
//
//   countries.json  ISO 3166 codes; names come from Intl.DisplayNames in the UI language.
//   geo.bin         3 bytes per place id (record 0 unused): uint16 city place id (the place
//                   itself when it is a city), uint8 index into countries.json.
//
// Country: from the place's time zone (ZONE_COUNTRY below; every zone in the list must be
// there). City: the English name's trailing "(X)" names it - the place whose English name
// is X, or the one geo-aliases.tsv gives; followed up while that place has a "(Y)" too.
// Unresolved "(X)" (a region, a qualifier): the place is its own city.
import { readFileSync, writeFileSync } from 'node:fs'

export const GEO_RECORD_SIZE = 3

const ZONE_COUNTRY = {
  'Africa/Casablanca': 'MA', 'Africa/Ceuta': 'ES', 'Africa/Johannesburg': 'ZA', 'Africa/Nairobi': 'KE', 'Africa/Tunis': 'TN',
  'America/Argentina/Buenos_Aires': 'AR', 'America/Argentina/Cordoba': 'AR', 'America/Asuncion': 'PY', 'America/Bogota': 'CO',
  'America/Caracas': 'VE', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Detroit': 'US', 'America/Edmonton': 'CA',
  'America/Guayaquil': 'EC', 'America/Halifax': 'CA', 'America/Havana': 'CU', 'America/Indiana/Indianapolis': 'US',
  'America/Kentucky/Louisville': 'US', 'America/La_Paz': 'BO', 'America/Lima': 'PE', 'America/Los_Angeles': 'US',
  'America/Mexico_City': 'MX', 'America/Montevideo': 'UY', 'America/New_York': 'US', 'America/Panama': 'PA', 'America/Phoenix': 'US',
  'America/Recife': 'BR', 'America/Santiago': 'CL', 'America/Sao_Paulo': 'BR', 'America/Toronto': 'CA', 'America/Vancouver': 'CA',
  'America/Winnipeg': 'CA', 'Asia/Almaty': 'KZ', 'Asia/Baku': 'AZ', 'Asia/Bangkok': 'TH', 'Asia/Dubai': 'AE', 'Asia/Hong_Kong': 'HK',
  'Asia/Jerusalem': 'IL', 'Asia/Kolkata': 'IN', 'Asia/Novosibirsk': 'RU', 'Asia/Samarkand': 'UZ', 'Asia/Shanghai': 'CN',
  'Asia/Singapore': 'SG', 'Asia/Tashkent': 'UZ', 'Asia/Tbilisi': 'GE', 'Asia/Tehran': 'IR', 'Asia/Tokyo': 'JP',
  'Asia/Yekaterinburg': 'RU', 'Asia/Yerevan': 'AM', 'Australia/Adelaide': 'AU', 'Australia/Brisbane': 'AU',
  'Australia/Melbourne': 'AU', 'Australia/Perth': 'AU', 'Australia/Sydney': 'AU', 'Europe/Amsterdam': 'NL', 'Europe/Athens': 'GR',
  'Europe/Belgrade': 'RS', 'Europe/Berlin': 'DE', 'Europe/Bratislava': 'SK', 'Europe/Brussels': 'BE', 'Europe/Bucharest': 'RO',
  'Europe/Budapest': 'HU', 'Europe/Chisinau': 'MD', 'Europe/Copenhagen': 'DK', 'Europe/Dublin': 'IE', 'Europe/Gibraltar': 'GI',
  'Europe/Helsinki': 'FI', 'Europe/Istanbul': 'TR', 'Europe/Kyiv': 'UA', 'Europe/Lisbon': 'PT', 'Europe/Ljubljana': 'SI',
  'Europe/London': 'GB', 'Europe/Madrid': 'ES', 'Europe/Minsk': 'BY', 'Europe/Moscow': 'RU', 'Europe/Oslo': 'NO', 'Europe/Paris': 'FR',
  'Europe/Prague': 'CZ', 'Europe/Riga': 'LV', 'Europe/Rome': 'IT', 'Europe/Sarajevo': 'BA', 'Europe/Sofia': 'BG',
  'Europe/Stockholm': 'SE', 'Europe/Tallinn': 'EE', 'Europe/Vienna': 'AT', 'Europe/Vilnius': 'LT', 'Europe/Warsaw': 'PL',
  'Europe/Zagreb': 'HR', 'Europe/Zurich': 'CH', 'Pacific/Auckland': 'NZ',
}

const rows = readFileSync('data/places.tsv', 'utf8').trim().split(/\r?\n/).slice(1).map((line) => line.split('\t'))
const aliases = new Map(
  readFileSync('data/geo-aliases.tsv', 'utf8').trim().split(/\r?\n/).slice(1).filter((line) => !line.startsWith('#')).map((line) => line.split('\t')).map(([label, id]) => [label, Number(id)]),
)
const maxId = Math.max(...rows.map((r) => Number(r[0])))
const byId = new Map(rows.map((r) => [Number(r[0]), r]))
const idByEnglish = new Map(rows.map((r) => [r[3], Number(r[0])]))
const PARENT = /\(([^()]*)\)\s*$/

/** The place this one's "(X)" names, or 0. */
function parentOf(id) {
  const label = byId.get(id)?.[3].match(PARENT)?.[1]
  if (!label) return 0
  const parent = aliases.get(label) ?? idByEnglish.get(label) ?? 0
  return parent !== id ? parent : 0
}

/** The top of the "(X)" chain: the city. */
function cityOf(id) {
  const seen = new Set([id])
  let city = id
  for (let parent = parentOf(city); parent && !seen.has(parent); parent = parentOf(city)) {
    seen.add(parent)
    city = parent
  }
  return city
}

const missingZones = [...new Set(rows.map((r) => r[7]).filter((z) => !ZONE_COUNTRY[z]))]
if (missingZones.length) throw new Error(`no country for time zones: ${missingZones.join(', ')} (add them to ZONE_COUNTRY)`)
for (const [label, id] of aliases) if (!byId.has(id)) throw new Error(`geo-aliases.tsv: ${label} -> ${id}, no such place`)

const countries = [...new Set(rows.map((r) => ZONE_COUNTRY[r[7]]))].sort()
const bin = new DataView(new ArrayBuffer((maxId + 1) * GEO_RECORD_SIZE))
for (const [id, row] of byId) {
  const city = cityOf(id)
  if (city > 0xffff) throw new Error(`place id ${city} does not fit uint16`)
  bin.setUint16(id * GEO_RECORD_SIZE, city, true)
  bin.setUint8(id * GEO_RECORD_SIZE + 2, countries.indexOf(ZONE_COUNTRY[row[7]]))
}
writeFileSync('assets/geo.bin', new Uint8Array(bin.buffer))
writeFileSync('assets/countries.json', JSON.stringify(countries))
const cities = new Set([...byId.keys()].map(cityOf))
console.log(`geo: ${byId.size} places, ${countries.length} countries, ${cities.size} cities`)
