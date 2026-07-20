import { describe, expect, it } from 'vitest'
import { OMEGA, RHO_LIGHT_CYLINDER, Z0 } from './constants'
import { nowPoint, z, zRho, zTau } from './embedding'
import { inducedMetricZeta, properTimeRate, signatureAt } from './metric'
import { DEFAULT_DATUM_MS, tauNow, zetaFromTau } from './time'

// Numeric mirror of verify/verify_geometry.py — if a future edit to the core math
// breaks one of these identities, the run fails.

const TAU_NOW = 232704 // present-day scale: 2026-07-19 from the 2000-01-01 datum

describe('embedding', () => {
  it('z(τ, 0) = z₀ (rest displacement)', () => {
    expect(z(TAU_NOW, 0)).toBe(Z0)
  })

  it('corrected z_ρ carries the 1/τ:  z_τ/z_ρ = −ρ/τ', () => {
    for (const [t, r] of [[100, 5], [232704, 3.82], [24, 1]] as const) {
      expect(zTau(t, r) / zRho(t, r)).toBeCloseTo(-r / t, 10)
    }
  })

  it('identity  z_τ² = z_ρ²·ρ²/τ²', () => {
    const t = 5000
    const r = 12
    expect(zTau(t, r) ** 2).toBeCloseTo((zRho(t, r) ** 2 * (r * r)) / (t * t), 10)
  })

  it('embedding partials vanish in the large-τ limit (→ rotating Minkowski)', () => {
    expect(Math.abs(zTau(1e7, 3))).toBeLessThan(1e-6)
    expect(Math.abs(zRho(1e7, 3))).toBeLessThan(1e-3)
  })

  it('now-point is purely temporal (ρ=0, z=z₀, ζ=τ/24)', () => {
    const n = nowPoint(TAU_NOW)
    expect(n.rho).toBe(0)
    expect(n.z).toBe(Z0)
    expect(n.zeta).toBeCloseTo(TAU_NOW / 24, 10)
    expect(n.phi).toBeCloseTo(OMEGA * TAU_NOW, 3)
  })
})

describe('metric (ζ-chart) + proper time', () => {
  it('h_ττ = −1 on the null-rest axis (ρ=0)', () => {
    expect(inducedMetricZeta(TAU_NOW, 0).h_tt).toBeCloseTo(-1, 12)
  })

  it('ζ is a flat spectator (h_ζζ = 576)', () => {
    expect(inducedMetricZeta(TAU_NOW, 5).h_zz).toBe(576)
  })

  it('CENTERPIECE: proper-time rate is exactly 0 at rest (ρ=0)', () => {
    expect(properTimeRate(TAU_NOW, 0)).toBe(0)
  })

  it('proper-time rate ≈ ρω once ρ leaves zero (present-day τ)', () => {
    for (const r of [0.5, 1, 3.82]) {
      expect(properTimeRate(TAU_NOW, r)).toBeCloseTo(r * OMEGA, 6)
    }
  })

  it('signature is Lorentzian in the intended regime (ρ ≤ τ)', () => {
    expect(signatureAt(TAU_NOW, RHO_LIGHT_CYLINDER)).toBe('lorentzian')
    expect(signatureAt(1000, 5)).toBe('lorentzian')
  })
})

describe('time (datum + basis)', () => {
  it('datum anchor: 2026-07-19 ≈ ζ 9696, τ 232704 (2000 datum, MST λ=0)', () => {
    const t = tauNow(Date.UTC(2026, 6, 19), {
      datumMs: DEFAULT_DATUM_MS,
      basis: 'mst',
      longitudeDeg: 0,
    })
    expect(t).toBeCloseTo(232704, -1)
    expect(zetaFromTau(t)).toBeCloseTo(9696, 0)
  })

  it('MST longitude shifts τ by λ/15 hours', () => {
    const base = { datumMs: DEFAULT_DATUM_MS, basis: 'mst' as const, longitudeDeg: 0 }
    const now = Date.UTC(2026, 6, 19)
    expect(tauNow(now, { ...base, longitudeDeg: 15 }) - tauNow(now, base)).toBeCloseTo(1, 9)
  })
})
