import React from "react";
import { createRoot } from "react-dom/client";
import AppPiedilistaOmezzolli from "./AppPiedilistaOmezzolli.jsx";
import "./index.css";   // ✅ importa Tailwind

const root = document.getElementById("root");
createRoot(root).render(
  <React.StrictMode>
    <AppPiedilistaOmezzolli />
  </React.StrictMode>
);

