import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useReducedMotion } from "../../hooks/useReducedMotion";

export function FitGauge() {
  const needleRef = useRef<Group>(null);
  const reducedMotion = useReducedMotion();

  useFrame((state) => {
    if (reducedMotion || !needleRef.current) return;
    const t = state.clock.elapsedTime;
    needleRef.current.rotation.z = Math.sin(t * 0.6) * 0.4 - 0.15;
  });

  return (
    <group rotation={[0, 0, Math.PI * 0.75]}>
      <mesh>
        <torusGeometry args={[2.3, 0.09, 16, 64, Math.PI * 1.5]} />
        <meshBasicMaterial color="#141414" />
      </mesh>
      <mesh>
        <torusGeometry args={[2.3, 0.09, 16, 64, Math.PI * 1.1]} />
        <meshBasicMaterial color="#34d399" />
      </mesh>
      <group ref={needleRef}>
        <mesh position={[0, 1, 0]}>
          <coneGeometry args={[0.1, 2, 8]} />
          <meshBasicMaterial color="#e6e1cf" />
        </mesh>
      </group>
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color="#e6e1cf" />
      </mesh>
    </group>
  );
}
