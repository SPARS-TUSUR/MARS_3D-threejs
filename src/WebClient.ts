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

    // Поместите этот код вместо старого socket.onmessage
        socket.onmessage = async (ev) => {
        // --- Вспомогательные утилиты -------------------------------------------

        // Конвертирует ev.data (string | ArrayBuffer | Blob) в текст
        const toText = async (data: any): Promise<string> => {
            if (typeof data === "string") return data;
            if (data instanceof ArrayBuffer) {
            return new TextDecoder("utf-8").decode(new Uint8Array(data));
            }
            if (data instanceof Blob) {
            return await data.text();
            }
            // На всякий случай
            return String(data);
        };

    // Извлекает *все* JSON-объекты из строки (учитывает строки и экранирование)
        function extractJsonObjects(text: string): string[] {
            const results: string[] = [];
            let depth = 0;
            let inString = false;
            let escapeNext = false;
            let startIndex = -1;

            for (let i = 0; i < text.length; ++i) {
            const ch = text[i];

            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            if (ch === '\\') {
                escapeNext = true;
                continue;
            }

            if (ch === '"') {
                inString = !inString;
                continue;
            }

            if (inString) continue;

            if (ch === '{') {
                if (depth === 0) startIndex = i;
                depth++;
                continue;
            }

            if (ch === '}') {
                depth--;
                if (depth === 0 && startIndex !== -1) {
                results.push(text.substring(startIndex, i + 1));
                startIndex = -1;
                }
                continue;
            }
            }

            return results;
        }

        // Пытаемся распарсить JSON, возвращаем undefined при ошибке
        const tryParseJson = (s: string): any | undefined => {
            try 
            {
                return JSON.parse(s);
            } 
            catch 
            {
                return undefined;
            }
        };

        // --- Начало обработчика ------------------------------------------------
        let rawText: string;
        try {
            rawText = await toText(ev.data);
        } 
        catch (err) 
        {
            console.error("socket.onmessage: Не удалось прочитать данные фрейма:", err);
            return;
        }

        console.log("RAW MESSAGE RECEIVED:", rawText);

        const chunks = extractJsonObjects(rawText);
        if (chunks.length === 0) 
        {
            console.warn("socket.onmessage: В фрейме не найдено JSON-объектов.");
            return;
        }

        // Обрабатываем каждый найденный JSON-объект (chunk) по очереди
        for (const chunk of chunks) 
        {
            console.log("Обрабатываем каждый найденный JSON-объект (chunk) по очереди");
            let outer: any;
            try 
            {
                outer = JSON.parse(chunk);
            } 
            catch (err) 
            {
                console.error("socket.onmessage: Ошибка парсинга внешнего JSON-чанка:", err, "chunk:", chunk);
                continue;
            }

            // outerId — id из внешней обертки (если есть). Будем использовать его при отправке ответа.
            const outerId: number | null = typeof outer === "object" && outer !== null && typeof outer.id === "number" ? outer.id : 0;
            console.log("outerId — id из внешней обертки (если есть). Будем использовать его при отправке ответа.");

            // Нормализуем внутренний commandObj в формат { name: string, data: any }
            let commandObj: any | null = null;
            console.log("Нормализуем внутренний commandObj в формат { name: string, data: any }");

            // Если outer.data — строка с JSON => это IndexedCommand
            if (outer && typeof outer === "object" && typeof outer.data === "string") 
            {
                console.log("Если outer.data — строка с JSON => это IndexedCommand");
                // пытаемся распарсить внутреннюю строку
                commandObj = tryParseJson(outer.data);
                if (!commandObj) 
                {
                    console.log("lenient-попытка: заменить одинарные кавычки на двойные (на случай хаков)");
                    // lenient-попытка: заменить одинарные кавычки на двойные (на случай хаков)
                    try 
                    {
                        const sanitized = outer.data.replace(/'/g, '"');
                        commandObj = JSON.parse(sanitized);
                    } 
                    catch (err) 
                    {
                        console.error("socket.onmessage: Не удалось распарсить outer.data как JSON:", err, "outer.data:", outer.data);
                        continue;
                    }
                }
            }
            // Если outer уже похож на command (имеет поле name) — используем его напрямую
            else if (outer && typeof outer === "object" && typeof outer.name === "string") 
            {
                console.log("Если outer уже похож на command (имеет поле name) — используем его напрямую");
                commandObj = outer;
            } 
            else 
            {
                console.warn("socket.onmessage: JSON не соответствует ни IndexedCommand, ни Direct Command:", outer);
                continue;
            }
            
            let commandResult;
            let id: number | null = null
            let namess: any | null = null

            // --- Здесь вызываем старую логику handleCommand и формируем ответ ---
            try 
            {
                // Логируем распарсенный объект команды (полезно для отладки)
                console.log("Parsed command object:", commandObj);

                // Вызов старой логики (функция handleCommand уже должна быть в том же файле/модуле)
                // handleCommand возвращает: number | boolean | array/other | undefined (в твоём коде)
                //let commandResult: any = undefined;
                try 
                {
                    // handleCommand может быть async, поэтому await
                    console.log("========== идём 1111 ==========");
                    commandResult = await handleCommand(commandObj);
                    console.log("========== идём 2222 ==========");

                    if(typeof commandResult == "number")
                    {
                        console.log("========== идём 3333 ==========");
                        id = commandResult;
                        console.log("========== идём 4444 ==========");
                    }
                    else if (typeof commandResult != "number" && typeof commandResult != "boolean")
                    {
                        console.log("========== идём 5555 ==========");
                        namess = commandResult;
                        console.log("========== идём 6666 ==========");
                    }
                } 
                catch (err) 
                {
                    console.warn("socket.onmessage: handleCommand выбросил исключение:", err);
                    commandResult = undefined;
                }

                // Подготовим формат ответа так, как это делалось раньше
                // id (в теле ответа) — если handleCommand вернул число, считаем это id созданного объекта
                let createdId: number | null = null;
                let names: any | null = null;
                if (typeof commandResult === "number")
                {
                    createdId = commandResult;
                } 
                else if (typeof commandResult !== "number" && typeof commandResult !== "boolean") 
                {
                names = commandResult;
                }

                const responsePayload = {
                    name: commandObj.name,
                    id: commandObj.data?.id || createdId,
                    data: { id: createdId, names },
                    isSuccess: commandResult !== undefined
                };

                const wrapperResponse = {
                    id: outerId,      // outerId = 0 если его не было — можно менять на null, если нужно
                    isResult: true,
                    data: JSON.stringify(responsePayload)
                };

                // Отправляем ответ назад (если socket существует)
                try 
                {
                    if (socket) 
                    {
                        socket.send(JSON.stringify(wrapperResponse));
                    } 
                    else 
                    {
                    console.warn("socket.onmessage: socket === undefined, не могу отправить ответ.");
                    }
                } 
                catch (err) 
                {
                    console.error("socket.onmessage: Ошибка при отправке ответа:", err);
                }

            } 
            catch (err) 
            {
                console.error("socket.onmessage: Ошибка при обработке команды:", err);
            }
        } // конец for chunks
    }; // конец socket.onmessage


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
                return update(command.data.id, command.data);
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