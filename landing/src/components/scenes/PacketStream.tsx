import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useReducedMotion } from "../../hooks/useReducedMotion";

const COLORS = ["#34d399", "#59c2ff", "#d2a6ff"];

export function PacketStream() {
  const groupRef = useRef<Group>(null);
  const reducedMotion = useReducedMotion();

  const packets = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        x: (Math.random() - 0.5) * 14 + 3,
        y: Math.random() * 14 - 7,
        z: (Math.random() - 0.5) * 5,
        speed: 0.6 + Math.random() * 0.9,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      })),
    [],
  );

  useFrame((_, delta) => {
    if (reducedMotion || !groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      child.position.y -= packets[i].speed * delta;
      if (child.position.y < -7) child.position.y = 7;
    });
  });

  return (
    <group ref={groupRef}>
      {packets.map((packet, i) => (
        <mesh key={i} position={[packet.x, packet.y, packet.z]}>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          <meshBasicMaterial color={packet.color} wireframe transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}
