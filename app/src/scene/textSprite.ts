// Canvas-texture text sprites — self-contained (no font asset, no CDN),
// shared by the day labels and the light-cylinder label.
import { CanvasTexture, Sprite, SpriteMaterial } from 'three'

const HEIGHT = 56
const FONT = '600 26px ui-monospace, "SF Mono", Menlo, monospace'
const WORLD_HEIGHT = 0.42

export function makeTextSprite(text: string, color = '#8ea6c8'): Sprite {
  const canvas = document.createElement('canvas')
  const measure = canvas.getContext('2d')
  let width = 224
  if (measure) {
    measure.font = FONT
    width = Math.ceil(measure.measureText(text).width) + 20
  }
  canvas.width = width
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (ctx) {
    // setting canvas.width reset the context state — font must be re-applied
    ctx.font = FONT
    ctx.textBaseline = 'middle'
    ctx.fillStyle = color
    ctx.fillText(text, 10, HEIGHT / 2 + 2)
  }
  const sprite = new Sprite(
    new SpriteMaterial({ map: new CanvasTexture(canvas), transparent: true, depthWrite: false, opacity: 0.95 }),
  )
  sprite.center.set(0, 0.5) // left-middle anchor
  sprite.scale.set(WORLD_HEIGHT * (width / HEIGHT), WORLD_HEIGHT, 1)
  return sprite
}

export function disposeTextSprite(sprite: Sprite): void {
  sprite.material.map?.dispose()
  sprite.material.dispose()
}
