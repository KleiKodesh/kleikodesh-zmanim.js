import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { defaultCandlesFor, defaultCommunityFor, getCommunity, listCommunities, primaryZmanim, ZMAN_GROUPS, ZMAN_NAMES } from '../src/index'
import { useFileAssets } from './helpers'

const data = JSON.parse(readFileSync(new URL('../data/communities.json', import.meta.url), 'utf8'))

describe('communities', () => {
  it('every community has names, a source URL, and only known groups and zman names', () => {
    for (const c of data.communities) {
      expect(c.he && c.en).toBeTruthy()
      expect(c.sources.length).toBeGreaterThan(0)
      for (const s of c.sources) expect(s).toMatch(/^https:\/\//)
      for (const [g, z] of Object.entries(c.groups)) {
        expect(ZMAN_GROUPS).toContain(g)
        expect(ZMAN_NAMES).toContain(z)
      }
    }
  })

  it('loads communities.json once, lazily, and lists by language', async () => {
    const reads = useFileAssets()
    expect(reads).toEqual([])
    const en = await listCommunities('en')
    expect(en.map((c) => c.id)).toEqual(['ashkenaz', 'mizrach', 'chabad', 'chabadSah', 'jerusalem', 'benIshChai', 'lakewood'])
    expect((await listCommunities('he'))[0]!.name).toContain('אשכנז')
    expect((await getCommunity('mizrach'))!.groups.sofShma).toBe('sofShmaMga72z')
    expect(await getCommunity('nope')).toBeUndefined()
    expect(reads).toEqual(['communities.json'])
  })

  it('Jerusalem and its neighbourhoods default to the Jerusalem custom and 40 minutes', async () => {
    useFileAssets()
    expect(await defaultCommunityFor(1)).toBe('jerusalem')
    expect(await defaultCommunityFor(9)).toBe('jerusalem')
    expect(await defaultCandlesFor(9)).toBe('candles40')
    expect(await defaultCandlesFor(52)).toBe('candles30')
    expect(await defaultCandlesFor(78)).toBe('candles40')
    expect(await defaultCommunityFor(52)).toBeNull()
    expect(await defaultCandlesFor(105)).toBe('candles18')
    expect(await defaultCandlesFor(200)).toMatch(/^candles/)
  })

  it('primary lines: community groups, candles from the place when the community has none', async () => {
    useFileAssets()
    expect(await primaryZmanim('ashkenaz', 52)).toEqual({ sofShma: 'sofShmaGra', sofTfilla: 'sofTfillaGra', plag: 'plag', candles: 'candles30' })
    expect(await primaryZmanim('jerusalem', 52)).toEqual({ candles: 'candles40' })
    expect(await primaryZmanim(null)).toEqual({})
  })
})
