import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef } from 'react'
import type { Mesh } from 'three'

// Milestone 1 hello-scene — verifies React + Vite + R3F + three + drei render.
// Replaced in M3 by the floating-origin worldline scene.
function SpinningBox() {
  const ref = useRef<Mesh>(null)
  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.rotation.x += dt * 0.4
    ref.current.rotation.y += dt * 0.6
  })
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#63e6ff" />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas camera={{ position: [3, 2, 4], fov: 50 }} style={{ position: 'fixed', inset: 0 }}>
      <color attach="background" args={['#05070f']} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <SpinningBox />
      <OrbitControls />
    </Canvas>
  )
}
