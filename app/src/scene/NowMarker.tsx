// The now-point marker riding the worldline (§7), with the daily phase made
// visible: a needle sweeping a small dial at 2π/day. The dial's fixed notch
// marks φ = 0 (basis midnight), so the needle-vs-notch angle is the clock.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Group, LineBasicMaterial, LineSegments } from 'three'
import { sim } from '../sim/simState'
import { displayPos, markerPhase } from './frame'

const DIAL_R = 0.72
const DIAL_SEGS = 48

function makeDial() {
  const pts: number[] = []
  for (let s = 0; s < DIAL_SEGS; s++) {
    const a0 = (s / DIAL_SEGS) * 2 * Math.PI
    const a1 = ((s + 1) / DIAL_SEGS) * 2 * Math.PI
    pts.push(DIAL_R * Math.cos(a0), 0, -DIAL_R * Math.sin(a0))
    pts.push(DIAL_R * Math.cos(a1), 0, -DIAL_R * Math.sin(a1))
  }
  // φ = 0 notch on +x (display direction of zero phase)
  pts.push(DIAL_R - 0.08, 0, 0, DIAL_R + 0.1, 0, 0)
  const geom = new BufferGeometry()
  geom.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3))
  return new LineSegments(geom, new LineBasicMaterial({ color: '#2a3b58', transparent: true, opacity: 0.9 }))
}

export function NowMarker() {
  const root = useRef<Group>(null)
  const needle = useRef<Group>(null)
  const dial = useMemo(() => makeDial(), [])
  const tmp = useMemo(() => new Float32Array(3), [])

  useEffect(() => {
    return () => {
      dial.geometry.dispose()
      dial.material.dispose()
    }
  }, [dial])

  useFrame(() => {
    if (!root.current || !needle.current) return
    displayPos(sim.tauMarker, sim.rho, sim.psi, sim.tauMarker, tmp, 0)
    root.current.position.set(tmp[0], tmp[1], tmp[2])
    needle.current.rotation.y = markerPhase(sim.tauMarker, sim.psi)
  })

  return (
    <group ref={root}>
      <mesh>
        <sphereGeometry args={[0.11, 24, 16]} />
        <meshBasicMaterial color="#ffb454" />
      </mesh>
      <group ref={needle}>
        <mesh position={[0.38, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.032, 0.52, 12]} />
          <meshBasicMaterial color="#ffd79a" transparent opacity={0.95} />
        </mesh>
      </group>
      <primitive object={dial} />
    </group>
  )
}
