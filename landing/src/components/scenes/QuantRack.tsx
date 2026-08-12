import { Float } from "@react-three/drei";
import { useReducedMotion } from "../../hooks/useReducedMotion";

const SLOTS = [
  { y: 1.35, pulled: false, danger: false },
  { y: 0.45, pulled: false, danger: false },
  { y: -0.45, pulled: true, danger: true },
  { y: -1.35, pulled: false, danger: false },
];

export function QuantRack() {
  const reducedMotion = useReducedMotion();

  return (
    <group rotation={[0.1, -0.35, 0]}>
      {SLOTS.map((slot, i) => (
        <Float
          key={i}
          speed={reducedMotion ? 0 : 1.2}
          floatIntensity={reducedMotion ? 0 : 0.3}
          rotationIntensity={0}
          enabled={!reducedMotion}
        >
          <mesh position={[slot.pulled ? 1.1 : 0, slot.y, 0]}>
            <boxGeometry args={[3, 0.65, 1.4]} />
            <meshStandardMaterial
              color="#080808"
              emissive={slot.danger ? "#f07178" : "#34d399"}
              emissiveIntensity={0.35}
              roughness={0.4}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}
