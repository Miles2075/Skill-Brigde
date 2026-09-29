import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { group } from "console";


// ==========================================
// 3D PARTICLES
// ==========================================

function Network() {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 220;
    const array = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      array[i * 3] = (Math.random() - 0.5) * 16;
      array[i * 3 + 1] = (Math.random() - 0.5) * 10;
      array[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }

    return array;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const time = state.clock.getElapsedTime();

    pointsRef.current.rotation.y = time * 0.025;
    pointsRef.current.rotation.x = Math.sin(time * 0.15) * 0.08;

    // Mouse interaction
    pointsRef.current.rotation.y += state.pointer.x * 0.02;
    pointsRef.current.rotation.x += state.pointer.y * 0.01;
  });

  return (
    <Points
      ref={pointsRef}
      positions={positions}
      stride={3}
      frustumCulled={false}
    >
      <PointMaterial
        transparent
        color="#22d3ee"
        size={0.06}
        sizeAttenuation
        depthWrite={false}
      />
    </Points>
  );
}


// ==========================================
// CONNECTING NETWORK LINES
// ==========================================

function NetworkLines() {
  const lines = useMemo(() => {
    const result: [THREE.Vector3, THREE.Vector3][] = [];

    for (let i = 0; i < 55; i++) {
      const start = new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 9
      );

      const end = start.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4
        )
      );

      result.push([start, end]);
    }

    return result;
  }, []);

  return (
    <>
      {lines.map((points, index) => (
        <Line
          key={index}
          points={points}
          color="#22d3ee"
          transparent
          opacity={0.22}
          lineWidth={1}
        />
      ))}
    </>
  );
}


function FloatingObjects() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();

    groupRef.current.rotation.y =
      time * 0.08 + state.pointer.x * 0.12;

    groupRef.current.rotation.x =
      Math.sin(time * 0.2) * 0.08 + state.pointer.y * 0.05;
  });

  return (
    <group ref={groupRef}>

      {/* Main floating crystal */}
      <mesh position={[-4, 1.5, -1]}>
        <icosahedronGeometry args={[0.8, 1]} />
        <meshStandardMaterial
          color="#e022ee"
          emissive="#b2a408"
          emissiveIntensity={1.5}
          wireframe
          transparent
          opacity={0.75}
        />
      </mesh>

      {/* Purple crystal */}
      <mesh position={[4, 2, -2]}>
        <icosahedronGeometry args={[0.65, 1]} />
        <meshStandardMaterial
          color="#55f765"
          emissive="#22ce56"
          emissiveIntensity={1.5}
          wireframe
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Rotating ring */}
      <mesh position={[3, -2, -1]} rotation={[1, 0.5, 0]}>
        <torusGeometry args={[1, 0.035, 16, 64]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={2}
          transparent
          opacity={0.65}
        />
      </mesh>

      {/* Second ring */}
      <mesh position={[-3, -2.5, -2]} rotation={[0.5, 1, 0]}>
        <torusGeometry args={[0.7, 0.03, 16, 64]} />
        <meshStandardMaterial
          color="#c084fc"
          emissive="#9333ea"
          emissiveIntensity={2}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Floating cube */}
      <mesh position={[5, 0, -1]}>
        <boxGeometry args={[0.65, 0.65, 0.65]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#0891b2"
          emissiveIntensity={1.2}
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Small cube */}
      <mesh position={[-5, -1, -2]}>
        <boxGeometry args={[0.45, 0.45, 0.45]} />
        <meshStandardMaterial
          color="#a78bfa"
          emissive="#7c3aed"
          emissiveIntensity={1.2}
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>

    </group>
  );
}
// ==========================================
// MAIN BACKGROUND
// ==========================================

export default function ThreeBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
<Canvas
  camera={{
    position: [0, 0, 8],
    fov: 60,
  }}
  dpr={[1, 2]}
>
  <Network />

  <FloatingObjects />

  <ambientLight intensity={0.5} />
  <pointLight position={[5, 5, 5]} intensity={2} color="#22d3ee" />
  <pointLight position={[-5, -3, 3]} intensity={1.5} color="#a855f7" />
</Canvas>
    </div>
  );
}
