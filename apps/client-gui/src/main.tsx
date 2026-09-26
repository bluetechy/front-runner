import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WidgetTester } from "./widget-tester";

/*
 * The whole of this app's bootstrap: React, and the one page.
 *
 * Deliberately shorter than main-gui's. There is no theme, no router, no query
 * client and no i18next, because a customer embedding a widget has none of
 * those either and this app stands in for a customer. See widget-tester.tsx.
 */

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("index.html is missing the #root element");
}

createRoot(rootElement).render(
  <StrictMode>
    <WidgetTester />
  </StrictMode>,
);
