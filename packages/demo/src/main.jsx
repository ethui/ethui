import {
  RouterProvider,
  createHashHistory,
  createRouter,
} from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@ethui/ui/tailwind.css";
import "@rainbow-me/rainbowkit/styles.css";

import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  history: createHashHistory(),
  context: {},
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
