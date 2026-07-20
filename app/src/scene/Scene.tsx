// The R3F canvas: floating-origin frame, camera orbiting the marker's axis.
// All materials are unlit (MeshBasic/LineBasic) — no lights needed; fog gives
// the window ends a graceful fade instead of a hard clip.
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { DayLabels } from './DayLabels'
import { Geodesics } from './Geodesics'
import { LightCylinder } from './LightCylinder'
import { NowMarker } from './NowMarker'
import { NullHelices } from './NullHelices'
import { PolarGrid } from './PolarGrid'
import { SignatureLocus } from './SignatureLocus'
import { SimDriver } from './SimDriver'
import { SurfacePatch } from './SurfacePatch'
import { Worldline } from './Worldline'
import { ZetaSlice } from './ZetaSlice'

export function Scene() {
  return (
    <Canvas
      camera={{ position: [8, 5, 10], fov: 45, near: 0.05, far: 500 }}
      dpr={[1, 2]}
      style={{ position: 'fixed', inset: 0 }}
    >
      <color attach="background" args={['#05070f']} />
      <fog attach="fog" args={['#05070f', 20, 55]} />
      <SimDriver />
      <PolarGrid />
      <ZetaSlice />
      <SurfacePatch />
      <LightCylinder />
      <SignatureLocus />
      <NullHelices />
      <Worldline />
      <Geodesics />
      <DayLabels />
      <NowMarker />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={1.2} maxDistance={90} />
    </Canvas>
  )
}
