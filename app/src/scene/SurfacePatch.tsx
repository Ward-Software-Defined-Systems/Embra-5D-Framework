// The constraint-surface patch (§7): the fixed-(ψ, ζ₀) helicoid through the
// current worldline — the (τ, ρ) 2-slice of M in display space — colored by
// the proper-time rate dΔs/dτ. Geometry lives in the marker-local frame and
// is static; each frame only sets rotation.y = markerPhase (identity locked
// in frame.test.ts). Colors carry the cone/spiral structure: near-black null
// axis, the rate = 1 light band (the light cylinder at present-day τ,
// detaching inward at small τ), amber beyond.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Mesh,
  MeshBasicMaterial,
} from 'three'
import { zRho, zTau } from '../geometry/embedding'
import { properTimeRateSafe } from '../sim/clock'
import { sim } from '../sim/simState'
import { helicoidLocalPos, markerPhase, MAX_WINDOW_DAYS, patchRhoMax } from './frame'
import { rateToColor } from './rateColor'

const SEGS_PER_DAY = 48
const RHO_SEGS = 48
const MAX_TAU_SEGS = 2 * MAX_WINDOW_DAYS * SEGS_PER_DAY
const MAX_VERTS = (MAX_TAU_SEGS + 1) * (RHO_SEGS + 1)

// Riemannian-pocket tint (signature overlay): blended over the rate ramp
// where z_τ² > 1 + z_ρ².
const POCKET = [0.78, 0.3, 0.62] as const

function makeGeometry(): BufferGeometry {
  const geom = new BufferGeometry()
  for (const name of ['position', 'color'] as const) {
    const attr = new BufferAttribute(new Float32Array(MAX_VERTS * 3), 3)
    attr.setUsage(DynamicDrawUsage)
    geom.setAttribute(name, attr)
  }
  const index = new BufferAttribute(new Uint32Array(MAX_TAU_SEGS * RHO_SEGS * 6), 1)
  index.setUsage(DynamicDrawUsage)
  geom.setIndex(index)
  return geom
}

function fillPositions(geom: BufferGeometry, windowDays: number, rhoMax: number): void {
  const pos = geom.getAttribute('position') as BufferAttribute
  const a = pos.array as Float32Array
  const tSegs = 2 * windowDays * SEGS_PER_DAY
  const half = windowDays * 24
  let v = 0
  for (let j = 0; j <= tSegs; j++) {
    const delta = -half + (48 * windowDays * j) / tSegs
    for (let i = 0; i <= RHO_SEGS; i++) {
      helicoidLocalPos(delta, (rhoMax * i) / RHO_SEGS, a, v * 3)
      v++
    }
  }
  pos.needsUpdate = true

  const index = geom.getIndex() as BufferAttribute
  const ia = index.array as Uint32Array
  const cols = RHO_SEGS + 1
  let o = 0
  for (let j = 0; j < tSegs; j++) {
    for (let i = 0; i < RHO_SEGS; i++) {
      const v00 = j * cols + i
      const v10 = v00 + cols
      ia[o++] = v00
      ia[o++] = v10
      ia[o++] = v10 + 1
      ia[o++] = v00
      ia[o++] = v10 + 1
      ia[o++] = v00 + 1
    }
  }
  index.needsUpdate = true
  geom.setDrawRange(0, o)
}

function fillColors(geom: BufferGeometry, windowDays: number, rhoMax: number, tauMarker: number): void {
  const col = geom.getAttribute('color') as BufferAttribute
  const c = col.array as Float32Array
  const tSegs = 2 * windowDays * SEGS_PER_DAY
  const half = windowDays * 24
  const tintPocket = sim.showSignature
  let v = 0
  for (let j = 0; j <= tSegs; j++) {
    const tau = tauMarker - half + (48 * windowDays * j) / tSegs
    for (let i = 0; i <= RHO_SEGS; i++) {
      const rho = (rhoMax * i) / RHO_SEGS
      const o = v * 3
      rateToColor(properTimeRateSafe(tau, rho), c, o)
      if (tintPocket) {
        const zt = zTau(tau, rho)
        const zr = zRho(tau, rho)
        if (!(zt * zt <= 1 + zr * zr)) {
          c[o] = 0.4 * c[o] + 0.6 * POCKET[0]
          c[o + 1] = 0.4 * c[o + 1] + 0.6 * POCKET[1]
          c[o + 2] = 0.4 * c[o + 2] + 0.6 * POCKET[2]
        }
      }
      v++
    }
  }
  col.needsUpdate = true
}

export function SurfacePatch() {
  const mesh = useMemo(
    () =>
      new Mesh(
        makeGeometry(),
        new MeshBasicMaterial({
          vertexColors: true,
          side: DoubleSide,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        }),
      ),
    [],
  )
  const built = useRef({ windowDays: 0, rhoMax: 0 })
  const colored = useRef({ tau: Number.NaN, version: -1, signature: false })

  useEffect(() => {
    mesh.frustumCulled = false
    mesh.renderOrder = -2 // under the cylinder shell and the label sprites
    return () => {
      mesh.geometry.dispose()
      mesh.material.dispose()
    }
  }, [mesh])

  useFrame(() => {
    mesh.visible = sim.showSurface
    if (!sim.showSurface) return
    const { windowDays, tauMarker } = sim
    const rhoMax = patchRhoMax(sim.rho)

    if (built.current.windowDays !== windowDays || built.current.rhoMax !== rhoMax) {
      built.current = { windowDays, rhoMax }
      fillPositions(mesh.geometry, windowDays, rhoMax)
      colored.current.tau = Number.NaN
    }

    // Recolor only when τ has moved enough to matter (relative — the rate
    // field varies on the scale of τ itself) or the params/overlay changed.
    const since = Math.abs(tauMarker - colored.current.tau)
    if (
      colored.current.version !== sim.paramsVersion ||
      colored.current.signature !== sim.showSignature ||
      !(since <= Math.max(0.25, 0.001 * Math.abs(colored.current.tau)))
    ) {
      colored.current = { tau: tauMarker, version: sim.paramsVersion, signature: sim.showSignature }
      fillColors(mesh.geometry, windowDays, rhoMax, tauMarker)
    }

    mesh.rotation.y = markerPhase(tauMarker, sim.psi)
  })

  return <primitive object={mesh} />
}
