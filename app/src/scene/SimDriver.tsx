// Per-frame sim driver — runs before every scene callback (priority −10) and
// is the only writer of sim's per-frame outputs.
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { dateMsFromTau, dayTicks, tauNow } from '../geometry/time'
import { integrateDs, properTimeRateSafe } from '../sim/clock'
import { sim } from '../sim/simState'

// After a background-tab suspend rAF deltas can be minutes; clamp so a resumed
// frame can't teleport the marker at high speed multipliers.
const MAX_FRAME_S = 0.25

export function SimDriver() {
  const started = useRef(false)
  const seenVersion = useRef(sim.paramsVersion)
  const tickKey = useRef('')

  useFrame((_, delta) => {
    const p = sim.timeParams
    const dtH = Math.min(delta, MAX_FRAME_S) / 3600
    if (sim.speed !== 1) sim.offsetH += (sim.speed - 1) * dtH

    const tauPrev = sim.tauMarker
    const tau = tauNow(Date.now(), p) + sim.offsetH

    if (seenVersion.current !== sim.paramsVersion) {
      // Datum/basis/λ changed: τ was relabeled, not traversed — no Δs accrual.
      seenVersion.current = sim.paramsVersion
    } else if (started.current) {
      sim.ds = integrateDs(sim.ds, tauPrev, tau, sim.rho)
    }
    started.current = true

    sim.tauMarker = tau
    sim.dsRate = properTimeRateSafe(tau, sim.rho)
    sim.markerDateMs = dateMsFromTau(tau, p)
    sim.live = Math.abs(sim.offsetH) < 1e-9 && sim.speed === 1

    // Day ticks change only when a window edge crosses a day boundary.
    const tauMin = tau - sim.windowDays * 24
    const tauMax = tau + sim.windowDays * 24
    const key = `${Math.floor(tauMin / 24)}|${Math.floor(tauMax / 24)}|${sim.paramsVersion}`
    if (key !== tickKey.current) {
      tickKey.current = key
      sim.ticks = dayTicks(tauMin, tauMax, p)
    }
  }, -10)

  return null
}
