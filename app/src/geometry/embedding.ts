// Spiral embedding and the now-point pipeline (README §15.3–15.4, brief §4).
import { OMEGA, Z0 } from './constants'

/** z(τ, ρ) = z₀·√(1 + ρ²/τ²) — vertical spiral displacement (README §15.3). */
export function z(tau: number, rho: number): number {
  return Z0 * Math.sqrt(1 + (rho * rho) / (tau * tau))
}

/** z_τ = ∂z/∂τ = −z₀ρ² / (τ²·√(τ²+ρ²)). */
export function zTau(tau: number, rho: number): number {
  const r = Math.hypot(tau, rho)
  return (-Z0 * rho * rho) / (tau * tau * r)
}

/**
 * z_ρ = ∂z/∂ρ = z₀ρ / (τ·√(τ²+ρ²)).
 * Note the 1/τ — the corrected form. An earlier draft AND the technical review
 * both dropped it; verify/verify_geometry.py locks this in.
 */
export function zRho(tau: number, rho: number): number {
  const r = Math.hypot(tau, rho)
  return (Z0 * rho) / (tau * r)
}

/** The now-point (brief §4): purely temporal, on the stationary (ρ=0) worldline. */
export interface NowPoint {
  tau: number
  zeta: number
  phi: number
  rho: number
  z: number
  psi: number
}

export function nowPoint(tauNow: number, psi = 0): NowPoint {
  return {
    tau: tauNow,
    zeta: tauNow / 24,
    phi: OMEGA * tauNow + psi,
    rho: 0,
    z: Z0, // z(τ, 0) = z₀ exactly
    psi,
  }
}
