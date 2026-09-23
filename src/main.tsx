import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { StateProvider } from "./state";
import App from "./App";
import { MemberBoundary } from "./member-boundary";
import "@fontsource-variable/inter";
import "./style.css";
import "./refine.css";
import "./motus.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <StateProvider>
        <MemberBoundary><App /></MemberBoundary>
      </StateProvider>
    </BrowserRouter>
  </StrictMode>,
);
import "./refine.css";
