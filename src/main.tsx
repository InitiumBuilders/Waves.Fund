import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { StateProvider } from "./state";
import "./layers.css";
// The shared components' stylesheets, first in the base layer (src/layers.css); their components import them too.
import "./mind/mind.css";
import "./symbols.css";
import "./together/give-landing.css";
import "./trax.css";
import "./sea-hero.css";
import "./together/ripple.css";
import "./circuit.css";
import App from "./App";
import "@fontsource-variable/inter";
import "./style.css";
import "./refine.css";
import "./motus.css";
import "./clarity.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <StateProvider>
        <App />
      </StateProvider>
    </BrowserRouter>
  </StrictMode>,
);
