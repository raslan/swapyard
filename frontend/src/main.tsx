import React from "react";
import ReactDOM from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import "./index.css";
import { BrowseDetailPage } from "./pages/BrowseDetailPage";
import { BrowsePage } from "./pages/BrowsePage";
import { ManagePage } from "./pages/ManagePage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/browse" replace /> },
      { path: "browse", element: <BrowsePage /> },
      { path: "browse/*", element: <BrowseDetailPage /> },
      { path: "manage", element: <ManagePage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
