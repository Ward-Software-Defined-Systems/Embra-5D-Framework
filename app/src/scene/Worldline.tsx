// The worldline helix through the now-point (±N-day window, §7), split at the
// marker: the traversed past glows, the not-yet future is dim. Plus scene
// furniture: the ρ = 0 axis guide and a day-tick ring at each basis midnight.
// Geometry is refilled every frame in f64 and uploaded recentered (§6).
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Line,
  LineBasicMaterial,
  LineSegments,
} from 'three'
import { sim } from '../sim/simState'
import { DAY_HEIGHT, displayPos, MAX_WINDOW_DAYS, SEGMENTS_PER_DAY } from './frame'

const MAX_PTS = MAX_WINDOW_DAYS * SEGMENTS_PER_DAY + 1
const RING_SEGS = 20
const RING_R = 0.2
const MAX_TICKS = 2 * MAX_WINDOW_DAYS + 4
const FURNITURE_FLOATS = (2 + MAX_TICKS * RING_SEGS * 2) * 3

function makeDynamicGeometry(nFloats: number): BufferGeometry {
  const geom = new BufferGeometry()
  const attr = new BufferAttribute(new Float32Array(nFloats), 3)
  attr.setUsage(DynamicDrawUsage)
  geom.setAttribute('position', attr)
  return geom
}

function fillSpan(geom: BufferGeometry, tau0: number, tau1: number, n: number): void {
  const attr = geom.getAttribute('position') as BufferAttribute
  const a = attr.array as Float32Array
  const { rho, psi, tauMarker } = sim
  for (let j = 0; j < n; j++) {
    const tau = tau0 + ((tau1 - tau0) * j) / (n - 1)
    displayPos(tau, rho, psi, tauMarker, a, j * 3)
  }
  geom.setDrawRange(0, n)
  attr.needsUpdate = true
}

function fillFurniture(geom: BufferGeometry): void {
  const attr = geom.getAttribute('position') as BufferAttribute
  const a = attr.array as Float32Array
  const { rho, psi, tauMarker, windowDays, ticks } = sim
  const half = windowDays * DAY_HEIGHT
  let o = 0
  // ρ = 0 axis guide spanning the window
  a[o++] = 0; a[o++] = -half; a[o++] = 0
  a[o++] = 0; a[o++] = half; a[o++] = 0
  // a small horizontal ring around the worldline at each day boundary
  const c: number[] = [0, 0, 0]
  for (const tick of ticks) {
    if (o + RING_SEGS * 6 > a.length) break
    displayPos(tick.tau, rho, psi, tauMarker, c, 0)
    for (let s = 0; s < RING_SEGS; s++) {
      const a0 = (s / RING_SEGS) * 2 * Math.PI
      const a1 = ((s + 1) / RING_SEGS) * 2 * Math.PI
      a[o++] = c[0] + RING_R * Math.cos(a0); a[o++] = c[1]; a[o++] = c[2] + RING_R * Math.sin(a0)
      a[o++] = c[0] + RING_R * Math.cos(a1); a[o++] = c[1]; a[o++] = c[2] + RING_R * Math.sin(a1)
    }
  }
  geom.setDrawRange(0, o / 3)
  attr.needsUpdate = true
}

export function Worldline() {
  const past = useMemo(
    () => new Line(makeDynamicGeometry(MAX_PTS * 3), new LineBasicMaterial({ color: '#5fd4f0' })),
    [],
  )
  const future = useMemo(
    () => new Line(makeDynamicGeometry(MAX_PTS * 3), new LineBasicMaterial({ color: '#34506e' })),
    [],
  )
  const furniture = useMemo(
    () =>
      new LineSegments(
        makeDynamicGeometry(FURNITURE_FLOATS),
        new LineBasicMaterial({ color: '#26374f', transparent: true, opacity: 0.85 }),
      ),
    [],
  )

  useEffect(() => {
    for (const obj of [past, future, furniture]) obj.frustumCulled = false
    return () => {
      for (const obj of [past, future, furniture]) {
        obj.geometry.dispose()
        obj.material.dispose()
      }
    }
  }, [past, future, furniture])

  useFrame(() => {
    const { tauMarker, windowDays } = sim
    const n = Math.min(MAX_PTS, Math.max(2, Math.round(windowDays * SEGMENTS_PER_DAY) + 1))
    fillSpan(past.geometry, tauMarker - windowDays * 24, tauMarker, n)
    fillSpan(future.geometry, tauMarker, tauMarker + windowDays * 24, n)
    fillFurniture(furniture.geometry)
  })

  return (
    <>
      <primitive object={past} />
      <primitive object={future} />
      <primitive object={furniture} />
    </>
  )
}
