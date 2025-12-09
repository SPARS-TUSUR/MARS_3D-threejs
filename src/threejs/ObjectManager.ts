import { createObject, CustomObjectParams, setParamsToObject3D } from "./CustomObject3D";
import * as THREE from "three"
import { getAllObjectsWithName, LoadModel, LoadModel_OBJ, loadTexture } from "./ModelLoader";
import { Color, Mesh, Scene } from "three";
import { initial } from "./Raycaster";
import { sleep } from "../utils";

const MainScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45)
const worldVector = new THREE.Vector3()
MainScene.add(camera)

const init1 = async () => {
    await sleep(1000)
    camera.position.set(0, 10, 20)
    console.log(MainScene.getObjectByProperty("type", "PerspectiveCamera"))
}
init1()

export const a = () => ""

const getObjectById = (id: number) => {
    return MainScene.getObjectById(id)
}

const getObjectByName = (name: string) => {
    return MainScene.getObjectByName(name)
}

const getAllObjects = () => MainScene.children

/**
 * 
 * @returns id: number
 */
const create = (params: CustomObjectParams) => {
    const object = createObject(params)

    // --- ОТЛАДОЧНЫЕ ИЗМЕНЕНИЯ: ---
    // Гарантируем видимость и отключаем фрум-калинг временно,
    // чтобы объект не "выпадал" из отрисовки
    object.visible = true;
    if (object instanceof Mesh) {
        object.frustumCulled = false;
        // на всякий случай включим тени (опционально)
        object.castShadow = true;
        object.receiveShadow = true;
    }

    MainScene.add(object)

    // Информация для дебага
    try {
        console.log("[ObjectManager.create] Добавлен объект id=", object.id,
            " type=", (object as any).type,
            " pos=", object.position.toArray(),
            " scale=", object.scale.toArray(),
            " children count=", MainScene.children.length);
        if (object instanceof Mesh) {
            console.log("[ObjectManager.create] geometry:", !!object.geometry, " material:", !!object.material);
        }
    } catch (e) {
        // ничего страшного
        console.warn("[ObjectManager.create] logging failed", e);
    }

    return object.id
}

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

        MainScene.add(new_object)
        id = new_object.id
    });
    return id
}

const create_model = async (path: string) => {
    let id: number | undefined
    let childrenWithName: {
        name: string;
        id: number;
    }[] = []
    console.log("create_model", path)
    await LoadModel(path, (new_object) => {
        MainScene.add(new_object)
        id = new_object.id;
        
        childrenWithName = getAllObjectsWithName(new_object.children)
    })
    return id
}

const get_model_names = async (id: number) => {
    let childrenWithName: {
        name: string;
        id: number;
    }[] = []
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

/**
 *
 * @returns id: number
 */
const update = (id: number, params: CustomObjectParams) => {
    const object = getObjectById(id)

    if (object) {
        setParamsToObject3D(object, params)
    }

    return object?.id
}

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
        MainScene.add(child)
        parent.remove(child)
        child.position.set(worldPos.x, worldPos.y, worldPos.z);
        
        return true
    }
}

const robj = (id: number) => {
    const obj = getObjectById(id)

    if (obj) {
        MainScene.remove(obj)
        return id
    }
    
    return
}

export { MainScene, camera as MainCamera, get_model_names, add_texture, getAllObjects, getObjectById, create, update, updateByName, group, rgroup, create_model, create_model_OBJ }