// components/ThreeCanvas.tsx
import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { getMainScene, onSceneChange } from "../threejs/ObjectManager";

/**
 * Вспомогательный компонент, который
 * принудительно сообщает Canvas о необходимости перерисовки
 */
function SceneWrapper({ scene }: { scene: THREE.Scene }) {
  const { invalidate } = useThree();

  useEffect(() => {
    invalidate(); 
  }, [scene, invalidate]);

  return <primitive object={scene} />;
}

const ThreeCanvas = () => {
  const [scene, setScene] = useState(() => getMainScene());

  useEffect(() => {
    const unsubscribe = onSceneChange((newScene) => {
      console.log("[ThreeCanvas] Scene changed");
      setScene(newScene);
      console.log("[Canvas] scene updated", scene.uuid);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Canvas
      id="main_canvas"
      style={{ width: "100%", height: "100vh" }}
      shadows
    >
      <SceneWrapper scene={scene} />

      <OrbitControls />
      <ambientLight intensity={0.5} />
      <directionalLight intensity={0.5} position={[6, 3, 1]} />
      <gridHelper args={[15, 15]} position={[0, -0.5, 0]} />
      <Stats />
    </Canvas>
  );
};

export default ThreeCanvas;
