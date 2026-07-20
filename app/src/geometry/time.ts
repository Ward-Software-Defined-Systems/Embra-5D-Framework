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
const MS_PER_DAY = 24 * MS_PER_HOUR

/**
 * Basis offset in hours (east-positive) at a given instant (D3):
 * MST is a constant λ/15; civil is the device's UTC offset *at that instant*,
 * which is what makes DST jumps real, visible kinks downstream.
 */
export function basisOffsetHours(nowMs: number, p: TimeParams): number {
  if (p.basis === 'mst') return p.longitudeDeg / 15
  return -new Date(nowMs).getTimezoneOffset() / 60
}

/**
 * τ_now — cumulative hours since the datum, on the chosen basis (brief §4, D3).
 * The datum is a fixed UTC instant; the basis applies a phase offset:
 *  - MST:   + λ/15 hours (φ = π ↔ mean noon on meridian λ);
 *  - Civil: + the device's UTC offset at `now` (its DST jumps show as worldline kinks).
 */
export function tauNow(nowMs: number, p: TimeParams): number {
  return (nowMs - p.datumMs) / MS_PER_HOUR + basisOffsetHours(nowMs, p)
}

/**
 * Inverse of tauNow: the calendar instant (UTC ms) at which the marker sits at τ.
 * MST inverts exactly; civil needs the offset *at the answer*, so fixed-point
 * iterate (the offset is piecewise constant — converges immediately away from
 * the two DST edges, where the hour is genuinely ambiguous/absent anyway).
 */
export function dateMsFromTau(tau: number, p: TimeParams): number {
  let ms = p.datumMs + tau * MS_PER_HOUR
  for (let i = 0; i < 3; i++) {
    ms = p.datumMs + (tau - basisOffsetHours(ms, p)) * MS_PER_HOUR
  }
  return ms
}

/**
 * A day boundary crossing the worldline window: midnight on the active basis.
 *  - MST: mean midnight on meridian λ — exactly τ = 24k, uniformly spaced.
 *    `labelMs` is datum + k days, whose *UTC* calendar date is the mean-solar
 *    date at the meridian (format it with UTC getters).
 *  - Civil: the device's local midnights mapped through tauNow — unevenly
 *    spaced in τ across DST transitions (the D3 kink, kept on purpose).
 *    `labelMs` is the midnight instant (format it with local getters).
 */
export interface DayTick {
  /** τ (cumulative hours) of the day boundary. */
  tau: number
  /** Calendar instant to derive the label date from (see basis note above). */
  labelMs: number
  /** Stable integer key: whole days since the datum. */
  dayIndex: number
}

export function dayTicks(tauMin: number, tauMax: number, p: TimeParams): DayTick[] {
  const ticks: DayTick[] = []
  if (!(tauMax > tauMin)) return ticks
  if (p.basis === 'mst') {
    const k0 = Math.ceil(tauMin / 24)
    const k1 = Math.floor(tauMax / 24)
    for (let k = k0; k <= k1; k++) {
      ticks.push({ tau: 24 * k, labelMs: p.datumMs + k * MS_PER_DAY, dayIndex: k })
    }
    return ticks
  }
  // Civil: enumerate local calendar midnights covering the window.
  const start = new Date(dateMsFromTau(tauMin, p))
  const y = start.getFullYear()
  const m = start.getMonth()
  const d = start.getDate()
  const maxDays = Math.ceil((tauMax - tauMin) / 24) + 2
  for (let i = -1; i <= maxDays; i++) {
    const midMs = new Date(y, m, d + i, 0, 0, 0, 0).getTime()
    const tau = tauNow(midMs, p)
    if (tau < tauMin) continue
    if (tau > tauMax) break
    ticks.push({ tau, labelMs: midMs, dayIndex: Math.round((midMs - p.datumMs) / MS_PER_DAY) })
  }
  return ticks
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/** Deterministic short label for a DayTick ("Sun 19 Jul"), on the tick's own basis. */
export function formatDayLabel(labelMs: number, p: TimeParams): string {
  const dt = new Date(labelMs)
  return p.basis === 'mst'
    ? `${WEEKDAYS[dt.getUTCDay()]} ${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`
    : `${WEEKDAYS[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]}`
}

/** ζ = τ/24 (accumulated cycles). */
export function zetaFromTau(tau: number): number {
  return tau / 24
}

/** Wall clock = τ mod 24, in [0, 24). */
export function clockDisplay(tau: number): number {
  return ((tau % 24) + 24) % 24
}
