import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SPECIAL_ZMAN_NAMES, ZMAN_NAMES } from '../src/index'

describe('explanation docs', () => {
  const data = JSON.parse(readFileSync(new URL('../data/explanations.json', import.meta.url), 'utf8'))
  execFileSync(process.execPath, ['scripts/build-explanations.mjs'], { cwd: new URL('..', import.meta.url) })

  it('source covers every zman in both languages, and nothing extra', () => {
    expect(Object.keys(data).sort()).toEqual([...ZMAN_NAMES, ...SPECIAL_ZMAN_NAMES].sort())
  })

  for (const [lang, file] of [['en', 'zmanim.md'], ['he', 'zmanim.he.md']] as const) {
    it(`docs/${file} has a section for every zman`, () => {
      const md = readFileSync(new URL(`../docs/${file}`, import.meta.url), 'utf8')
      for (const name of [...ZMAN_NAMES, ...SPECIAL_ZMAN_NAMES]) {
        const e = data[name][lang]
        expect(md, `${name} ${lang}`).toContain(`<a id="${name}"></a>`)
        expect(md, `${name} ${lang}`).toContain(`## ${e.title}`)
        for (const s of e.sources) expect(md, `${name} ${lang}`).toContain(`- ${s}`)
      }
    })
  }
})
