import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";

type SectionCanvasProps = {
  className?: string;
  children: ReactNode;
  cameraPosition?: [number, number, number];
  fov?: number;
};

export function SectionCanvas({
  className,
  children,
  cameraPosition = [0, 0, 10],
  fov = 45,
}: SectionCanvasProps) {
  return (
    <Canvas
      className={className}
      camera={{ position: cameraPosition, fov }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[5, 5, 5]} intensity={60} color="#34d399" />
      <pointLight position={[-5, -3, 4]} intensity={30} color="#59c2ff" />
      {children}
    </Canvas>
  );
}
