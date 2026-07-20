// RK4 geodesic integrator for the induced metric (brief §3), pure and
// node-testable. Geodesics of the quadratic (energy) action ½∫h_μν ẋ^μ ẋ^ν dλ
// (README §15.7 — handles any causal character; timelike ones maximize proper
// time). ζ is a flat spectator (g_ζζ const, no cross terms): u^ζ is constant
// and only the (τ, X, Y) block needs Christoffels — computed by central finite
// differences of the closed-form metric, so the integrator stays consistent
// with the living theory's z-forms with no hand-derived Γ algebra to get wrong.
import { OMEGA } from '../geometry/constants'
import { metricBlockAt } from './cartesianMetric'
import type { MetricBlock } from './cartesianMetric'

/** State layout: [τ, X, Y, ζ, u^τ, u^X, u^Y, u^ζ]. */
export const STATE_SIZE = 8

/** Marker fan requests/responses (worker protocol). */
export interface GeodesicRequest {
  id: number
  n: number
  steps: number
  dLambda: number
  /** n×4 initial events (τ, X, Y, ζ). */
  x0s: Float64Array
  /** n×4 initial velocities. */
  u0s: Float64Array
}

export interface GeodesicResponse {
  id: number
  n: number
  steps: number
  /** n×(steps+1)×4 samples (τ, X, Y, ζ), ray-major. */
  samples: Float64Array
  /** Valid sample count per ray (< steps+1 when truncated at a divergence). */
  counts: Int32Array
}

// Central-difference steps: the metric varies on the scale of τ in τ (so a
// relative step) and on O(1) framework lengths in X, Y. The X/Y step balances
// truncation (∝ h²) against roundoff (∝ ε·g/h), which otherwise floors the
// integrator's accuracy in the strong-curvature cone region.
function fdStepTau(tau: number): number {
  return Math.max(1e-3, 1e-7 * Math.abs(tau))
}
const FD_STEP_XY = 5e-4

// Rays that hit the τ → 0 divergence pick up enormous finite kicks; truncate
// them once they leave any physically renderable range (clamp/fade, §6).
const POSITION_BOUND = 1e4
const VELOCITY_BOUND = 1e4

/** Symmetric 3×3 inverse from packed [00, 01, 02, 11, 12, 22]; returns false if singular. */
function invertSym3(g: MetricBlock, out: MetricBlock): boolean {
  const [a, b, c, d, e, f] = g // [00, 01, 02, 11, 12, 22]
  const c00 = d * f - e * e
  const c01 = c * e - b * f
  const c02 = b * e - c * d
  const det = a * c00 + b * c01 + c * c02
  if (!Number.isFinite(det) || Math.abs(det) < 1e-30) return false
  out[0] = c00 / det
  out[1] = c01 / det
  out[2] = c02 / det
  out[3] = (a * f - c * c) / det
  out[4] = (b * c - a * e) / det
  out[5] = (a * d - b * b) / det
  return true
}

const packIndex = (i: number, j: number): number =>
  i === 0 ? j : i === 1 ? (j === 0 ? 1 : j + 2) : j === 0 ? 2 : j === 1 ? 4 : 5

/**
 * Geodesic acceleration a^k = −Γ^k_ij u^i u^j on the (τ, X, Y) block.
 * Writes into out[0..2]; returns false at a metric degeneracy (caller truncates).
 */
export function accel(
  tau: number,
  X: number,
  Y: number,
  u: ArrayLike<number>,
  out: number[] | Float64Array,
): boolean {
  const g: MetricBlock = [0, 0, 0, 0, 0, 0]
  const ginv: MetricBlock = [0, 0, 0, 0, 0, 0]
  metricBlockAt(tau, X, Y, g)
  if (!invertSym3(g, ginv)) return false

  // ∂g by central differences, one packed block per coordinate direction
  const dg: [MetricBlock, MetricBlock, MetricBlock] = [
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
  ]
  const plus: MetricBlock = [0, 0, 0, 0, 0, 0]
  const minus: MetricBlock = [0, 0, 0, 0, 0, 0]
  const hT = fdStepTau(tau)
  const steps: Array<[number, number, number, number]> = [
    [hT, tau + hT, X, Y],
    [FD_STEP_XY, tau, X + FD_STEP_XY, Y],
    [FD_STEP_XY, tau, X, Y + FD_STEP_XY],
  ]
  for (let d = 0; d < 3; d++) {
    const [h, tp, xp, yp] = steps[d]
    metricBlockAt(tp, xp, yp, plus)
    metricBlockAt(tau - (d === 0 ? h : 0), X - (d === 1 ? h : 0), Y - (d === 2 ? h : 0), minus)
    for (let k = 0; k < 6; k++) dg[d][k] = (plus[k] - minus[k]) / (2 * h)
  }

  const uu = [u[0], u[1], u[2]]
  for (let k = 0; k < 3; k++) {
    let acc = 0
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        // Γ^k_ij u^i u^j with Γ from ½ g^kl (∂_i g_lj + ∂_j g_li − ∂_l g_ij)
        let gamma = 0
        for (let l = 0; l < 3; l++) {
          gamma +=
            ginv[packIndex(k, l)] *
            (dg[i][packIndex(l, j)] + dg[j][packIndex(l, i)] - dg[l][packIndex(i, j)])
        }
        acc += 0.5 * gamma * uu[i] * uu[j]
      }
    }
    out[k] = -acc
  }
  return Number.isFinite(out[0] + out[1] + out[2])
}

function derivative(y: Float64Array, out: Float64Array): boolean {
  out[0] = y[4]
  out[1] = y[5]
  out[2] = y[6]
  out[3] = y[7]
  const a = [0, 0, 0]
  if (!accel(y[0], y[1], y[2], [y[4], y[5], y[6]], a)) return false
  out[4] = a[0]
  out[5] = a[1]
  out[6] = a[2]
  out[7] = 0 // ζ is a flat spectator: u^ζ is constant
  return true
}

/** One classical RK4 step of size h; returns false to signal truncation. */
export function rk4Step(y: Float64Array, h: number, scratch: Float64Array): boolean {
  const n = STATE_SIZE
  const k1 = scratch.subarray(0, n)
  const k2 = scratch.subarray(n, 2 * n)
  const k3 = scratch.subarray(2 * n, 3 * n)
  const k4 = scratch.subarray(3 * n, 4 * n)
  const tmp = scratch.subarray(4 * n, 5 * n)
  if (!derivative(y, k1)) return false
  for (let i = 0; i < n; i++) tmp[i] = y[i] + 0.5 * h * k1[i]
  if (!derivative(tmp, k2)) return false
  for (let i = 0; i < n; i++) tmp[i] = y[i] + 0.5 * h * k2[i]
  if (!derivative(tmp, k3)) return false
  for (let i = 0; i < n; i++) tmp[i] = y[i] + h * k3[i]
  if (!derivative(tmp, k4)) return false
  for (let i = 0; i < n; i++) y[i] += (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
  return Number.isFinite(y[0] + y[1] + y[2] + y[3] + y[4] + y[5] + y[6] + y[7])
}

/**
 * Integrate one geodesic; writes (τ, X, Y, ζ) samples (steps+1 rows) into
 * `samples` at `offset` floats and returns the valid sample count (≥ 1;
 * truncated early at divergences — clamp, never NaN, per brief §6).
 */
export function integrateGeodesic(
  x0: ArrayLike<number>,
  u0: ArrayLike<number>,
  dLambda: number,
  steps: number,
  samples: Float64Array,
  offset: number,
): number {
  const y = new Float64Array(STATE_SIZE)
  const scratch = new Float64Array(5 * STATE_SIZE)
  for (let i = 0; i < 4; i++) {
    y[i] = x0[i]
    y[4 + i] = u0[i]
  }
  samples.set(y.subarray(0, 4), offset)
  let count = 1
  for (let s = 1; s <= steps; s++) {
    if (!rk4Step(y, dLambda, scratch)) break
    if (
      Math.abs(y[1]) > POSITION_BOUND ||
      Math.abs(y[2]) > POSITION_BOUND ||
      Math.abs(y[4]) > VELOCITY_BOUND ||
      Math.abs(y[5]) > VELOCITY_BOUND ||
      Math.abs(y[6]) > VELOCITY_BOUND
    ) {
      break
    }
    samples.set(y.subarray(0, 4), offset + s * 4)
    count++
  }
  return count
}

/**
 * The launch fan (M5 demo): the center ray is the pure release — the
 * cycle-carrying worldline's instantaneous tangent (1, −ρω sinφ, ρω cosφ, 1/24),
 * λ scaled so u^τ = 1 (λ ≈ coordinate hours) — and with n > 1 the remaining
 * n−1 rays add an in-plane kick of speed `spread` at angles evenly around the
 * circle (measured from the outward radial / phase-needle direction).
 */
export function makeFan(
  tauM: number,
  rho: number,
  phi: number,
  zeta: number,
  n: number,
  spread: number,
): { x0s: Float64Array; u0s: Float64Array } {
  const x0s = new Float64Array(n * 4)
  const u0s = new Float64Array(n * 4)
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const X0 = rho * cos
  const Y0 = rho * sin
  for (let k = 0; k < n; k++) {
    x0s.set([tauM, X0, Y0, zeta], k * 4)
    let vx = 0
    let vy = 0
    if (k > 0) {
      const theta = (2 * Math.PI * (k - 1)) / (n - 1)
      // kick basis: radial (cos, sin) and tangential (−sin, cos)
      vx = spread * (Math.cos(theta) * cos - Math.sin(theta) * sin)
      vy = spread * (Math.cos(theta) * sin + Math.sin(theta) * cos)
    }
    u0s.set([1, -rho * OMEGA * sin + vx, rho * OMEGA * cos + vy, 1 / 24], k * 4)
  }
  return { x0s, u0s }
}
