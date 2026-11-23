import { readFileSync } from 'node:fs'
import { configure } from '../src/index'

/** Points the library at ./assets through the file system, and records every file it reads. */
export function useFileAssets(): string[] {
  const reads: string[] = []
  configure({
    loader: async (file) => {
      reads.push(file)
      const bytes = readFileSync(new URL(`../assets/${file}`, import.meta.url))
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    },
  })
  return reads
}

/** data/places.tsv rows by key. */
export function tsvByKey(): Map<string, string[]> {
  const rows = readFileSync(new URL('../data/places.tsv', import.meta.url), 'utf8').trim().split(/\r?\n/).slice(1)
  return new Map(rows.map((line) => { const r = line.split('\t'); return [r[1]!, r] }))
}
