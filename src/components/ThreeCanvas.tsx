// components/ThreeCanvas.tsx
import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { getMainScene, onSceneChange } from "../threejs/ObjectManager"; // <- note imports

const ThreeCanvas = () => {
  const [scene, setScene] = useState(() => getMainScene());
  //const [camera] = useState(() => MainCamera)

  useEffect(() => {
    // Подписываемся на смену сцены
    const unsubscribe = onSceneChange((newScene) => {
      setScene(newScene)
    })
    // Отписка при unmount
    return () => unsubscribe()
  }, [])

  return (
    <Canvas
      id="main_canvas"
      style={{ width: `100%`, height: `100vh` }}
      shadows
      //camera={camera}
    >
      {/* Используем текущее состояние сцены */}
      <primitive object={scene} />
      <OrbitControls />
      <ambientLight intensity={0.5} />
      <directionalLight intensity={0.5} position={[6, 3, 1]} />
      <gridHelper args={[15, 15]} position={[0, -0.5, 0]} />
      <Stats />
    </Canvas>
  );
};

export default ThreeCanvas;
