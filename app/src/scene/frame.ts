// The floating-origin display frame (brief §6 — mandatory).
//
// Display axes: the event plane (ρ, φ) maps to (x, z) and the ζ-climb maps to
// y, recentered every frame so the marker's height is y = 0. All positions are
// computed in f64 CPU-side (φ = ωτ at τ ~ 2.3e5 must never touch f32 trig) and
// only the small recentered coordinates are uploaded to the GPU. ζ₀ shifts the
// worldline and its marker identically, so it cancels here; it stays visible in
// the HUD and starts mattering when M4 adds ζ-anchored geometry.
import { OMEGA } from '../geometry/constants'

/** Display units per day of ζ-climb (one helix winding). */
export const DAY_HEIGHT = 2

/** Polyline resolution — one winding needs ~a hundred segments to read as smooth. */
export const SEGMENTS_PER_DAY = 128

/** Hard cap for the ±N-day window control (buffers are preallocated to this). */
export const MAX_WINDOW_DAYS = 30

/**
 * Display position of the worldline event at cumulative time τ, on the
 * (ρ, ψ) worldline, in the frame centered on the marker's height.
 * Writes [x, y, z] into `out` at offset i and returns `out`.
 */
export function displayPos(
  tau: number,
  rho: number,
  psi: number,
  tauMarker: number,
  out: Float32Array | number[],
  i = 0,
): Float32Array | number[] {
  const phi = OMEGA * tau + psi
  out[i] = rho * Math.cos(phi)
  out[i + 1] = ((tau - tauMarker) / 24) * DAY_HEIGHT
  out[i + 2] = -rho * Math.sin(phi)
  return out
}

/** Marker phase angle φ (for the phase needle), reduced to [0, 2π). */
export function markerPhase(tauMarker: number, psi: number): number {
  const twoPi = 2 * Math.PI
  return (((OMEGA * tauMarker + psi) % twoPi) + twoPi) % twoPi
}

/**
 * The constraint-surface patch through the current worldline (M4) is the
 * fixed-(ψ, ζ₀) helicoid: the (τ, ρ) 2-slice of M rendered in display space.
 * In the marker-local frame (δ = τ − τ_marker, phase measured from the
 * marker's φ) it is STATIC geometry:
 *
 *   local(δ, ρ) = (ρ·cos(ωδ), (δ/24)·DAY_HEIGHT, −ρ·sin(ωδ))
 *
 * and the live surface is local(δ, ρ) rotated about y by markerPhase — an
 * exact identity with displayPos (cos(a+b) expansion), locked by a test.
 * So the mesh is rebuilt only when the window/patch size changes; each frame
 * just sets rotation.y.
 */
export function helicoidLocalPos(
  delta: number,
  rho: number,
  out: Float32Array | number[],
  i = 0,
): Float32Array | number[] {
  const a = OMEGA * delta
  out[i] = rho * Math.cos(a)
  out[i + 1] = (delta / 24) * DAY_HEIGHT
  out[i + 2] = -rho * Math.sin(a)
  return out
}

/** Radial extent of the surface patch / plane furniture: always contains the worldline, grows in 0.5 steps. */
export function patchRhoMax(rho: number): number {
  return Math.max(5, Math.ceil((rho * 1.05) / 0.5) * 0.5)
}
