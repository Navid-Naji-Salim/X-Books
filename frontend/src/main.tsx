import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "@fontsource-variable/noto-sans-arabic/index.css";
import "./styles.css";
import { App } from "./App";
import { LanguageProvider } from "./i18n";

const router = createBrowserRouter([{ path: "*", element: <App /> }]);

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <LanguageProvider><RouterProvider router={router} /><div id="floating-options-root" /></LanguageProvider>
  </StrictMode>,
);
