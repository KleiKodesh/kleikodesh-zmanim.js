import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getExplanation, ZMAN_NAMES } from '../src/index'
import { useFileAssets } from './helpers'

describe('explanations', () => {
  const data = JSON.parse(readFileSync(new URL('../data/explanations.json', import.meta.url), 'utf8'))

  it('every zman has a Hebrew and an English explanation with sources, and nothing extra', () => {
    expect(Object.keys(data).sort()).toEqual([...ZMAN_NAMES].sort())
    for (const name of ZMAN_NAMES) {
      for (const lang of ['he', 'en']) {
        const e = data[name][lang]
        expect(e.title, `${name} ${lang}`).toBeTruthy()
        expect(e.text, `${name} ${lang}`).toBeTruthy()
        expect(e.sources.length, `${name} ${lang}`).toBeGreaterThan(0)
      }
    }
  })

  it('loads only the asked language, once', async () => {
    const reads = useFileAssets()
    expect(reads).toEqual([])
    const sunrise = await getExplanation('sunrise', 'en')
    expect(sunrise?.title).toBe('Sunrise')
    for (const name of ZMAN_NAMES) expect((await getExplanation(name, 'en'))?.text).toBeTruthy()
    expect(reads).toEqual(['explanations-en.json'])
    expect((await getExplanation('sunrise', 'he'))?.sources.length).toBeGreaterThan(0)
    expect(reads).toEqual(['explanations-en.json', 'explanations-he.json'])
  })
})
