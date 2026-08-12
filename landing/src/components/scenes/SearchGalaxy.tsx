import { Sparkles } from "@react-three/drei";
import { CameraParallax } from "../CameraParallax";
import { useReducedMotion } from "../../hooks/useReducedMotion";

export function SearchGalaxy() {
  const reducedMotion = useReducedMotion();
  const speed = reducedMotion ? 0 : 0.5;

  return (
    <>
      <Sparkles count={110} scale={[16, 9, 6]} size={5} speed={speed} noise={1.4} color="#59c2ff" />
      <Sparkles count={60} scale={[16, 9, 6]} size={4} speed={speed} noise={1.1} color="#34d399" />
      <CameraParallax strength={1.2} />
    </>
  );
}
