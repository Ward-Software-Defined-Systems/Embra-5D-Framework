// Shared mutable sim state — the one place per-frame values live.
// Written by <SimDriver> (leva controls sync in via React effects); read
// imperatively by the scene's useFrame callbacks and the HUD's rAF loop,
// so nothing re-renders at 60 fps.
import type { DayTick, TimeBasis, TimeParams } from '../geometry/time'
import { DEFAULT_DATUM_MS, tauNow } from '../geometry/time'

export interface SimState {
  /** Mutated in place so per-frame reads never chase a stale object. */
  timeParams: TimeParams
  /** Bumped when datum/basis/λ change — a relabeling of τ, not motion; the driver skips Δs that frame. */
  paramsVersion: number

  /** Marker offset from the live now, in hours (scrub + speed accumulate here; 0 = live). */
  offsetH: number
  /** Speed multiplier (1 = wall rate, 0 = pause, negative = rewind). */
  speed: number

  /** Exploration controls (D4): worldline the marker is riding. */
  rho: number
  psi: number
  zeta0: number
  /** Rendered window half-width, days (§6, default ±3). */
  windowDays: number
  showGrid: boolean

  /** Per-frame outputs (driver-written). */
  tauMarker: number
  markerDateMs: number
  ds: number
  dsRate: number
  live: boolean
  ticks: DayTick[]
}

const defaultParams: TimeParams = {
  datumMs: DEFAULT_DATUM_MS,
  basis: 'mst' as TimeBasis,
  longitudeDeg: 0,
}

export const sim: SimState = {
  timeParams: defaultParams,
  paramsVersion: 0,
  offsetH: 0,
  speed: 1,
  rho: 0,
  psi: 0,
  zeta0: 0,
  windowDays: 3,
  showGrid: true,
  tauMarker: tauNow(Date.now(), defaultParams),
  markerDateMs: Date.now(),
  ds: 0,
  dsRate: 0,
  live: true,
  ticks: [],
}
