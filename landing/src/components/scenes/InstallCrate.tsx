import { Float } from "@react-three/drei";
import { useReducedMotion } from "../../hooks/useReducedMotion";

export function InstallCrate() {
  const reducedMotion = useReducedMotion();

  return (
    <Float
      speed={reducedMotion ? 0 : 1.4}
      rotationIntensity={reducedMotion ? 0 : 1}
      floatIntensity={reducedMotion ? 0 : 1.2}
      enabled={!reducedMotion}
    >
      <mesh position={[3.5, 0, 0]} rotation={[0.4, 0.6, 0]}>
        <boxGeometry args={[3.4, 3.4, 3.4]} />
        <meshBasicMaterial color="#34d399" wireframe transparent opacity={0.55} />
      </mesh>
    </Float>
  );
}
