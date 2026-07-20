// Calendar date labels riding the day-tick rings — canvas-texture sprites
// (self-contained: no font asset, no CDN fetch), managed imperatively so the
// React tree never churns at frame rate.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, Group, Sprite, SpriteMaterial } from 'three'
import { formatDayLabel } from '../geometry/time'
import { sim } from '../sim/simState'
import { displayPos } from './frame'

const CANVAS_W = 224
const CANVAS_H = 56

function makeSprite(text: string): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.font = '600 26px ui-monospace, "SF Mono", Menlo, monospace'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#8ea6c8'
    ctx.fillText(text, 10, CANVAS_H / 2 + 2)
  }
  const sprite = new Sprite(
    new SpriteMaterial({ map: new CanvasTexture(canvas), transparent: true, depthWrite: false, opacity: 0.95 }),
  )
  sprite.center.set(0, 0.5) // left-middle anchor, so it hangs off the tick ring
  sprite.scale.set(1.68, 0.42, 1)
  return sprite
}

function disposeSprite(sprite: Sprite): void {
  sprite.material.map?.dispose()
  sprite.material.dispose()
}

export function DayLabels() {
  const group = useMemo(() => new Group(), [])
  const entries = useRef(new Map<number, Sprite>())
  const seenVersion = useRef(-1)
  const tmp = useMemo(() => new Float32Array(3), [])

  useEffect(() => {
    const map = entries.current
    return () => {
      for (const sprite of map.values()) disposeSprite(sprite)
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
        disposeSprite(sprite)
      }
      entries.current.clear()
    }
    const seen = new Set<number>()
    for (const tick of ticks) {
      seen.add(tick.dayIndex)
      let sprite = entries.current.get(tick.dayIndex)
      if (!sprite) {
        sprite = makeSprite(formatDayLabel(tick.labelMs, timeParams))
        entries.current.set(tick.dayIndex, sprite)
        group.add(sprite)
      }
      displayPos(tick.tau, rho, psi, tauMarker, tmp, 0)
      sprite.position.set(tmp[0] + 0.34, tmp[1] + 0.02, tmp[2])
    }
    for (const [key, sprite] of entries.current) {
      if (!seen.has(key)) {
        group.remove(sprite)
        disposeSprite(sprite)
        entries.current.delete(key)
      }
    }
  })

  return <primitive object={group} />
}
