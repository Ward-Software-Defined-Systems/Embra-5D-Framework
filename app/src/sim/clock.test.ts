import { describe, expect, it } from 'vitest'
import { integrateDs, properTimeRateSafe } from './clock'

const TAU_NOW = 232704

describe('Δs accumulator (the centerpiece behavior)', () => {
  it('stays EXACTLY zero at rest — τ advances, Δs does not', () => {
    let ds = 0
    let tau = TAU_NOW
    for (let i = 0; i < 1000; i++) {
      ds = integrateDs(ds, tau, tau + 0.1, 0)
      tau += 0.1
    }
    expect(ds).toBe(0)
  })

  it('rest stays null even across τ = 0 (no 0/0 NaN)', () => {
    expect(integrateDs(0, -5, 5, 0)).toBe(0)
    expect(properTimeRateSafe(0, 0)).toBe(0)
  })

  it('accrues at ≈ ρω once ρ leaves zero: 2πρ per day at present-day τ', () => {
    for (const rho of [0.5, 1, 3.82]) {
      expect(integrateDs(0, TAU_NOW, TAU_NOW + 24, rho)).toBeCloseTo(2 * Math.PI * rho, 8)
    }
  })

  it('is signed: rewinding the marker unwinds Δs', () => {
    expect(integrateDs(0, TAU_NOW + 24, TAU_NOW, 1)).toBeCloseTo(-2 * Math.PI, 8)
    const roundTrip = integrateDs(integrateDs(0, TAU_NOW, TAU_NOW + 24, 1), TAU_NOW + 24, TAU_NOW, 1)
    expect(roundTrip).toBeCloseTo(0, 10)
  })

  it('one big scrub jump equals many small steps (rate is flat at window scales)', () => {
    const jump = integrateDs(0, TAU_NOW, TAU_NOW + 720, 2)
    let stepped = 0
    for (let i = 0; i < 720; i++) {
      stepped = integrateDs(stepped, TAU_NOW + i, TAU_NOW + i + 1, 2)
    }
    expect(jump).toBeCloseTo(stepped, 6)
  })

  it('clamps instead of NaN across the τ → 0 divergence (brief §6)', () => {
    expect(Number.isFinite(integrateDs(0, -12, 12, 3))).toBe(true)
    expect(Number.isFinite(properTimeRateSafe(0, 3))).toBe(true)
    expect(properTimeRateSafe(1e-12, 3)).toBeGreaterThan(0)
  })
})
