// Community customs (assets/communities.json, from data/communities.json): which opinion line is primary per zman
// group, and candle lighting by city and country. Loaded on first need, once; configure() makes it load again.
import { listPlaceGeo } from './geo.js'
import type { Lang } from './places.js'
import { assetGeneration, readAsset } from './places.js'
import type { ZmanName } from './zmanim.js'

/** The zman groups a community can choose a primary line for. */
export const ZMAN_GROUPS = ['alot', 'misheyakir', 'sofShma', 'sofTfilla', 'minchaGedola', 'plag', 'sunrise', 'sunset',
  'candles', 'tzeit', 'tzeitShabbat'] as const
export type ZmanGroup = typeof ZMAN_GROUPS[number]

export interface Community {
  id: string
  he: string
  en: string
  /** Only the groups with a documented custom; the others keep the app's default line. */
  groups: Readonly<Partial<Record<ZmanGroup, ZmanName>>>
}

interface CommunityData {
  communities: Community[]
  cities: Record<string, { candles?: ZmanName, community?: string }>
  countries: Record<string, ZmanName>
}

let cached: { generation: number, data: Promise<CommunityData> } | null = null

function load(): Promise<CommunityData> {
  if (cached?.generation === assetGeneration) return cached.data
  const data = readAsset('communities.json').then((b) => JSON.parse(new TextDecoder().decode(b)) as CommunityData)
  const entry = { generation: assetGeneration, data }
  data.catch(() => { if (cached === entry) cached = null })
  cached = entry
  return data
}

/** Every community: id and its name in `lang`. */
export async function listCommunities(lang: Lang): Promise<Array<{ id: string, name: string }>> {
  return (await load()).communities.map((c) => ({ id: c.id, name: c[lang] }))
}

/** One community, or undefined for an unknown id. */
export async function getCommunity(id: string): Promise<Community | undefined> {
  return (await load()).communities.find((c) => c.id === id)
}

async function cityCustom(placeId: number) {
  const [data, geo] = await Promise.all([load(), listPlaceGeo()])
  const city = data.cities[String(geo.cityOf(placeId))] ?? data.cities[String(placeId)]
  return { data, city, country: geo.countryOf(placeId) }
}

/** The community a place's city follows by public custom (e.g. Jerusalem), or null. */
export async function defaultCommunityFor(placeId: number): Promise<string | null> {
  return (await cityCustom(placeId)).city?.community ?? null
}

/** The candle-lighting line customary in the place's city, else its country, else 18 minutes. */
export async function defaultCandlesFor(placeId: number): Promise<ZmanName> {
  const { data, city, country } = await cityCustom(placeId)
  return city?.candles ?? data.countries[country] ?? data.countries['*'] ?? 'candles18'
}

/**
 * The primary line per group for a community (null = none chosen). With a place, candles falls back to the
 * place's custom when the community has none.
 */
export async function primaryZmanim(communityId: string | null, placeId?: number): Promise<Partial<Record<ZmanGroup, ZmanName>>> {
  const groups: Partial<Record<ZmanGroup, ZmanName>> = { ...(communityId ? (await getCommunity(communityId))?.groups : undefined) }
  if (!groups.candles && placeId !== undefined) groups.candles = await defaultCandlesFor(placeId)
  return groups
}
