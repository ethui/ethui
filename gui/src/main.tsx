import "./styles/main.css";

import {
  createHashHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import React from "react";

import { createRoot } from "react-dom/client";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
  routeTree,
  history: createHashHistory(),
  context: {},
});

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
