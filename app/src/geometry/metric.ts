// Induced metric on the constraint surface M, in the ζ-chart (README §15.4 "the
// cleanest chart" / §15.8), plus the proper-time rate and the signature criterion.
import { OMEGA, Z0 } from './constants'
import { zRho, zTau } from './embedding'

/**
 * Non-zero components of the ζ-chart induced metric h_μν (coords τ, ρ, ψ, ζ), c=1, σ=24:
 *   h_ττ = −(1 − ρ²ω² − z_τ²)   h_τρ = z_τ z_ρ   h_τψ = ρ²ω
 *   h_ρρ = 1 + z_ρ²             h_ψψ = ρ²        h_ζζ = 576
 * ζ is a flat spectator (all ζ cross-terms vanish); the (τ,ρ,ψ) block is
 * rotating-frame Minkowski + the single cone term.
 */
export interface MetricComponents {
  h_tt: number
  h_tr: number
  h_tp: number
  h_rr: number
  h_pp: number
  h_zz: number
}

export function inducedMetricZeta(tau: number, rho: number): MetricComponents {
  const zt = zTau(tau, rho)
  const zr = zRho(tau, rho)
  const w = OMEGA
  return {
    h_tt: -(1 - rho * rho * w * w - zt * zt),
    h_tr: zt * zr,
    h_tp: rho * rho * w,
    h_rr: 1 + zr * zr,
    h_pp: rho * rho,
    h_zz: 576,
  }
}

/**
 * Proper-time accrual rate along a cycle-carrying (fixed-ζ₀) worldline (README §15.6):
 *   dΔs/dτ = √(ρ²ω² + z_τ²)
 * Zero at ρ=0 (rest is null — the centerpiece), ≈ ρω at present-day τ.
 */
export function properTimeRate(tau: number, rho: number): number {
  const zt = zTau(tau, rho)
  return Math.sqrt(rho * rho * OMEGA * OMEGA + zt * zt)
}

export type Signature = 'lorentzian' | 'degenerate' | 'riemannian'

/**
 * Pointwise signature of h (README §15.5): Lorentzian where z_τ² < 1 + z_ρ².
 * The Riemannian pocket + signature-change surface live only in the early-time,
 * steep-cone corner (ρ > τ); the intended regime is uniformly Lorentzian.
 */
export function signatureAt(tau: number, rho: number): Signature {
  const zt = zTau(tau, rho)
  const zr = zRho(tau, rho)
  const lhs = zt * zt
  const rhs = 1 + zr * zr
  if (Math.abs(lhs - rhs) < 1e-12) return 'degenerate'
  return lhs < rhs ? 'lorentzian' : 'riemannian'
}

/**
 * The signature-change locus ρ_sig(τ): the radius where z_τ² = 1 + z_ρ²
 * (README §15.5). Substituting the embedding partials and clearing
 * denominators gives a quadratic in u = ρ²:
 *   z₀²u² − (z₀²τ² + τ⁴)u − τ⁶ = 0
 * whose positive root is exact. For τ ≪ z₀ it hugs the cone from outside,
 * ρ_sig ≈ τ·(1 + ¾τ²/z₀²) — the Riemannian pocket is the region ρ > ρ_sig,
 * reachable only near the epoch. Even in τ; ρ_sig(0) = 0.
 */
export function signatureLocusRho(tau: number): number {
  const t2 = tau * tau
  const z2 = Z0 * Z0
  const a = z2 * t2 + t2 * t2
  const u = (a + Math.sqrt(a * a + 4 * z2 * t2 * t2 * t2)) / (2 * z2)
  return Math.sqrt(u)
}

/**
 * ζ-climb rate of a null helix at fixed radius ρ winding at dφ/dτ = k
 * (README §15.2 null structure; overlay in brief §7). From h(u,u) = 0 with
 * u = ∂_τ + (k − ω)∂_ψ + (dζ/dτ)∂_ζ:
 *   dζ/dτ = √(1 − ρ²k² − z_τ²) / 24
 * k = ±1/ρ gives the flat photon circles (dζ = 0); k = 0 the vertical null
 * climbers (rest is lightlike at any radius); k = ω co-rotates and exists
 * only inside the light cylinder. Clamped to 0 where the root turns
 * imaginary or z_τ diverges (τ → 0), per brief §6.
 */
export function nullHelixZetaRate(tau: number, rho: number, k: number): number {
  const zt = zTau(tau, rho)
  const zt2 = Number.isFinite(zt) ? zt * zt : Number.POSITIVE_INFINITY
  const s = 1 - rho * rho * k * k - zt2
  return s > 0 ? Math.sqrt(s) / 24 : 0
}
