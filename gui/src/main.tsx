import "@fontsource/roboto-mono/latin.css";
import "@fontsource/roboto/latin.css";

import {
  RouterProvider,
  createHashHistory,
  createRouter,
} from "@tanstack/react-router";
import React from "react";

import { routeTree } from "./routeTree.gen";
import { createRoot } from "react-dom/client";

const router = createRouter({ routeTree, history: createHashHistory() });

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
