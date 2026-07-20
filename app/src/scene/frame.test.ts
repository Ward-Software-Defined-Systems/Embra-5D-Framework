import { describe, expect, it } from 'vitest'
import { OMEGA, RHO_LIGHT_CYLINDER } from '../geometry/constants'
import { properTimeRate } from '../geometry/metric'
import { displayPos, helicoidLocalPos, markerPhase } from './frame'
import { rateToColor } from './rateColor'

const TAU_NOW = 232704

describe('helicoid = rotated local frame (the SurfacePatch identity)', () => {
  it('R_y(markerPhase)·local(δ, ρ) equals displayPos(τ_m + δ, ρ, ψ) exactly', () => {
    const cases: Array<[tauM: number, psi: number, delta: number, rho: number]> = [
      [TAU_NOW, 0, 0, 0],
      [TAU_NOW, 0, 36.5, 2.4],
      [TAU_NOW, 1.234, -71.9, 3.8197],
      [1000.25, 5.9, 12.75, 9.5],
      [24, 3.1, -23.5, 0.5],
    ]
    const local = [0, 0, 0]
    const direct = [0, 0, 0]
    for (const [tauM, psi, delta, rho] of cases) {
      helicoidLocalPos(delta, rho, local)
      const phi = markerPhase(tauM, psi)
      const x = local[0] * Math.cos(phi) + local[2] * Math.sin(phi)
      const z = -local[0] * Math.sin(phi) + local[2] * Math.cos(phi)
      displayPos(tauM + delta, rho, psi, tauM, direct)
      expect(x).toBeCloseTo(direct[0], 6)
      expect(local[1]).toBeCloseTo(direct[1], 9)
      expect(z).toBeCloseTo(direct[2], 6)
    }
  })

  it('the displayed worldline lies ON the patch (δ ruling through the marker)', () => {
    const out = [0, 0, 0]
    helicoidLocalPos(0, 3, out)
    expect(out).toEqual([3, 0, -0])
  })
})

describe('light cylinder facts (closed forms)', () => {
  it('ρ_lc · ω = 1 (the defining relation)', () => {
    expect(RHO_LIGHT_CYLINDER * OMEGA).toBeCloseTo(1, 15)
  })

  it('proper-time rate is exactly light speed on the cylinder at present-day τ', () => {
    expect(properTimeRate(TAU_NOW, RHO_LIGHT_CYLINDER)).toBeCloseTo(1, 9)
  })

  it('at small τ the rate = 1 locus detaches inward: on the cylinder the rate exceeds 1', () => {
    // z_τ² > 0 adds to ρ²ω², so where ρ = 1/ω the rate is already superluminal.
    expect(properTimeRate(24, RHO_LIGHT_CYLINDER)).toBeGreaterThan(1)
    expect(properTimeRate(6, RHO_LIGHT_CYLINDER)).toBeGreaterThan(properTimeRate(24, RHO_LIGHT_CYLINDER))
  })
})

describe('rate → color ramp', () => {
  const c = (rate: number) => {
    const out = [0, 0, 0]
    rateToColor(rate, out)
    return out
  }

  it('null rest is near-black, rate 1 is the bright band, beyond is amber-warm', () => {
    const rest = c(0)
    const band = c(1)
    const beyond = c(2)
    expect(Math.max(...rest)).toBeLessThan(0.12)
    expect(Math.min(...band)).toBeGreaterThan(0.9)
    expect(beyond[0]).toBeGreaterThan(beyond[2]) // red over blue — warm
  })

  it('clamps: negative and non-finite rates stay in gamut', () => {
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      for (const ch of c(bad)) {
        expect(ch).toBeGreaterThanOrEqual(0)
        expect(ch).toBeLessThanOrEqual(1)
      }
    }
  })

  it('is continuous across every stop (no seams on the surface)', () => {
    for (const stop of [0.6, 0.96, 1, 1.06, 1.6]) {
      const below = c(stop - 1e-9)
      const at = c(stop)
      for (let k = 0; k < 3; k++) {
        expect(Math.abs(at[k] - below[k])).toBeLessThan(1e-6)
      }
    }
  })
})
