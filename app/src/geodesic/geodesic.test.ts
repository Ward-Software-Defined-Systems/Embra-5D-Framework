import { describe, expect, it } from 'vitest'
import { OMEGA } from '../geometry/constants'
import { inducedMetricZeta } from '../geometry/metric'
import { angularMomentum, hNorm, metricBlockAt } from './cartesianMetric'
import type { MetricBlock } from './cartesianMetric'
import { integrateGeodesic, makeFan, rk4Step, STATE_SIZE } from './core'

const TAU_NOW = 232704

function integrate(x0: number[], u0: number[], dLambda: number, steps: number) {
  const samples = new Float64Array((steps + 1) * 4)
  const count = integrateGeodesic(x0, u0, dLambda, steps, samples, 0)
  return { samples, count }
}

function stateAt(samples: Float64Array, s: number): [number, number, number, number] {
  return [samples[s * 4], samples[s * 4 + 1], samples[s * 4 + 2], samples[s * 4 + 3]]
}

describe('chart equivalence: Cartesian (τ,X,Y,ζ) metric is the review ζ-chart h in inertial coordinates', () => {
  it('pulling the Cartesian block back through (τ,ρ,ψ) → (τ,X,Y) reproduces h_μν', () => {
    for (const [tau, rho, psi] of [
      [TAU_NOW, 2.5, 0.7],
      [TAU_NOW, 3.8197, 4.1],
      [5000, 9, 2.2],
      [200, 12, 5.5],
    ]) {
      const phi = OMEGA * tau + psi
      const X = rho * Math.cos(phi)
      const Y = rho * Math.sin(phi)
      const g: MetricBlock = [0, 0, 0, 0, 0, 0]
      metricBlockAt(tau, X, Y, g)
      // Jacobian of (X, Y) in (τ, ρ, ψ): X_τ = −ρω sinφ, X_ρ = cosφ, X_ψ = −ρ sinφ, etc.
      const J = [
        [1, 0, 0],
        [-rho * OMEGA * Math.sin(phi), Math.cos(phi), -rho * Math.sin(phi)],
        [rho * OMEGA * Math.cos(phi), Math.sin(phi), rho * Math.cos(phi)],
      ]
      const G = [
        [g[0], g[1], g[2]],
        [g[1], g[3], g[4]],
        [g[2], g[4], g[5]],
      ]
      const pull = (a: number, b: number) => {
        let s = 0
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) s += J[i][a] * G[i][j] * J[j][b]
        }
        return s
      }
      const h = inducedMetricZeta(tau, rho)
      expect(pull(0, 0)).toBeCloseTo(h.h_tt, 8)
      expect(pull(0, 1)).toBeCloseTo(h.h_tr, 8)
      expect(pull(0, 2)).toBeCloseTo(h.h_tp, 8)
      expect(pull(1, 1)).toBeCloseTo(h.h_rr, 8)
      expect(pull(1, 2)).toBeCloseTo(0, 8)
      expect(pull(2, 2)).toBeCloseTo(h.h_pp, 8)
    }
  })
})

describe('geodesic invariants', () => {
  const x0 = [TAU_NOW, 2, 1.3, 9696]
  const u0 = [1, 0.2, -0.15, 1 / 24]

  it('conserves h(u,u) along the flow', () => {
    const y = new Float64Array(STATE_SIZE)
    y.set([...x0, ...u0])
    const scratch = new Float64Array(5 * STATE_SIZE)
    const n0 = hNorm(y[0], y[1], y[2], y.subarray(4))
    for (let s = 0; s < 240; s++) rk4Step(y, 0.1, scratch)
    const n1 = hNorm(y[0], y[1], y[2], y.subarray(4))
    expect(Math.abs(n1 - n0)).toBeLessThan(1e-9)
  })

  it('conserves angular momentum (rotation Killing vector)', () => {
    const y = new Float64Array(STATE_SIZE)
    y.set([...x0, ...u0])
    const scratch = new Float64Array(5 * STATE_SIZE)
    const L0 = angularMomentum(y[0], y[1], y[2], y.subarray(4))
    for (let s = 0; s < 240; s++) rk4Step(y, 0.1, scratch)
    const L1 = angularMomentum(y[0], y[1], y[2], y.subarray(4))
    expect(Math.abs(L1 - L0)).toBeLessThan(1e-9)
  })

  it('keeps u^ζ exactly constant (flat spectator) and ζ affine', () => {
    const { samples, count } = integrate(x0, u0, 0.05, 200)
    expect(count).toBe(201)
    for (const s of [50, 200]) {
      const [, , , zeta] = stateAt(samples, s)
      // tolerance is fp summation at |ζ| ~ 1e4 over s steps, not integrator error
      expect(zeta).toBeCloseTo(x0[3] + (s * 0.05) / 24, 9)
    }
  })

  it('at present-day τ, free fall is a straight line in the inertial event plane', () => {
    // The release from the marker continues along its instantaneous tangent
    // while the worldline curls away — the M5 demo, as arithmetic.
    const rho = 2.4
    const u = [1, -rho * OMEGA, 0.1, 1 / 24] // co-rotational tangent + small kick
    const { samples, count } = integrate([TAU_NOW, rho, 0, 9696], u, 0.05, 240)
    expect(count).toBe(241)
    const [t0, X0, Y0] = stateAt(samples, 0)
    const [t1, X1, Y1] = stateAt(samples, 240)
    for (const s of [60, 120, 180]) {
      const [t, X, Y] = stateAt(samples, s)
      const f = (t - t0) / (t1 - t0)
      expect(X).toBeCloseTo(X0 + f * (X1 - X0), 6)
      expect(Y).toBeCloseTo(Y0 + f * (Y1 - Y0), 6)
    }
  })

  it('the rest axis is a geodesic: the released rest observer stays at rest', () => {
    const { samples, count } = integrate([TAU_NOW, 0, 0, 9696], [1, 0, 0, 1 / 24], 0.1, 120)
    expect(count).toBe(121)
    const [tEnd, X, Y, zeta] = stateAt(samples, 120)
    expect(X).toBe(0)
    expect(Y).toBe(0)
    expect(tEnd).toBeCloseTo(TAU_NOW + 12, 8) // u^τ stays 1: λ is coordinate time (fp summation at |τ| ~ 2e5)
    expect(zeta).toBeCloseTo(9696 + 12 / 24, 9)
  })

  it('truncates (never NaN) when a ray runs into the τ → 0 divergence', () => {
    const { samples, count } = integrate([4, 6, 0, 0], [-1, 0.5, 0, 1 / 24], 0.05, 400)
    expect(count).toBeLessThan(401)
    for (let s = 0; s < count; s++) {
      for (const v of stateAt(samples, s)) expect(Number.isFinite(v)).toBe(true)
    }
  })

  it('the working step size has huge accuracy margin on a genuinely curved path', () => {
    // In the cone region the path visibly bends, yet an 8× coarser step than
    // the app's dλ = 0.05 already agrees to ~the FD-Christoffel floor — i.e.
    // the integrator's error is far below anything renderable.
    const x = [100, 20, 0, 4]
    const u = [1, 0.4, 0.3, 1 / 24]
    const end = (dLambda: number, steps: number) => {
      const { samples, count } = integrate(x, u, dLambda, steps)
      expect(count).toBe(steps + 1)
      return stateAt(samples, steps)
    }
    const coarse = end(0.4, 13)
    const finest = end(0.05, 104)
    const bendX = finest[1] - (x[1] + u[1] * 5.2)
    const bendY = finest[2] - (x[2] + u[2] * 5.2)
    expect(Math.hypot(bendX, bendY)).toBeGreaterThan(1e-2) // the geometry is doing real work
    expect(Math.hypot(coarse[1] - finest[1], coarse[2] - finest[2])).toBeLessThan(1e-5)
  })
})

describe('makeFan', () => {
  it('center ray is the pure release: the cycle-carrying tangent at the marker', () => {
    const { x0s, u0s } = makeFan(TAU_NOW, 3, 1.1, 9696.5, 7, 0.3)
    expect(Array.from(x0s.subarray(0, 4))).toEqual([
      TAU_NOW,
      3 * Math.cos(1.1),
      3 * Math.sin(1.1),
      9696.5,
    ])
    expect(u0s[0]).toBe(1)
    expect(u0s[1]).toBeCloseTo(-3 * OMEGA * Math.sin(1.1), 12)
    expect(u0s[2]).toBeCloseTo(3 * OMEGA * Math.cos(1.1), 12)
    expect(u0s[3]).toBeCloseTo(1 / 24, 15)
  })

  it('siblings share the release tangent plus a spread-speed kick around the circle', () => {
    const n = 7
    const spread = 0.25
    const { u0s } = makeFan(TAU_NOW, 0, 0.4, 9696, n, spread)
    for (let k = 1; k < n; k++) {
      const dvx = u0s[k * 4 + 1] - u0s[1]
      const dvy = u0s[k * 4 + 2] - u0s[2]
      expect(Math.hypot(dvx, dvy)).toBeCloseTo(spread, 10)
    }
  })
})
