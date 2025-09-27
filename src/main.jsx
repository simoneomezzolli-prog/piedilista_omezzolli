import React from "react";
import { createRoot } from "react-dom/client";
import AppPiedilistaOmezzolli from "./AppPiedilistaOmezzolli.jsx";

// Se usi Tailwind o CSS globali, importa qui
// import "./index.css";

const root = document.getElementById("root");
createRoot(root).render(
  <React.StrictMode>
    <AppPiedilistaOmezzolli />
  </React.StrictMode>
);
