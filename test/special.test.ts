import { describe, expect, it } from 'vitest'
import { epochMs, MOLAD_INTERVAL_MS, moladIndexAtOrBefore, moladMs, SPECIAL_KINDS, SPECIAL_ROUNDING, SPECIAL_ZMAN_NAMES, specialZmanim, specialZmanInstants, zmanInstants } from '../src/index'

const JLM = { lat: 31.778, lng: 35.2354, tzid: 'Asia/Jerusalem', elevation: 0, monthlyTemperatureC: 'standard' as const }
const JMT = 35.2354 * 4 * 60_000
const local = (n: number): string => new Date(moladMs(n) + JMT).toISOString()

describe('molad (Rambam, Kiddush HaChodesh 6)', () => {
  it('interval is 29 d 12 h 793 chalakim', () => {
    expect(MOLAD_INTERVAL_MS).toBeCloseTo(((29 * 24 + 12) * 1080 + 793) / 1080 * 3_600_000, 3)
  })
  it('matches published molads (Jerusalem mean time)', () => {
    // Tishrei 5786: Monday 22 Sep 2025 12:10 and 7 chalakim; Tishrei 5787: Friday 11 Sep 2026 20:59 and 1 chelek.
    expect(local(moladIndexAtOrBefore(Date.UTC(2025, 8, 30)))).toBe('2025-09-22T12:10:23.333Z')
    expect(local(moladIndexAtOrBefore(Date.UTC(2026, 8, 20)))).toBe('2026-09-11T20:59:03.333Z')
  })
})

describe('specialZmanim', () => {
  it('every name has a kind and a rounding', () => {
    expect(SPECIAL_ZMAN_NAMES.length).toBe(13)
    for (const n of SPECIAL_ZMAN_NAMES) expect(SPECIAL_ROUNDING[n]).toBeDefined()
  })
  it('erev Pesach: chametz hours sit between the morning lines', () => {
    const date = { year: 2026, month: 4, day: 1 }
    const s = specialZmanInstants(JLM, date, 'erevPesach')
    const z = zmanInstants(JLM, date, ['sofTfillaGra', 'sofTfillaMga', 'sofTfillaMga16', 'chatzot'])
    expect(s.sofAchilatChametzGra).toBe(z.sofTfillaGra)
    expect(Number(s.sofAchilatChametzMga! - z.sofTfillaMga!)).toBeLessThan(2e6)
    expect(Number(s.sofAchilatChametzMga16! - z.sofTfillaMga16!)).toBeLessThan(2e6)
    expect(s.sofBiurChametzMga! < s.sofBiurChametzGra!).toBe(true)
    expect(s.sofBiurChametzGra! < z.chatzot!).toBe(true)
    expect(Object.keys(specialZmanim(JLM, date, 'erevPesach')).sort()).toEqual([...SPECIAL_KINDS.erevPesach].sort())
  })
  it('fast day: 90 < 72 fixed, 16.1 deg = alot', () => {
    const date = { year: 2026, month: 7, day: 2 }
    const s = specialZmanInstants(JLM, date, 'fastDay')
    expect(s.fastStart16).toBe(zmanInstants(JLM, date, ['alot']).alot)
    expect(epochMs(s.fastStart72!) - epochMs(s.fastStart90!)).toBe(18 * 60_000)
    expect(specialZmanim(JLM, date, 'fastDay').fastStart72).toMatch(/^\d\d:\d\d$/)
  })
  it('kiddush levana window from the molad', () => {
    const s = specialZmanInstants(JLM, { year: 2025, month: 9, day: 30 }, 'kiddushLevana')
    const m = moladMs(moladIndexAtOrBefore(Date.UTC(2025, 8, 30)))
    expect(epochMs(s.kiddushLevanaStart3!) - m).toBeLessThan(3 * 86_400_000 + 1)
    expect(epochMs(s.kiddushLevanaEnd15!) - epochMs(s.kiddushLevanaEndHalf!)).toBe(Math.floor(m + 15 * 86_400_000) - Math.floor(m + MOLAD_INTERVAL_MS / 2))
    expect(s.kiddushLevanaStart7! > s.kiddushLevanaStart3!).toBe(true)
  })
})
