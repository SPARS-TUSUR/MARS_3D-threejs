import { WS_PORT } from "./config";
import { CustomObjectParams, GroupParams, ModelParams, UpdateByNameParams } from "./threejs/CustomObject3D";
import { add_texture, create, create_model, create_model_OBJ, get_model_names, group, rgroup, update, updateByName } from "./threejs/ObjectManager";
import { sleep } from "./utils";


interface Command {
    name: "create" | "update" | "group" | "r_group" | "create_model" | "create_model_obj" | "add_texture" | "update_by_name" | "get_model_names" | "get_position"
    data: { id?: number } & CustomObjectParams & GroupParams & ModelParams & UpdateByNameParams
}

interface IndexedCommand {
    id: number
    data: string
}

let socket: WebSocket | undefined

// let comands: string[] = []

const createWebSocket = (port = 5001) => {
    socket?.close();

    socket = new WebSocket(`ws://localhost:${port}/`);
    socket.onopen = (ev) => {
        console.log("Opened session!");
    };


    // socket.onmessage = async (ev) => {
    //     console.log("RAW MESSAGE RECEIVED:", ev.data);

    //     let res: {
    //         id: number
    //         isResult: boolean
    //         data: string
    //     } | undefined;

    //     let iCommand: IndexedCommand;
    //     let command: Command; 
    //     try {
    //         iCommand = JSON.parse(ev.data)
    //         command = JSON.parse(iCommand.data);
    //     }
    //     catch {
    //         throw new Error("Wrong request type: Unable to parse JSON")
    //     }
        
    //     let commandRes;
    //     let id: number | null = null
    //     let names: any | null = null
        
    //     try {
    //         console.log(command)
    //         commandRes = await handleCommand(command);
            
    //         if (typeof commandRes == "number")
    //             id = commandRes
    //         else if (typeof commandRes != "number" && typeof commandRes != "boolean")
    //             names = commandRes
    //     } catch {
    //         commandRes = undefined;
    //     }

    //     try {
            
    //         res = {
    //             id: iCommand.id,
    //             isResult: true,
    //             data: JSON.stringify({
    //                 name: command.name,
    //                 id: command.data.id || id,
    //                 data: { id, names },
    //                 isSuccess: commandRes != undefined,
    //             })
    //         }

    //         if (socket)
    //             socket?.send(JSON.stringify(res))
    //     }
    //     catch {
    //         throw new Error("No connection");
    //     }
    // };

    socket.onmessage = async (ev) => 
    {
        try 
        {
            // outer: { id: number, data: { name: "...", data: {...} } }
            const outer = JSON.parse(ev.data as string);

            // basic validation
            if (!outer || typeof outer !== "object") 
            {
                console.warn("Received non-object outer message", outer);
                return;
            }

            // inner command object is directly an object now
            const commandObj = outer.data; // { name: "create"|"update"|..., data: {...} }
            if (!commandObj || typeof commandObj !== "object")
            {
                console.warn("Outer.data is not an object:", outer.data);
                return;
            }

            console.log("Parsed command object:", commandObj);

            // Теперь вызываем вашу существующую обработку (handleCommand),
            // но у вас handleCommand в WebClient.ts ожидает IndexedCommand ранее.
            // Подстроим: если у вас есть функция handleCommand(command: Command) — вызовите её.
            // Например:
            try 
            {
                // Если ваша handleCommand ожидает объект с полями name и data — это совпадает.
                const result = await handleCommand(commandObj as any);
                console.log("[handleCommand] update data:", commandObj);
                console.log("handleCommand result:", result);
            }
            catch (err) 
            {
                console.error("Ошибка при выполнении handleCommand:", err);
            }

            // Если требуется, можно отправить клиенту ответ-ack:
            // const response = { id: outer.id, isResult: true, data: JSON.stringify({ ... }) };
            // socket.send(JSON.stringify(response));
        } 
        
        catch (err) 
        {
            console.error("Ошибка парсинга сообщения от сервера:", err, ev.data);
        }
    };


    socket.onclose = (ev) => {
        socket = undefined
        console.log("Conection closed!")
    }

    return socket
}


export const sendClick = async (id: number) => {
    try {
        const res = {
            id: 0,
            isResult: false,
            data: JSON.stringify({
                name: "click",
                id
            })
        }
        await socket?.send(JSON.stringify(res))
        console.log("click", res)
    }
    catch (err) {
        return
    }
}

const handleCommand = async (command: Command) => {
    switch (command.name) {
        case "create":
            return create(command.data);
        case "update":
            if (command.data.id != undefined)
            {
                console.log("[WS] update", command.data.id, command.data);
                return update(command.data.id, command.data);
            }
            throw "Id required, but not provided"
        case "update_by_name":
            if (command.data.name != undefined)
                return updateByName(command.data.name, command.data);
            throw "Name required, but not provided"
        case "group":
            if (command.data.id != undefined && command.data.object_id != undefined)
                return group(command.data.id, command.data.object_id);
            throw "Ids required, but not provided"
        case "r_group":
            if (command.data.id != undefined && command.data.object_id != undefined)
                return rgroup(command.data.id, command.data.object_id);
            throw "Ids required, but not provided"

        case "create_model":
            if (command.data.path != undefined)
                return create_model(command.data.path);
            break

        case "create_model_obj":
            if (command.data.path != undefined)
                return create_model_OBJ(command.data.path);
            break

        case "add_texture":
            if (command.data.id != undefined && command.data.path != undefined)
                return add_texture(command.data.id, command.data.path);
            break

        case "get_model_names":
            if (command.data.id != undefined)
                return get_model_names(command.data.id);
            break
    }
}

const reconectLoop = async (port: number, sec = 1) => {
    while (true) {
        if (socket == undefined) {
            try {
                await createWebSocket(port)
            }
            catch (err) { }
        }
        await sleep(sec * 1000)
    }
}
export const initSockets = () => {
    reconectLoop(WS_PORT, 2)

    console.log("INITIALIZED SOCKETS!")
}

export { createWebSocket }