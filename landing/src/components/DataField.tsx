import { Sparkles } from "@react-three/drei";
import { CameraParallax } from "./CameraParallax";
import { SectionCanvas } from "./SectionCanvas";
import { useReducedMotion } from "../hooks/useReducedMotion";

type DataFieldProps = {
  className?: string;
};

export function DataField({ className }: DataFieldProps) {
  const reducedMotion = useReducedMotion();
  const speed = reducedMotion ? 0 : 0.4;

  return (
    <SectionCanvas className={className} cameraPosition={[0, 0, 14]} fov={58}>
      <Sparkles count={130} scale={[20, 13, 10]} size={5} speed={speed} noise={1.2} color="#34d399" />
      <Sparkles count={100} scale={[20, 13, 10]} size={4} speed={speed} noise={1} color="#59c2ff" />
      <Sparkles count={90} scale={[20, 13, 10]} size={4} speed={speed} noise={1.4} color="#d2a6ff" />
      <CameraParallax strength={1.8} />
    </SectionCanvas>
  );
}
