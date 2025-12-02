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
    console.log('=====[ObjectManager.create] params =', params);
    const object = createObject(params)
    MainScene.add(object)
    console.log('=====[ObjectManager.create] added id=', object.id);
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

console.log("SCENE CHILDREN COUNT:", MainScene.children.length);
MainScene.children.forEach((c, i) => {
  console.log(i, "id:", c.id, "name:", c.name, "type:", c.type, "visible:", c.visible, "pos:", c.position ? c.position.toArray() : null, "scale:", c.scale ? c.scale.toArray() : null);
});

export { MainScene, camera as MainCamera, get_model_names, add_texture, getAllObjects, getObjectById, create, update, updateByName, group, rgroup, create_model, create_model_OBJ }