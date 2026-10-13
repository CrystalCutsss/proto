import '@proto/ui/ui.css';
import './style.css';
import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { StrictMode, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { Mesh } from 'three';

const token = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(`--ds-${name}`).trim();

function Shape() {
  const ref = useRef<Mesh>(null);
  const color = useMemo(() => token('color-action-primary'), []);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.4;
  });
  return (
    <mesh ref={ref}>
      <torusKnotGeometry args={[0.8, 0.28, 160, 24]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function App() {
  return (
    <main className="layout">
      <div className="stage">
        <Canvas camera={{ position: [0, 0, 4] }} dpr={[1, 2]}>
          <color attach="background" args={[token('color-bg-subtle')]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 4, 5]} intensity={2} />
          <Shape />
          <OrbitControls enableDamping />
        </Canvas>
      </div>
      <section className="copy ds-stack">
        <h1 className="ds-heading">{'{{title}}'}</h1>
        <p className="ds-muted">Шаблон React + R3F.</p>
      </section>
    </main>
  );
}

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
