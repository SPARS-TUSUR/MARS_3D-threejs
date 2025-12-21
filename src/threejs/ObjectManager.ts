// threejs/ObjectManager.ts
import { createObject, CustomObjectParams, setParamsToObject3D } from "./CustomObject3D";
import * as THREE from "three"
import { getAllObjectsWithName, LoadModel, LoadModel_OBJ, loadTexture } from "./ModelLoader";
import { Color, Mesh, Scene } from "three";
import { sleep } from "../utils";

let sceneVersion = 0;
const sceneVersionSubscribers: ((v: number) => void)[] = [];

export const onSceneVersionChange = (cb: (v: number) => void) => {
  sceneVersionSubscribers.push(cb);
  return () => {
    const i = sceneVersionSubscribers.indexOf(cb);
    if (i >= 0) sceneVersionSubscribers.splice(i, 1);
  };
};

const markSceneDirty = () => {
  sceneVersion++;
  sceneVersionSubscribers.forEach(cb => cb(sceneVersion));
};

let sceneChangeListeners: ((scene: THREE.Scene) => void)[] = [];

const notifySceneChange = () => {
    sceneChangeListeners.forEach(cb => cb(getMainScene()));
};

let currentScene: THREE.Scene = new THREE.Scene();        // <-- заменили const на let
const camera = new THREE.PerspectiveCamera(45)
const worldVector = new THREE.Vector3()

// Изначально добавим камеру в сцену
currentScene.add(camera)

// Подписчики на смену сцены (React компонент будет подписываться)
type SceneChangeCallback = (newScene: THREE.Scene, oldScene?: THREE.Scene) => void;
const sceneChangeSubscribers: SceneChangeCallback[] = [];

// init camera position
const init1 = async () => {
    await sleep(1000)
    camera.position.set(0, 10, 20)
    camera.lookAt(0, 0, 0)
    console.log("Camera initialized")
}
init1()

// -------------------- Управление сценой --------------------
export const getMainScene = () => currentScene;

export const onSceneChange = (cb: SceneChangeCallback) => {
    sceneChangeSubscribers.push(cb);
    // вернуть функцию отписки
    return () => {
        const idx = sceneChangeSubscribers.indexOf(cb);
        if (idx >= 0) sceneChangeSubscribers.splice(idx, 1);
    }
}

/**
 * Полная очистка и освобождение ресурсов сцены (геометрии, материалов, текстур).
 * Вызывается перед удалением старой сцены, чтобы не держать память.
 */
const disposeScene = (scene: THREE.Scene) => {
    if (!scene) return;
    scene.traverse((obj: any) => {
        // удаляем геометрию
        if (obj.geometry) {
            try {
                obj.geometry.dispose();
            } catch {}
        }
        // удаляем материал и его текстуры
        if (obj.material) {
            const mat = obj.material;
            // если материал - массив
            if (Array.isArray(mat)) {
                mat.forEach((m: any) => {
                    if (m.map) { try { m.map.dispose(); } catch {} }
                    if (m.lightMap) { try { m.lightMap.dispose(); } catch {} }
                    if (m.normalMap) { try { m.normalMap.dispose(); } catch {} }
                    try { m.dispose && m.dispose(); } catch {}
                });
            } else {
                if (mat.map) { try { mat.map.dispose(); } catch {} }
                try { mat.dispose && mat.dispose(); } catch {}
            }
        }
    });
}

/**
 * Устанавливает новую сцену как основную: переносит камеру, очищает старую сцену
 * и оповещает подписчиков.
 */
export const setMainScene = (newScene: THREE.Scene) => {
    const oldScene = currentScene;

    // если та же сцена - ничего не делаем
    if (newScene === oldScene) return;

    // удаляем камеру из старой сцены (если там была)
    try {
        oldScene.remove(camera);
    } catch {}

    // Очистка старой сцены ресурсов (опционально)
    try {
        disposeScene(oldScene);
    } catch (e) {
        console.warn("disposeScene failed:", e);
    }

    // Устанавливаем сцену и добавляем камеру
    currentScene = newScene;
    try {
        currentScene.add(camera);
    } catch (e) {
        console.warn("add camera failed:", e);
    }

    // оповещаем подписчиков
    sceneChangeSubscribers.forEach(cb => {
        try { cb(currentScene, oldScene); } catch (e) { console.warn("sceneChange subscriber error", e); }
    });
}

// -------------------- Утилиты и основные операции --------------------
const getObjectById = (id: number) => {
    return currentScene.getObjectById(id)
}

const getObjectByName = (name: string) => {
    return currentScene.getObjectByName(name)
}

const getAllObjects = () => currentScene.children

/**
 * Создание простого объекта (mesh) и добавление в текущую сцену.
 * @returns id: number
 */
const create = (params: CustomObjectParams) => {
    const object = createObject(params);

    object.visible = true;
    if (object instanceof Mesh) {
        object.frustumCulled = false;
    }

    currentScene.add(object);

    object.updateMatrixWorld(true);
    markSceneDirty();

    return object.id;
};


const create_model_OBJ = (model_name: string) => {
    console.log("create_model", model_name)
    let id: number | undefined
    LoadModel_OBJ(model_name, (new_object) => {
        if (new_object) {
            new_object.children.map(child => {
                if (child instanceof THREE.Mesh)
                    child.material = new THREE.MeshStandardMaterial({ color: new Color(0.5, 0.5, 0.5) })
            })
        }
        currentScene.add(new_object)
        id = new_object.id
    });
    return id
}

const create_model = async (path: string) => {
    let id: number | undefined
    let childrenWithName: { name: string; id: number; }[] = []
    console.log("create_model", path)
    await LoadModel(path, (new_object) => {
        currentScene.add(new_object)
        id = new_object.id;
        childrenWithName = getAllObjectsWithName(new_object.children)
    })
    return id
}

const get_model_names = async (id: number) => {
    let childrenWithName: { name: string; id: number; }[] = []
    const obj = getObjectById(id);

    if (!obj) return;

    childrenWithName = getAllObjectsWithName(obj.children)

    return childrenWithName
}

const add_texture = (id: number, path: string) => {
    const obj = getObjectById(id)

    if (!obj) return;

    let temp = 0;
    loadTexture(path, (texture) => {
        if (obj instanceof Mesh) {
            if (obj.material instanceof THREE.MeshStandardMaterial){
                obj.material.map = texture;
                temp = 1;
            }
        }
    })

    return temp == 1;
}

const update = (id: number, params: CustomObjectParams) => {
    const object = getObjectById(id);

    if (!object) {
        console.warn("[update] object not found:", id);
        return;
    }

    // 🔹 позиция
    if (params.position) {
        object.position.set(
            params.position[0],
            params.position[1],
            params.position[2]
        );
    }

    // 🔹 обязательно!
    object.updateMatrix();
    object.updateMatrixWorld(true);

    // 🔹 помечаем сцену как изменённую
    markSceneDirty();

    console.log("[update] applied", {
        id,
        pos: object.position.toArray()
    });

    return id;
};

const updateByName = (name: string, params: CustomObjectParams) => {
    const object = getObjectByName(name)

    if (object) {
        setParamsToObject3D(object, params)
    }

    return object?.id
}

const group = (idParent: number, idChild: number) => {
    const parent = getObjectById(idParent)
    const child = getObjectById(idChild)

    if (parent && child) {
        const worldPos = child.position;
        const localePos = parent.worldToLocal(worldPos);
        parent.add(child)
        child.position.set(localePos.x, localePos.y, localePos.z);
        return true
    }
}

const rgroup = (idParent: number, idChild: number) => {
    const parent = getObjectById(idParent)
    const child = getObjectById(idChild)

    if (parent && child) {
        const worldPos = child.getWorldPosition(worldVector);
        currentScene.add(child)
        parent.remove(child)
        child.position.set(worldPos.x, worldPos.y, worldPos.z);
        return true
    }
}

const robj = (id: number) => {
    const obj = getObjectById(id)
    if (obj) {
        currentScene.remove(obj)
        return id
    }
    return
}

// -------------------- Загрузка всей сцены из файла (wrapper) --------------------
/**
 * Загружает объект (или целую сцену) из JSON/OBJ и делает его новой главной сценой.
 * path - путь к JSON/OBJ, совместим с LoadModel / LoadModel_OBJ
 */
export const loadSceneFromPath = async (path: string) => {
    // Создаём новую сцену
    const newScene = new THREE.Scene();
    // добавим камеру в неё позже в setMainScene
    // Подгрузим модель/сцену
    await LoadModel(path, (obj) => {
        newScene.add(obj)
    })
    // Установим как главную сцену (внутри setMainScene добавится камера)
    setMainScene(newScene)
    return newScene;
}

export { /*getMainScene, setMainScene, onSceneChange,*/ get_model_names, add_texture, getAllObjects, getObjectById, create, update, updateByName, group, rgroup, create_model, create_model_OBJ }
