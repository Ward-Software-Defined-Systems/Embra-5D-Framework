// The HUD — the thesis, live on screen (§7): coordinate time τ ticks forward
// while Δs holds at exactly 0.000 on the stationary worldline, and ignites the
// moment ρ leaves zero. DOM updates are imperative (rAF + textContent), so the
// React tree renders once.
import { useEffect, useRef } from 'react'
import { signatureAt } from '../geometry/metric'
import { clockDisplay, zetaFromTau } from '../geometry/time'
import { markerPhase } from '../scene/frame'
import { sim } from '../sim/simState'
import './hud.css'

const fmtGrouped3 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
})
const fmtGrouped4 = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function fmtClock(tau: number): string {
  const c = clockDisplay(tau)
  const h = Math.floor(c)
  const m = Math.floor((c - h) * 60)
  const s = Math.floor(((c - h) * 60 - m) * 60)
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`
}

/** Marker's calendar reading on the active basis (MST: the meridian's clock). */
function fmtMarkerDate(): string {
  const p = sim.timeParams
  const d =
    p.basis === 'mst' ? new Date(sim.markerDateMs + (p.longitudeDeg / 15) * 3_600_000) : new Date(sim.markerDateMs)
  const [y, mo, da, h, mi] =
    p.basis === 'mst'
      ? [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()]
      : [d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]
  return `${y}-${pad2(mo + 1)}-${pad2(da)} ${pad2(h)}:${pad2(mi)}`
}

function fmtDs(ds: number): string {
  return Math.abs(ds) < 1e6 ? fmtGrouped3.format(ds) : ds.toExponential(3)
}

function fmtDatum(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

export function Hud() {
  const badge = useRef<HTMLElement>(null)
  const tau = useRef<HTMLElement>(null)
  const clock = useRef<HTMLElement>(null)
  const date = useRef<HTMLElement>(null)
  const zeta = useRef<HTMLElement>(null)
  const phi = useRef<HTMLElement>(null)
  const expl = useRef<HTMLElement>(null)
  const sig = useRef<HTMLElement>(null)
  const dsBlock = useRef<HTMLDivElement>(null)
  const ds = useRef<HTMLDivElement>(null)
  const caption = useRef<HTMLElement>(null)
  const rate = useRef<HTMLElement>(null)
  const foot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const t = sim.tauMarker
      const p = sim.timeParams
      if (badge.current) {
        badge.current.textContent = sim.live ? 'LIVE' : 'SIM'
        badge.current.className = sim.live ? 'badge live' : 'badge sim'
      }
      if (tau.current) tau.current.textContent = `${fmtGrouped3.format(t)} h`
      if (clock.current) clock.current.textContent = fmtClock(t)
      if (date.current) date.current.textContent = fmtMarkerDate()
      if (zeta.current) zeta.current.textContent = fmtGrouped4.format(zetaFromTau(t) + sim.zeta0)
      if (phi.current) phi.current.textContent = `${markerPhase(t, sim.psi).toFixed(3)} rad`
      if (expl.current)
        expl.current.textContent = `ρ ${sim.rho.toFixed(3)} · ψ ${sim.psi.toFixed(3)} · ζ₀ ${sim.zeta0}`
      if (sig.current) {
        const s = signatureAt(t, sim.rho)
        sig.current.textContent =
          s === 'lorentzian' ? 'Lorentzian (−,+,+,+)' : s === 'riemannian' ? 'RIEMANNIAN POCKET' : 'degenerate (locus)'
        sig.current.className = s === 'lorentzian' ? '' : 'sig-alert'
      }
      if (ds.current) ds.current.textContent = fmtDs(sim.ds)
      if (dsBlock.current) dsBlock.current.className = sim.dsRate > 0 ? 'hud-ds accruing' : 'hud-ds'
      if (caption.current)
        caption.current.textContent =
          sim.dsRate > 0
            ? `accruing at ${sim.dsRate.toFixed(4)} per hour (≈ ρω)${sim.dsRate > 1 ? ' — beyond the light cylinder' : ''}`
            : 'rest is null — proper time has not begun to flow'
      if (rate.current) rate.current.textContent = sim.dsRate.toFixed(4)
      if (foot.current) {
        const basisLabel = p.basis === 'mst' ? `MST λ ${p.longitudeDeg.toFixed(2)}°E` : 'civil (device)'
        const offsetDays = sim.offsetH / 24
        const offset = sim.live ? '' : ` · offset ${offsetDays >= 0 ? '+' : ''}${offsetDays.toFixed(2)} d`
        foot.current.textContent = `${basisLabel} · datum ${fmtDatum(p.datumMs)} · ×${sim.speed}${offset}`
      }
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="hud">
      <div className="hud-title">
        <span>EMBRA 5D</span>
        <span className="sub">now-point</span>
        <em ref={badge} className="badge live">
          LIVE
        </em>
      </div>
      <div className="hud-row">
        <span className="k">τ</span>
        <span ref={tau} />
      </div>
      <div className="hud-row">
        <span className="k">clock</span>
        <span ref={clock} />
      </div>
      <div className="hud-row">
        <span className="k">date</span>
        <span ref={date} />
      </div>
      <div className="hud-row">
        <span className="k">ζ</span>
        <span ref={zeta} />
      </div>
      <div className="hud-row">
        <span className="k">φ</span>
        <span ref={phi} />
      </div>
      <div className="hud-row">
        <span className="k">worldline</span>
        <span ref={expl} />
      </div>
      <div className="hud-row">
        <span className="k">signature</span>
        <span ref={sig} />
      </div>
      <div ref={dsBlock} className="hud-ds">
        <div className="hud-row">
          <span className="k">Δs proper arc length</span>
          <span className="k rate-k">
            dΔs/dτ <span ref={rate} />
          </span>
        </div>
        <div className="value" ref={ds} />
        <em className="caption" ref={caption} />
      </div>
      <div className="hud-foot" ref={foot} />
    </div>
  )
}
