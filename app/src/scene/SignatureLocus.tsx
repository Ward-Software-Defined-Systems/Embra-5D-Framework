// The signature-change locus (§7 overlay): the curve ρ = ρ_sig(τ) on the
// helicoid where z_τ² = 1 + z_ρ² and the induced metric degenerates —
// the boundary of the Riemannian pocket. It hugs the cone ρ ≈ |τ| from
// outside, so it only enters the patch when the marker is within hours of
// the epoch: scrub deep to see it. Lives in the same marker-local rotated
// frame as the surface patch.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, DynamicDrawUsage, LineBasicMaterial, LineSegments } from 'three'
import { signatureLocusRho } from '../geometry/metric'
import { sim } from '../sim/simState'
import { helicoidLocalPos, markerPhase, patchRhoMax } from './frame'

const SAMPLES = 128 // per branch (τ > 0 and τ < 0)
const MAX_FLOATS = 2 * (SAMPLES - 1) * 2 * 3

export function SignatureLocus() {
  const locus = useMemo(() => {
    const geom = new BufferGeometry()
    const attr = new BufferAttribute(new Float32Array(MAX_FLOATS), 3)
    attr.setUsage(DynamicDrawUsage)
    geom.setAttribute('position', attr)
    const obj = new LineSegments(geom, new LineBasicMaterial({ color: '#ff5e9c', transparent: true, opacity: 0.95 }))
    obj.frustumCulled = false
    return obj
  }, [])

  useEffect(() => {
    return () => {
      locus.geometry.dispose()
      locus.material.dispose()
    }
  }, [locus])

  useFrame(() => {
    locus.visible = sim.showSignature
    if (!sim.showSignature) return
    const { tauMarker, windowDays } = sim
    const rhoMax = patchRhoMax(sim.rho)
    const halfWindow = windowDays * 24
    const attr = locus.geometry.getAttribute('position') as BufferAttribute
    const a = attr.array as Float32Array
    let o = 0
    const prev = [0, 0, 0]
    const cur = [0, 0, 0]
    // The locus is parameterized by bulk time t ≥ 0, mirrored to ±t; sample
    // finely over the only region where it can intersect the patch (ρ ≤ rhoMax).
    for (const sign of [1, -1]) {
      let havePrev = false
      for (let s = 0; s < SAMPLES; s++) {
        const t = (rhoMax * s) / (SAMPLES - 1)
        const rho = signatureLocusRho(t)
        const delta = sign * t - tauMarker
        const inside = rho <= rhoMax && Math.abs(delta) <= halfWindow
        if (inside) {
          helicoidLocalPos(delta, rho, cur)
          if (havePrev) {
            a[o++] = prev[0]
            a[o++] = prev[1]
            a[o++] = prev[2]
            a[o++] = cur[0]
            a[o++] = cur[1]
            a[o++] = cur[2]
          }
          prev[0] = cur[0]
          prev[1] = cur[1]
          prev[2] = cur[2]
          havePrev = true
        } else {
          havePrev = false
        }
      }
    }
    locus.geometry.setDrawRange(0, o / 3)
    attr.needsUpdate = true
    locus.rotation.y = markerPhase(tauMarker, sim.psi)
  })

  return <primitive object={locus} />
}
