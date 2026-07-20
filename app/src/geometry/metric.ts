// Induced metric on the constraint surface M, in the ζ-chart (README §15.4 "the
// cleanest chart" / §15.8), plus the proper-time rate and the signature criterion.
import { OMEGA } from './constants'
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
