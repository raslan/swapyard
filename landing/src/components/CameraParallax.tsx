import { useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "../hooks/useReducedMotion";

type CameraParallaxProps = {
  strength?: number;
};

export function CameraParallax({ strength = 2 }: CameraParallaxProps) {
  const { camera, pointer } = useThree();
  const reducedMotion = useReducedMotion();

  useFrame(() => {
    if (reducedMotion) return;
    camera.position.x += (pointer.x * strength - camera.position.x) * 0.02;
    camera.position.y += (pointer.y * strength * 0.6 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);
  });

  return null;
}
