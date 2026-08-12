import { Float, MeshDistortMaterial } from "@react-three/drei";
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
      <group rotation={[0.4, 0.6, 0]}>
        <mesh>
          <boxGeometry args={[3, 3, 3]} />
          <MeshDistortMaterial
            color="#080808"
            emissive="#34d399"
            emissiveIntensity={0.35}
            distort={0.22}
            speed={reducedMotion ? 0 : 2}
            roughness={0.25}
            metalness={0.6}
          />
        </mesh>
        <mesh>
          <boxGeometry args={[3.05, 3.05, 3.05]} />
          <meshBasicMaterial color="#34d399" wireframe transparent opacity={0.35} />
        </mesh>
      </group>
    </Float>
  );
}
