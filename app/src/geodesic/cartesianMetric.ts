// The induced metric on M in the inertial Cartesian chart (τ, X, Y, ζ), where
// (X, Y) = ρ(cos φ, sin φ) is the bulk event plane. Same geometry as the
// review's ζ-chart h_μν (equivalence locked by a Jacobian-pullback test) but
// regular through the axis: the polar chart's h_ψψ = ρ² degenerates at ρ = 0,
// which is exactly where the default fan launches. The rotating-frame ω terms
// vanish here — they belong to the cycle *constraint*, and free geodesics
// don't carry it.
//
//   g_ττ = −1 + z_τ²   g_τX = z_τ z_X   g_τY = z_τ z_Y
//   g_XX = 1 + z_X²    g_XY = z_X z_Y   g_YY = 1 + z_Y²    g_ζζ = σ² = 576
//
// with z_X = z₀X/(τ√(τ² + ρ²)) (= z_ρ·X/ρ, smooth at ρ = 0 — the corrected
// z_ρ carries the 1/τ) and z_τ = −z₀ρ²/(τ²√(τ² + ρ²)) as in the embedding.
import { SIGMA, Z0 } from '../geometry/constants'
import { zTau } from '../geometry/embedding'

export const G_ZETA_ZETA = SIGMA * SIGMA

/** Symmetric (τ, X, Y) block, packed [ττ, τX, τY, XX, XY, YY]. */
export type MetricBlock = [number, number, number, number, number, number]

export function metricBlockAt(tau: number, X: number, Y: number, out: MetricBlock): MetricBlock {
  const rho = Math.hypot(X, Y)
  const zt = zTau(tau, rho)
  const s = Z0 / (tau * Math.hypot(tau, rho)) // z_ρ/ρ, smooth through the axis
  const zx = s * X
  const zy = s * Y
  out[0] = -1 + zt * zt
  out[1] = zt * zx
  out[2] = zt * zy
  out[3] = 1 + zx * zx
  out[4] = zx * zy
  out[5] = 1 + zy * zy
  return out
}

/** h(u, u) for a chart 4-velocity u = (u^τ, u^X, u^Y, u^ζ) at event (τ, X, Y). */
export function hNorm(tau: number, X: number, Y: number, u: ArrayLike<number>): number {
  const g: MetricBlock = [0, 0, 0, 0, 0, 0]
  metricBlockAt(tau, X, Y, g)
  const [ut, ux, uy, uz] = [u[0], u[1], u[2], u[3]]
  return (
    g[0] * ut * ut +
    2 * g[1] * ut * ux +
    2 * g[2] * ut * uy +
    g[3] * ux * ux +
    2 * g[4] * ux * uy +
    g[5] * uy * uy +
    G_ZETA_ZETA * uz * uz
  )
}

/**
 * Angular momentum p_φ = g(∂_φ, u) with ∂_φ = −Y ∂_X + X ∂_Y — the rotation
 * Killing vector (the metric is axisymmetric: z depends on ρ only). Conserved
 * along geodesics; used as an integrator invariant in tests.
 */
export function angularMomentum(tau: number, X: number, Y: number, u: ArrayLike<number>): number {
  const g: MetricBlock = [0, 0, 0, 0, 0, 0]
  metricBlockAt(tau, X, Y, g)
  const kx = -Y
  const ky = X
  // (g u)_X and (g u)_Y contracted with the Killing components
  const gux = g[1] * u[0] + g[3] * u[1] + g[4] * u[2]
  const guy = g[2] * u[0] + g[4] * u[1] + g[5] * u[2]
  return kx * gux + ky * guy
}
