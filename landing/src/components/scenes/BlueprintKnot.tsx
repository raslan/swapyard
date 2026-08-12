import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { useReducedMotion } from "../../hooks/useReducedMotion";

export function BlueprintKnot() {
  const meshRef = useRef<Mesh>(null);
  const reducedMotion = useReducedMotion();

  useFrame((_, delta) => {
    if (reducedMotion || !meshRef.current) return;
    meshRef.current.rotation.x += delta * 0.15;
    meshRef.current.rotation.y += delta * 0.22;
  });

  return (
    <mesh ref={meshRef}>
      <torusKnotGeometry args={[2, 0.45, 128, 16]} />
      <meshBasicMaterial color="#34d399" wireframe />
    </mesh>
  );
}
