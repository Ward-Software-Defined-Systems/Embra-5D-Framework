import { describe, expect, it } from 'vitest'
import { OMEGA } from './constants'
import { zRho, zTau } from './embedding'
import { inducedMetricZeta, nullHelixZetaRate, signatureAt, signatureLocusRho } from './metric'

describe('signature-change locus ρ_sig(τ)', () => {
  it('satisfies the degeneracy identity z_τ² = 1 + z_ρ² exactly', () => {
    for (const tau of [0.5, 5, 50, 500, 5000]) {
      const rho = signatureLocusRho(tau)
      const lhs = zTau(tau, rho) ** 2
      const rhs = 1 + zRho(tau, rho) ** 2
      expect(Math.abs(lhs - rhs) / rhs).toBeLessThan(1e-8)
    }
  })

  it('separates the signatures: Lorentzian inside, Riemannian pocket outside', () => {
    for (const tau of [1, 20, 300]) {
      const rho = signatureLocusRho(tau)
      expect(signatureAt(tau, rho * 0.999)).toBe('lorentzian')
      expect(signatureAt(tau, rho * 1.001)).toBe('riemannian')
    }
  })

  it('hugs the cone from outside near the epoch: ρ_sig ≳ τ, → τ as τ → 0', () => {
    for (const tau of [0.1, 1, 10, 100]) {
      const rho = signatureLocusRho(tau)
      expect(rho).toBeGreaterThan(tau)
      expect(rho / tau).toBeLessThan(1.001)
    }
    expect(signatureLocusRho(0)).toBe(0)
  })

  it('sits far outside every exploration radius at present-day τ (no pocket near now)', () => {
    expect(signatureLocusRho(232704)).toBeGreaterThan(232704)
  })
})

describe('null helices at fixed radius', () => {
  const TAU = 232704

  it('tangent (1, 0, k−ω, dζ/dτ) is h-null identically', () => {
    for (const [tau, rho, f] of [
      [TAU, 2, 0],
      [TAU, 2, 0.7],
      [TAU, 3.8197, -0.95],
      [TAU, 0.5, 0.4],
      [1000, 5, -0.7],
    ]) {
      const k = f / rho
      const rate = nullHelixZetaRate(tau, rho, k)
      expect(rate).toBeGreaterThan(0)
      const h = inducedMetricZeta(tau, rho)
      const up = k - OMEGA
      const norm = h.h_tt + 2 * h.h_tp * up + h.h_pp * up * up + h.h_zz * rate * rate
      expect(Math.abs(norm)).toBeLessThan(1e-9)
    }
  })

  it('recovers the distinguished members: flat photon circles and vertical null climbers', () => {
    // k = ±1/ρ: tangential sweep at c, no ζ-climb left
    expect(nullHelixZetaRate(TAU, 2, 1 / 2)).toBe(0)
    // k = 0: the vertical climber at the helix rate (rest is lightlike off-axis too)
    expect(nullHelixZetaRate(TAU, 2, 0)).toBeCloseTo(1 / 24, 12)
    // k = ω: co-rotation reaches the light cylinder exactly at ρ = 1/ω
    expect(nullHelixZetaRate(TAU, 1 / OMEGA, OMEGA)).toBe(0)
  })

  it('clamps to 0 (never NaN) beyond the root and at the τ → 0 divergence', () => {
    expect(nullHelixZetaRate(TAU, 3, 1)).toBe(0) // ρk > 1
    expect(nullHelixZetaRate(0, 3, 0.1)).toBe(0) // z_τ → ∞
    expect(nullHelixZetaRate(1e-9, 3, 0.1)).toBe(0)
  })
})
