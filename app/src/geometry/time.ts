// The now-point time pipeline (brief §4, decisions D1–D3).
// τ is cumulative hours since the datum (D1); the datum defines τ=0 and ζ=0 jointly.

export type TimeBasis = 'mst' | 'civil'

export interface TimeParams {
  /** Datum as UTC milliseconds. Default: 2000-01-01 00:00 UTC (D2, revisitable). */
  datumMs: number
  /** Time basis (D3). */
  basis: TimeBasis
  /** Longitude λ in degrees, east-positive, for Mean Solar Time (D3). */
  longitudeDeg: number
}

/** D2 default datum: 2000-01-01 00:00 UTC. */
export const DEFAULT_DATUM_MS = Date.UTC(2000, 0, 1, 0, 0, 0)

const MS_PER_HOUR = 3_600_000

/**
 * τ_now — cumulative hours since the datum, on the chosen basis (brief §4, D3).
 * The datum is a fixed UTC instant; the basis applies a phase offset:
 *  - MST:   + λ/15 hours (φ = π ↔ mean noon on meridian λ);
 *  - Civil: + the device's UTC offset at `now` (its DST jumps show as worldline kinks).
 */
export function tauNow(nowMs: number, p: TimeParams): number {
  const hoursSinceDatumUTC = (nowMs - p.datumMs) / MS_PER_HOUR
  if (p.basis === 'mst') {
    return hoursSinceDatumUTC + p.longitudeDeg / 15
  }
  const offsetHours = -new Date(nowMs).getTimezoneOffset() / 60 // east-positive
  return hoursSinceDatumUTC + offsetHours
}

/** ζ = τ/24 (accumulated cycles). */
export function zetaFromTau(tau: number): number {
  return tau / 24
}

/** Wall clock = τ mod 24, in [0, 24). */
export function clockDisplay(tau: number): number {
  return ((tau % 24) + 24) % 24
}
