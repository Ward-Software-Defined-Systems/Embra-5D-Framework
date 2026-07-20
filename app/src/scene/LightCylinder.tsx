// The light cylinder at ρ = 1/ω ≈ 3.8197 (§7, toggleable): where the daily
// cycle's tangential sweep ρω reaches c. Translucent shell spanning the
// window, a crisp ring where it crosses the event plane through now, and a
// label. On the surface patch this is exactly the rate = 1 band at
// present-day τ — the two visibly detach at small τ.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
} from 'three'
import { RHO_LIGHT_CYLINDER } from '../geometry/constants'
import { sim } from '../sim/simState'
import { DAY_HEIGHT } from './frame'
import { disposeTextSprite, makeTextSprite } from './textSprite'

const RING_SEGS = 128

function makeRing() {
  const pts = new Float32Array(RING_SEGS * 3)
  for (let s = 0; s < RING_SEGS; s++) {
    const a = (s / RING_SEGS) * 2 * Math.PI
    pts[s * 3] = RHO_LIGHT_CYLINDER * Math.cos(a)
    pts[s * 3 + 1] = 0
    pts[s * 3 + 2] = RHO_LIGHT_CYLINDER * Math.sin(a)
  }
  const geom = new BufferGeometry()
  geom.setAttribute('position', new BufferAttribute(pts, 3))
  return new LineLoop(geom, new LineBasicMaterial({ color: '#9fe8ff', transparent: true, opacity: 0.8 }))
}

export function LightCylinder() {
  const group = useMemo(() => new Group(), [])
  const shell = useMemo(
    () =>
      new Mesh(
        new CylinderGeometry(RHO_LIGHT_CYLINDER, RHO_LIGHT_CYLINDER, 1, 96, 1, true),
        new MeshBasicMaterial({
          color: '#7fd7ee',
          transparent: true,
          opacity: 0.07,
          side: DoubleSide,
          depthWrite: false,
        }),
      ),
    [],
  )
  const ring = useMemo(() => makeRing(), [])
  const label = useMemo(() => makeTextSprite('ρ = 1/ω ≈ 3.8197', '#9fe8ff'), [])

  useEffect(() => {
    shell.renderOrder = -1
    shell.frustumCulled = false
    label.position.set(RHO_LIGHT_CYLINDER + 0.22, 0.16, 0)
    group.add(shell, ring, label)
    return () => {
      shell.geometry.dispose()
      shell.material.dispose()
      ring.geometry.dispose()
      ring.material.dispose()
      disposeTextSprite(label)
      group.clear()
    }
  }, [group, shell, ring, label])

  useFrame(() => {
    group.visible = sim.showCylinder
    shell.scale.y = 2 * sim.windowDays * DAY_HEIGHT
  })

  return <primitive object={group} />
}
