import { Leva } from 'leva'
import { useSimControls } from './controls'
import { Hud } from './hud/Hud'
import { Scene } from './scene/Scene'

export default function App() {
  useSimControls()
  return (
    <>
      <Scene />
      <Hud />
      <Leva collapsed={false} titleBar={{ title: 'controls', filter: false }} />
    </>
  )
}
