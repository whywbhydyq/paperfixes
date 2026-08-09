import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import RootApp from "./RootApp";

const root = createRoot(document.getElementById("root")!);
const isRootEditor = window.location.pathname === "/" || window.location.pathname === "/index.html";

if (isRootEditor) {
  root.render(
    <StrictMode>
      <RootApp />
    </StrictMode>,
  );
} else {
  root.render(
    <StrictMode>
      <div role="status" aria-live="polite" className="mx-auto max-w-6xl px-6 py-16 text-sm text-gray-500">
        页面加载中…
      </div>
    </StrictMode>,
  );
  import("./App")
    .then(({ default: App }) => {
      root.render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    })
    .catch(() => {
      root.render(
        <StrictMode>
          <div role="alert" className="mx-auto max-w-6xl px-6 py-16 text-sm text-red-600">
            页面加载失败，请刷新后重试。
          </div>
        </StrictMode>,
      );
    });
}
