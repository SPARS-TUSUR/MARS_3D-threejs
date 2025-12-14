import "./App.css";
import ThreeCanvas from "./components/ThreeCanvas";
import { initSockets } from "./WebClient";
import { useEffect, useState } from "react";
import { loadSceneFromPath } from "./threejs/ObjectManager";

function App() {
  useEffect(() => {
    initSockets();
  }, []);

  // слушаем сообщения от iframe (редактора), чтобы загрузить сцену в главный Canvas
  useEffect(() => {
    const onMessage = async (ev: MessageEvent) => {
      // Проверяем источник и формат
      try {
        const data = ev.data;
        if (!data || typeof data !== "object") return;
        if (data.type === "loadScene" && typeof data.path === "string") {
          console.log("App: loadScene message received:", data.path);
          try {
            await loadSceneFromPath(data.path);
            console.log("Scene loaded from path:", data.path);
          } catch (e) {
            console.error("Failed to load scene:", e);
          }
        }
      } catch (err) {
        console.warn("onMessage parse error", err);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const [box, setBox] = useState(false);
  const [state, setState] = useState(1);

  return (
    <div className="App">
      <header className="App-header">
        <div id="box" style={{ opacity: box ? "1" : "0.3", top: "0" }}>
          {box && (
            <>
              <button
                onClick={() => {
                  setBox(!box);
                  setState(1);
                }}
              >
                Визуализатор
              </button>
              <button
                onClick={() => {
                  setBox(!box);
                  setState(0);
                }}
              >
                Редактор
              </button>
              <hr />
            </>
          )}
          <button
            style={{ backgroundColor: box ? "#b05159" : "#354f52" }}
            onClick={() => setBox(!box)}
            id="box_btn"
          >
            {box ? "Закрыть" : "Открыть"}
          </button>
        </div>
        {state ? (
          <ThreeCanvas />
        ) : (
          <iframe
            id="editor_iframe"
            src="three-editor/editor/index.html"
            style={{ height: "100vh", width: "100vw", zIndex: "10" }}
            title="Three Editor"
          ></iframe>
        )}
      </header>
    </div>
  );
}

export default App;
