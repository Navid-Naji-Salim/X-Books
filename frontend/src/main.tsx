import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource-variable/noto-sans-arabic/index.css";
import "./styles.css";
import { App } from "./App";
import { LanguageProvider } from "./i18n";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <LanguageProvider><BrowserRouter><App /><div id="floating-options-root" /></BrowserRouter></LanguageProvider>
  </StrictMode>,
);
