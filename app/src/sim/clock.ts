// Session proper-arc-length accumulator (brief §7): Δs integrates
// dΔs/dτ = √(ρ²ω² + z_τ²) along whatever worldline the marker is riding.
// At ρ = 0 the rate is exactly zero — τ ticks, Δs stays frozen at 0.000.
import { properTimeRate } from '../geometry/metric'

/**
 * τ → 0 guard (brief §6): near the cone z_τ diverges; clamp the integrand
 * rather than let NaN/∞ poison the accumulator. The true integral ∫|z_τ|dτ
 * diverges across τ = 0, so a huge-but-finite Δs is the honest rendering.
 */
const RATE_CAP = 1e6

export function properTimeRateSafe(tau: number, rho: number): number {
  if (rho === 0) return 0 // exact null rest — the centerpiece identity (§15.6)
  const rate = properTimeRate(tau, rho)
  if (!Number.isFinite(rate)) return RATE_CAP
  return Math.min(rate, RATE_CAP)
}

/**
 * Advance Δs across a marker step τ₀ → τ₁ (signed: rewinding subtracts).
 * Midpoint rule — the rate is constant to ~1e-10 over any ±30-day window at
 * present-day τ, so one evaluation per frame is exact for display purposes.
 */
export function integrateDs(ds: number, tau0: number, tau1: number, rho: number): number {
  if (tau0 === tau1) return ds
  return ds + properTimeRateSafe((tau0 + tau1) / 2, rho) * (tau1 - tau0)
}
