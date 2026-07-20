// Faint polar grid in the event plane through the marker height — scene
// furniture for depth/scale only. (The labeled light cylinder at ρ = 1/ω is
// M4's physics overlay, deliberately not this.)
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments } from 'three'
import { sim } from '../sim/simState'

const RINGS = [1, 2, 3, 4, 5]
const RING_SEGS = 64
const SPOKES = 8

function makeGrid() {
  const pts: number[] = []
  for (const r of RINGS) {
    for (let s = 0; s < RING_SEGS; s++) {
      const a0 = (s / RING_SEGS) * 2 * Math.PI
      const a1 = ((s + 1) / RING_SEGS) * 2 * Math.PI
      pts.push(r * Math.cos(a0), 0, r * Math.sin(a0), r * Math.cos(a1), 0, r * Math.sin(a1))
    }
  }
  for (let s = 0; s < SPOKES; s++) {
    const a = (s / SPOKES) * 2 * Math.PI
    pts.push(0.3 * Math.cos(a), 0, 0.3 * Math.sin(a), 5.5 * Math.cos(a), 0, 5.5 * Math.sin(a))
  }
  const geom = new BufferGeometry()
  geom.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3))
  return new LineSegments(geom, new LineBasicMaterial({ color: '#14203a', transparent: true, opacity: 0.5 }))
}

export function PolarGrid() {
  const grid = useMemo(() => makeGrid(), [])

  useEffect(() => {
    return () => {
      grid.geometry.dispose()
      grid.material.dispose()
    }
  }, [grid])

  useFrame(() => {
    grid.visible = sim.showGrid
  })

  return <primitive object={grid} />
}
