// Geodesic fan overlay (M5): released test particles from the now-point.
// The center ray is the pure release — at rest it climbs the axis exactly
// (the rest axis is a geodesic); off-axis it continues straight in the
// inertial plane while the worldline curls away. Integration runs in the
// Web Worker; this component only launches (debounced) and maps the cached
// (τ, X, Y, ζ) samples into the floating-origin frame each frame.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Group, Line, LineBasicMaterial } from 'three'
import type { GeodesicResponse } from '../geodesic/core'
import { makeFan } from '../geodesic/core'
import { zetaFromTau } from '../geometry/time'
import { sim } from '../sim/simState'
import { DAY_HEIGHT, markerPhase } from './frame'

export const MAX_RAYS = 15
const D_LAMBDA = 0.05
const MAX_STEPS = 1440 // 72 h horizon at dλ = 0.05

const RELEASE_COLOR = new Color('#ffcf87')
const KICK_COLOR = new Color('#5f87b8')

function makeLine(): Line<BufferGeometry, LineBasicMaterial> {
  const geom = new BufferGeometry()
  const attr = new BufferAttribute(new Float32Array((MAX_STEPS + 1) * 3), 3)
  attr.setUsage(DynamicDrawUsage)
  geom.setAttribute('position', attr)
  const line = new Line(geom, new LineBasicMaterial({ transparent: true, opacity: 0.9 }))
  line.frustumCulled = false
  line.visible = false
  return line
}

export function Geodesics() {
  const group = useMemo(() => new Group(), [])
  const lines = useMemo(() => Array.from({ length: MAX_RAYS }, makeLine), [])
  const workerRef = useRef<Worker | null>(null)
  const result = useRef<GeodesicResponse | null>(null)
  const launch = useRef({ key: '', id: 0, dueAt: Number.POSITIVE_INFINITY })

  useEffect(() => {
    for (const line of lines) group.add(line)
    const worker = new Worker(new URL('../geodesic/geodesic.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (e: MessageEvent<GeodesicResponse>) => {
      if (e.data.id === launch.current.id) result.current = e.data
    }
    workerRef.current = worker
    return () => {
      worker.terminate()
      workerRef.current = null
      for (const line of lines) {
        group.remove(line)
        line.geometry.dispose()
        line.material.dispose()
      }
    }
  }, [group, lines])

  useFrame((state) => {
    group.visible = sim.showGeodesics
    if (!sim.showGeodesics) return

    // Debounced (re)launch whenever the fan parameters or worldline change.
    const key = [
      sim.geoRays,
      sim.geoSpread,
      sim.geoHorizonH,
      sim.geoLaunchNonce,
      sim.rho,
      sim.psi,
      sim.zeta0,
      sim.paramsVersion,
    ].join('|')
    const now = state.clock.elapsedTime
    if (key !== launch.current.key) {
      launch.current.key = key
      launch.current.dueAt = now + 0.15
    }
    if (now >= launch.current.dueAt && workerRef.current) {
      launch.current.dueAt = Number.POSITIVE_INFINITY
      const id = ++launch.current.id
      const n = Math.min(MAX_RAYS, sim.geoRays)
      const fan = makeFan(
        sim.tauMarker,
        sim.rho,
        markerPhase(sim.tauMarker, sim.psi),
        zetaFromTau(sim.tauMarker) + sim.zeta0,
        n,
        sim.geoSpread,
      )
      const steps = Math.min(MAX_STEPS, Math.max(2, Math.round(sim.geoHorizonH / D_LAMBDA)))
      workerRef.current.postMessage({ id, n, steps, dLambda: D_LAMBDA, x0s: fan.x0s, u0s: fan.u0s }, [
        fan.x0s.buffer,
        fan.u0s.buffer,
      ])
    }

    // Map cached samples into the floating-origin frame (f64 trig CPU-side).
    const res = result.current
    const zetaM = zetaFromTau(sim.tauMarker) + sim.zeta0
    for (let r = 0; r < MAX_RAYS; r++) {
      const line = lines[r]
      if (!res || r >= res.n) {
        line.visible = false
        continue
      }
      line.visible = true
      const count = res.counts[r]
      const attr = line.geometry.getAttribute('position') as BufferAttribute
      const a = attr.array as Float32Array
      const base = r * (res.steps + 1) * 4
      for (let s = 0; s < count; s++) {
        const X = res.samples[base + s * 4 + 1]
        const Y = res.samples[base + s * 4 + 2]
        const zeta = res.samples[base + s * 4 + 3]
        a[s * 3] = X
        a[s * 3 + 1] = (zeta - zetaM) * DAY_HEIGHT
        a[s * 3 + 2] = -Y
      }
      line.geometry.setDrawRange(0, count)
      attr.needsUpdate = true
      if (r === 0) {
        line.material.color.copy(RELEASE_COLOR)
      } else {
        line.material.color.copy(KICK_COLOR)
      }
    }
  })

  return <primitive object={group} />
}
