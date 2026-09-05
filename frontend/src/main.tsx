import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { TooltipProvider } from "./components/ui/tooltip";
import { IndexRedirect } from "./IndexRedirect";
import "./index.css";
import { BrowseDetailPage } from "./pages/BrowseDetailPage";
import { BrowsePage } from "./pages/BrowsePage";
import { ConfigPage } from "./pages/ConfigPage";
import { ConnectPage } from "./pages/ConnectPage";
import { ManagePage } from "./pages/ManagePage";
import { SettingsPage } from "./pages/SettingsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <IndexRedirect /> },
      { path: "browse", element: <BrowsePage /> },
      { path: "browse/*", element: <BrowseDetailPage /> },
      { path: "manage", element: <ManagePage /> },
      { path: "config", element: <ConfigPage /> },
      { path: "connect", element: <ConnectPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
  </React.StrictMode>,
);
