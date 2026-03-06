import { NuqsAdapter } from "nuqs/adapters/react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <NuqsAdapter>
      <App />
    </NuqsAdapter>,
  );
}
