import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import "./page-shell.css";

/* The violet field and header every route is rendered inside. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="page-shell__main">{children}</main>
    </div>
  );
}
