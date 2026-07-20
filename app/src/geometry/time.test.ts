import { describe, expect, it } from 'vitest'
import type { TimeParams } from './time'
import { DEFAULT_DATUM_MS, dateMsFromTau, dayTicks, formatDayLabel, tauNow } from './time'

// The calendar side of the pipeline: τ ↔ date inversion and day-boundary
// enumeration. MST paths are exact and timezone-independent; civil paths are
// exercised against whatever TZ the host runs (self-consistency, not fixtures).

const mst = (longitudeDeg = 0): TimeParams => ({
  datumMs: DEFAULT_DATUM_MS,
  basis: 'mst',
  longitudeDeg,
})

const civil: TimeParams = { datumMs: DEFAULT_DATUM_MS, basis: 'civil', longitudeDeg: 0 }

// 2026-07-19 00:00 UTC is exactly 9,696 days after the 2000-01-01 datum.
const ANCHOR_MS = Date.UTC(2026, 6, 19)
const ANCHOR_TAU = 232704

describe('dateMsFromTau (inverse of tauNow)', () => {
  it('MST round-trips exactly, for any λ', () => {
    for (const lam of [0, 90, -77.03, 179.9]) {
      const p = mst(lam)
      for (const ms of [ANCHOR_MS, DEFAULT_DATUM_MS, Date.UTC(1987, 2, 1, 13, 37, 11, 250)]) {
        expect(dateMsFromTau(tauNow(ms, p), p)).toBe(ms)
      }
    }
  })

  it('civil round-trips away from DST edges (12:00 UTC is unambiguous in every zone)', () => {
    for (const ms of [Date.UTC(2026, 0, 15, 12), Date.UTC(2026, 6, 15, 12)]) {
      expect(dateMsFromTau(tauNow(ms, civil), civil)).toBe(ms)
    }
  })
})

describe('dayTicks', () => {
  it('MST ticks sit exactly at τ = 24k, uniformly spaced', () => {
    const ticks = dayTicks(ANCHOR_TAU - 72, ANCHOR_TAU + 72, mst(0))
    expect(ticks).toHaveLength(7)
    for (const t of ticks) {
      expect(t.tau % 24).toBe(0)
      expect(t.dayIndex).toBe(t.tau / 24)
    }
    expect(ticks.map((t) => t.tau)).toContain(ANCHOR_TAU)
  })

  it('the anchor tick labels as the mean-solar calendar date 2026-07-19', () => {
    const [tick] = dayTicks(ANCHOR_TAU - 1, ANCHOR_TAU + 1, mst(0))
    expect(tick.labelMs).toBe(ANCHOR_MS)
    expect(formatDayLabel(tick.labelMs, mst(0))).toBe('Sun 19 Jul')
  })

  it('the mean-solar label date is independent of λ (the meridian keeps its own calendar)', () => {
    // Mean midnight on 90°E is 18:00 UTC the previous day, but its calendar date
    // at the meridian is still datum + k days.
    const at0 = dayTicks(ANCHOR_TAU - 36, ANCHOR_TAU + 36, mst(0))
    const at90 = dayTicks(ANCHOR_TAU - 36, ANCHOR_TAU + 36, mst(90))
    expect(at90.map((t) => t.labelMs)).toEqual(at0.map((t) => t.labelMs))
  })

  it('civil ticks land on local midnights and are self-consistent with tauNow', () => {
    const tauMid = tauNow(Date.UTC(2026, 6, 15, 12), civil)
    const ticks = dayTicks(tauMid - 72, tauMid + 72, civil)
    expect(ticks.length).toBeGreaterThanOrEqual(5)
    for (const t of ticks) {
      const d = new Date(t.labelMs)
      expect(d.getHours()).toBe(0)
      expect(d.getMinutes()).toBe(0)
      expect(tauNow(t.labelMs, civil)).toBeCloseTo(t.tau, 9)
    }
    // Away from DST transitions, consecutive civil days are 24 τ-hours apart.
    const gaps = ticks.slice(1).map((t, i) => t.tau - ticks[i].tau)
    for (const g of gaps) {
      expect([23, 24, 25]).toContain(Math.round(g))
    }
  })

  it('handles negative τ (datum in the future) and empty windows', () => {
    const ticks = dayTicks(-50, -20, mst(0))
    expect(ticks.map((t) => t.dayIndex)).toEqual([-2, -1])
    expect(dayTicks(5, 5, mst(0))).toEqual([])
  })
})
