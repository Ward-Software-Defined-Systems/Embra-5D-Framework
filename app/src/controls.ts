// leva control panel → sim state (brief §7 initial set; D1–D4).
// Values sync into the mutable sim singleton via effects; datum/basis/λ bumps
// paramsVersion so the driver treats the τ jump as a relabeling, not motion.
import { button, useControls } from 'leva'
import { useEffect, useMemo } from 'react'
import type { TimeBasis } from './geometry/time'
import { sim } from './sim/simState'
import { MAX_WINDOW_DAYS } from './scene/frame'

const DATUM_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function parseDatum(s: string): number | null {
  const m = DATUM_RE.exec(s.trim())
  if (!m) return null
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isFinite(ms) ? ms : null
}

export function useSimControls(): void {
  const { datum, basis, longitude } = useControls('time', {
    datum: {
      value: '2000-01-01',
      label: 'datum (UTC)',
      hint: 'the ζ = 0 day — D2; default provisional',
    },
    basis: {
      value: 'mst',
      options: { 'mean solar': 'mst', 'civil (device)': 'civil' },
      label: 'basis',
      hint: 'D3 — MST is the rotation-true basis; civil shows DST kinks',
    },
    longitude: {
      value: 0,
      min: -180,
      max: 180,
      step: 0.25,
      label: 'λ °E',
      hint: 'meridian whose mean noon is φ = π — anchors phase only',
      render: (get) => get('time.basis') === 'mst',
    },
  })

  const [{ speed }, setMotion] = useControls('motion', () => ({
    speed: {
      value: 1,
      options: {
        pause: 0,
        '×1 (live rate)': 1,
        '×60': 60,
        '×3600 · 1 h/s': 3600,
        '×86400 · 1 d/s': 86400,
        '×604800 · 1 wk/s': 604800,
        '−×3600': -3600,
        '−×86400': -86400,
      },
      label: 'speed',
    },
    scrub: {
      value: 0,
      min: -MAX_WINDOW_DAYS,
      max: MAX_WINDOW_DAYS,
      step: 0.01,
      label: 'scrub Δdays',
      onChange: (v: number) => {
        sim.offsetH = v * 24
      },
      transient: true,
    },
    'jump to now': button(() => {
      sim.offsetH = 0
      setMotion({ scrub: 0, speed: 1 })
    }),
    'reset Δs': button(() => {
      sim.ds = 0
    }),
  }))

  const {
    rho,
    psi,
    zeta0,
    window: windowDays,
    grid,
  } = useControls('exploration', {
    rho: { value: 0, min: 0, max: 10, step: 0.001, label: 'ρ' },
    psi: { value: 0, min: 0, max: 6.2832, step: 0.001, label: 'ψ rad' },
    zeta0: { value: 0, step: 1, label: 'ζ₀ offset' },
    window: { value: 3, min: 1, max: MAX_WINDOW_DAYS, step: 1, label: '± days' },
    grid: { value: true, label: 'polar grid' },
  })

  const datumMs = useMemo(() => parseDatum(datum) ?? sim.timeParams.datumMs, [datum])

  useEffect(() => {
    const tp = sim.timeParams
    if (tp.datumMs === datumMs && tp.basis === basis && tp.longitudeDeg === longitude) return
    tp.datumMs = datumMs
    tp.basis = basis as TimeBasis
    tp.longitudeDeg = longitude
    sim.paramsVersion++
  }, [datumMs, basis, longitude])

  useEffect(() => {
    sim.rho = rho
    sim.psi = psi
    sim.zeta0 = zeta0
    sim.windowDays = windowDays
    sim.showGrid = grid
    sim.speed = speed
  }, [rho, psi, zeta0, windowDays, grid, speed])
}
