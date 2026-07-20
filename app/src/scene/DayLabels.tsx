// Calendar date labels riding the day-tick rings — canvas-texture sprites
// (self-contained: no font asset, no CDN fetch), managed imperatively so the
// React tree never churns at frame rate.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Group, Sprite } from 'three'
import { formatDayLabel } from '../geometry/time'
import { sim } from '../sim/simState'
import { displayPos } from './frame'
import { disposeTextSprite, makeTextSprite } from './textSprite'

export function DayLabels() {
  const group = useMemo(() => new Group(), [])
  const entries = useRef(new Map<number, Sprite>())
  const seenVersion = useRef(-1)
  const tmp = useMemo(() => new Float32Array(3), [])

  useEffect(() => {
    const map = entries.current
    return () => {
      for (const sprite of map.values()) disposeTextSprite(sprite)
      map.clear()
    }
  }, [])

  useFrame(() => {
    const { ticks, rho, psi, tauMarker, timeParams } = sim
    // Basis/datum/λ changed → every label's text is stale; rebuild from scratch.
    if (seenVersion.current !== sim.paramsVersion) {
      seenVersion.current = sim.paramsVersion
      for (const sprite of entries.current.values()) {
        group.remove(sprite)
        disposeTextSprite(sprite)
      }
      entries.current.clear()
    }
    const seen = new Set<number>()
    for (const tick of ticks) {
      seen.add(tick.dayIndex)
      let sprite = entries.current.get(tick.dayIndex)
      if (!sprite) {
        sprite = makeTextSprite(formatDayLabel(tick.labelMs, timeParams))
        entries.current.set(tick.dayIndex, sprite)
        group.add(sprite)
      }
      displayPos(tick.tau, rho, psi, tauMarker, tmp, 0)
      sprite.position.set(tmp[0] + 0.34, tmp[1] + 0.02, tmp[2])
    }
    for (const [key, sprite] of entries.current) {
      if (!seen.has(key)) {
        group.remove(sprite)
        disposeTextSprite(sprite)
        entries.current.delete(key)
      }
    }
  })

  return <primitive object={group} />
}
