import { Line } from "@react-three/drei";

const TRUNK: [number, number, number][] = [
  [-4, 2.6, 0],
  [-2, 1.6, 0],
  [0, 0.6, 0],
  [2, -0.4, 0],
  [4, -1.4, 0],
];

const BRANCH: [number, number, number][] = [
  [-2, 1.6, 0],
  [-1, 0.1, 0.7],
  [1, -0.9, 0.7],
  [2, -0.4, 0],
];

export function GitGraph() {
  return (
    <>
      <Line points={TRUNK} color="#565f6b" lineWidth={2} />
      <Line points={BRANCH} color="#34d399" lineWidth={2.5} />
      {TRUNK.map((point, i) => (
        <mesh key={`trunk-${i}`} position={point}>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshBasicMaterial color="#e6e1cf" />
        </mesh>
      ))}
      {[BRANCH[1], BRANCH[2]].map((point, i) => (
        <mesh key={`branch-${i}`} position={point}>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshBasicMaterial color="#34d399" />
        </mesh>
      ))}
    </>
  );
}
