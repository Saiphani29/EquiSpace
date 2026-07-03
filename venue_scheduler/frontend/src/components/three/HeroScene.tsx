import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const AnimatedOrb = () => {
  const coreRef = useRef<THREE.Mesh>(null!);
  const wireRef = useRef<THREE.Mesh>(null!);
  const ring1Ref = useRef<THREE.Mesh>(null!);
  const ring2Ref = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (coreRef.current) {
      coreRef.current.rotation.x = t * 0.15;
      coreRef.current.rotation.y = t * 0.25;
    }
    if (wireRef.current) {
      wireRef.current.rotation.x = t * 0.15;
      wireRef.current.rotation.y = t * 0.25;
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.2;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = t * 0.1;
      ring2Ref.current.rotation.z = -t * 0.15;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <group>
        {/* Core metallic sphere */}
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[1.4, 3]} />
          <meshStandardMaterial
            color="#0078D4"
            metalness={0.9}
            roughness={0.1}
            emissive="#003875"
            emissiveIntensity={0.4}
          />
        </mesh>

        {/* Wireframe overlay */}
        <mesh ref={wireRef} scale={1.08}>
          <icosahedronGeometry args={[1.4, 1]} />
          <meshBasicMaterial color="#60AEFF" wireframe transparent opacity={0.3} />
        </mesh>

        {/* Orbital ring 1 */}
        <mesh ref={ring1Ref} rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[2.2, 0.04, 8, 60]} />
          <meshStandardMaterial
            color="#0091FF"
            metalness={0.8}
            roughness={0.2}
            emissive="#0078D4"
            emissiveIntensity={0.6}
          />
        </mesh>

        {/* Orbital ring 2 */}
        <mesh ref={ring2Ref} rotation={[Math.PI / 6, Math.PI / 4, 0]}>
          <torusGeometry args={[2.8, 0.025, 8, 80]} />
          <meshStandardMaterial
            color="#40E0FF"
            metalness={0.8}
            roughness={0.2}
            emissive="#40E0FF"
            emissiveIntensity={0.4}
            transparent
            opacity={0.7}
          />
        </mesh>
      </group>
    </Float>
  );
};

const HeroScene = () => (
  <div className="three-canvas-container">
    <Suspense fallback={null}>
      <Canvas camera={{ position: [0, 0, 6.5], fov: 50 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} color="#0078D4" intensity={2.5} />
        <pointLight position={[-5, -5, -5]} color="#40CFFF" intensity={1.2} />
        <directionalLight position={[0, 10, 0]} intensity={0.4} />
        <Stars radius={100} depth={60} count={2500} factor={3} saturation={0} fade speed={0.8} />
        <AnimatedOrb />
      </Canvas>
    </Suspense>
  </div>
);

export default HeroScene;
