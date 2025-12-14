import * as THREE from "three";
import { getMainScene } from "./ObjectManager";

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const getCameraFromScene = (): THREE.Camera | null => {
    const scene = getMainScene();
    return scene.getObjectByProperty("type", "PerspectiveCamera") as THREE.Camera;
};

export const onMouseClick = (event: MouseEvent) => {
    const camera = getCameraFromScene();
    if (!camera) {
        console.warn("Camera not found in scene");
        return;
    }

    const scene = getMainScene();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        console.log("Clicked object:", intersects[0].object);
    }
};
