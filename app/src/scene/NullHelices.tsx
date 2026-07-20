// Null helices at the current radius (§7 overlay): the one-parameter family
// of h-null curves through the marker at fixed ρ, winding at dφ/dτ = k and
// climbing at dζ/dτ = √(1 − ρ²k² − z_τ²)/24. The family interpolates between
// the flat photon circles (k = ±1/ρ) and the vertical null climber (k = 0 —
// rest is lightlike at any radius). ζ is accumulated by trapezoid so the
// curves stay honest where z_τ varies (near the epoch, where the root closes
// and they flatten out — the clamp, not NaN).
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Group, Line, LineBasicMaterial } from 'three'
import { nullHelixZetaRate } from '../geometry/metric'
import { sim } from '../sim/simState'
import { DAY_HEIGHT, markerPhase } from './frame'

// Winding fractions f = ρk: ±1 are the photon circles, 0 the vertical climber.
const FRACTIONS = [0, 0.4, -0.4, 0.7, -0.7, 1, -1]
const MAX_PTS = 1441
const MIN_RHO = 0.15 // below this the family degenerates onto the axis (already drawn)

function makeCurve(): Line<BufferGeometry, LineBasicMaterial> {
  const geom = new BufferGeometry()
  const attr = new BufferAttribute(new Float32Array(MAX_PTS * 3), 3)
  attr.setUsage(DynamicDrawUsage)
  geom.setAttribute('position', attr)
  const line = new Line(geom, new LineBasicMaterial({ color: '#e0d5a5', transparent: true, opacity: 0.8 }))
  line.frustumCulled = false
  return line
}

export function NullHelices() {
  const group = useMemo(() => new Group(), [])
  const curves = useMemo(() => FRACTIONS.map(makeCurve), [])

  useEffect(() => {
    for (const c of curves) group.add(c)
    return () => {
      for (const c of curves) {
        group.remove(c)
        c.geometry.dispose()
        c.material.dispose()
      }
    }
  }, [group, curves])

  useFrame(() => {
    const { rho, tauMarker, windowDays } = sim
    group.visible = sim.showNullHelices && rho >= MIN_RHO
    if (!group.visible) return
    const phiM = markerPhase(tauMarker, sim.psi)
    for (let c = 0; c < FRACTIONS.length; c++) {
      const k = FRACTIONS[c] / rho
      // Fine enough steps that one winding stays smooth, within the point budget.
      const dTau = Math.min(0.5, Math.max(0.02, 0.1 / Math.max(Math.abs(k), 1e-9)))
      const halfCount = Math.min((MAX_PTS - 1) / 2, Math.floor((windowDays * 24) / dTau))
      const total = 2 * halfCount + 1
      const attr = curves[c].geometry.getAttribute('position') as BufferAttribute
      const a = attr.array as Float32Array
      // Outward from the marker in both τ directions, accumulating ζ.
      for (const dir of [1, -1]) {
        let zetaRel = 0
        let prevRate = nullHelixZetaRate(tauMarker, rho, k)
        for (let j = dir === 1 ? 0 : 1; j <= halfCount; j++) {
          const delta = dir * j * dTau
          const rate = nullHelixZetaRate(tauMarker + delta, rho, k)
          if (j > 0) zetaRel += dir * 0.5 * (prevRate + rate) * dTau
          prevRate = rate
          const phi = phiM + k * delta
          const idx = (halfCount + dir * j) * 3
          a[idx] = rho * Math.cos(phi)
          a[idx + 1] = zetaRel * DAY_HEIGHT
          a[idx + 2] = -rho * Math.sin(phi)
        }
      }
      curves[c].geometry.setDrawRange(0, total)
      attr.needsUpdate = true
    }
  })

  return <primitive object={group} />
}
