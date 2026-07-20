// The ζ = const slice through now (§7 overlay): the simultaneity surface by
// cycle count — every event sharing the marker's accumulated day-count. In
// the floating frame it is the plane at marker height, drawn as a translucent
// disc with a rim.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
} from 'three'
import { sim } from '../sim/simState'
import { patchRhoMax } from './frame'

const RIM_SEGS = 96

export function ZetaSlice() {
  const group = useMemo(() => new Group(), [])
  const disc = useMemo(() => {
    const mesh = new Mesh(
      new CircleGeometry(1, 96),
      new MeshBasicMaterial({ color: '#4a6f9e', transparent: true, opacity: 0.1, side: DoubleSide, depthWrite: false }),
    )
    mesh.rotation.x = -Math.PI / 2
    mesh.renderOrder = -3
    return mesh
  }, [])
  const rim = useMemo(() => {
    const pts = new Float32Array(RIM_SEGS * 3)
    for (let s = 0; s < RIM_SEGS; s++) {
      const a = (s / RIM_SEGS) * 2 * Math.PI
      pts[s * 3] = Math.cos(a)
      pts[s * 3 + 2] = Math.sin(a)
    }
    const geom = new BufferGeometry()
    geom.setAttribute('position', new BufferAttribute(pts, 3))
    return new LineLoop(geom, new LineBasicMaterial({ color: '#6f92c4', transparent: true, opacity: 0.45 }))
  }, [])

  useEffect(() => {
    group.add(disc, rim)
    return () => {
      disc.geometry.dispose()
      disc.material.dispose()
      rim.geometry.dispose()
      rim.material.dispose()
      group.clear()
    }
  }, [group, disc, rim])

  useFrame(() => {
    group.visible = sim.showZetaSlice
    group.scale.setScalar(patchRhoMax(sim.rho) + 0.4)
  })

  return <primitive object={group} />
}
