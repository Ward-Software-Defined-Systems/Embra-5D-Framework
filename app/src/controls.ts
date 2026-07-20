// leva control panel → sim state (brief §7 initial set; D1–D4).
// Values sync into the mutable sim singleton via effects; datum/basis/λ bumps
// paramsVersion so the driver treats the τ jump as a relabeling, not motion.
import { button, useControls } from 'leva'
import { useEffect, useMemo, useRef } from 'react'
import type { TimeBasis } from './geometry/time'
import { tauNow } from './geometry/time'
import { sim } from './sim/simState'
import { MAX_WINDOW_DAYS } from './scene/frame'
import type { ShareState } from './urlState'
import { readUrlState, writeUrlState } from './urlState'

const DATUM_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function parseDatum(s: string): number | null {
  const m = DATUM_RE.exec(s.trim())
  if (!m) return null
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isFinite(ms) ? ms : null
}

export function useSimControls(): void {
  const init = useMemo(() => readUrlState(), [])

  const { datum, basis, longitude } = useControls('time', {
    datum: {
      value: init.d ?? '2000-01-01',
      label: 'datum (UTC)',
      hint: 'the ζ = 0 day — D2; default provisional',
    },
    basis: {
      value: init.b ?? 'mst',
      options: { 'mean solar': 'mst', 'civil (device)': 'civil' },
      label: 'basis',
      hint: 'D3 — MST is the rotation-true basis; civil shows DST kinks',
    },
    longitude: {
      value: init.l ?? 0,
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
      value: init.s ?? 1,
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
    deep: {
      value: Math.log10(Math.max(1, sim.tauMarker)),
      min: 0,
      max: 6,
      step: 0.01,
      label: 'deep scrub τ=10ˣh',
      onChange: (v: number) => {
        sim.offsetH = 10 ** v - tauNow(Date.now(), sim.timeParams)
      },
      transient: true,
    },
    'to epoch (τ = 48 h)': button(() => {
      sim.offsetH = 48 - tauNow(Date.now(), sim.timeParams)
    }),
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
    rho: { value: init.r ?? 0, min: 0, max: 10, step: 0.001, label: 'ρ' },
    psi: { value: init.p ?? 0, min: 0, max: 6.2832, step: 0.001, label: 'ψ rad' },
    zeta0: { value: init.z0 ?? 0, step: 1, label: 'ζ₀ offset' },
    window: { value: init.w ?? 3, min: 1, max: MAX_WINDOW_DAYS, step: 1, label: '± days' },
    grid: { value: init.g ?? true, label: 'polar grid' },
  })

  const { surface, cylinder, signature, nulls, slice } = useControls('overlays', {
    surface: { value: init.cs ?? true, label: 'constraint surface' },
    cylinder: { value: init.lc ?? true, label: 'light cylinder' },
    signature: { value: init.sg ?? false, label: 'signature locus' },
    nulls: { value: init.nh ?? false, label: 'null helices @ ρ' },
    slice: { value: init.zs ?? false, label: 'ζ slice thru now' },
  })

  const { geodesics, rays, spread, horizon } = useControls('geodesics', {
    geodesics: { value: init.gf ?? false, label: 'show fan' },
    rays: { value: init.gr ?? 7, min: 1, max: 15, step: 2, label: 'rays' },
    spread: { value: init.gs ?? 0.3, min: 0.02, max: 1, step: 0.01, label: 'kick speed' },
    horizon: { value: init.gh ?? 12, min: 1, max: 72, step: 1, label: 'horizon h' },
    'launch from now': button(() => {
      sim.geoLaunchNonce++
    }),
  })

  // Apply a shared marker offset once at load (0 = live, the default).
  useEffect(() => {
    if (init.o) sim.offsetH = init.o
  }, [init])

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
    sim.showSurface = surface
    sim.showCylinder = cylinder
    sim.showSignature = signature
    sim.showNullHelices = nulls
    sim.showZetaSlice = slice
    sim.showGeodesics = geodesics
    sim.geoRays = rays
    sim.geoSpread = spread
    sim.geoHorizonH = horizon
    sim.speed = speed
  }, [rho, psi, zeta0, windowDays, grid, surface, cylinder, signature, nulls, slice, geodesics, rays, spread, horizon, speed])

  // Reflect all control values into the URL hash (§8). Values land in a ref
  // each render; a low-frequency writer picks up leva state and the live
  // sim.offsetH together (offsetH mutates outside React via scrub/speed).
  const shareRef = useRef<Omit<ShareState, 'o'>>(null as unknown as Omit<ShareState, 'o'>)
  shareRef.current = {
    d: datum,
    b: basis as TimeBasis,
    l: longitude,
    s: speed,
    r: rho,
    p: psi,
    z0: zeta0,
    w: windowDays,
    g: grid,
    cs: surface,
    lc: cylinder,
    sg: signature,
    nh: nulls,
    zs: slice,
    gf: geodesics,
    gr: rays,
    gs: spread,
    gh: horizon,
  }
  useEffect(() => {
    const id = setInterval(() => {
      writeUrlState({ ...shareRef.current, o: sim.live ? 0 : sim.offsetH })
    }, 1500)
    return () => clearInterval(id)
  }, [])
}
