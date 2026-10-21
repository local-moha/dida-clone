import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initTheme } from "./store/useThemeStore";
import "./index.css";

// 必须在首次渲染前应用主题，避免深色模式下的白屏闪烁
initTheme();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
