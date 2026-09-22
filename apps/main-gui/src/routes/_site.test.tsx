import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * The marketing pages: the violet field, the header, and the sign-in dialog
 * the header opens. Pathless, so the URLs beneath it are unchanged.
 *
 * Its counterpart is `_app`, which wraps the pages behind the login. The two
 * never appear together, which is why neither is in the root.
 */

vi.mock("../site-chrome", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-shell">{children}</div>
  ),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Outlet: () => <p>The page</p>,
}));

const { Route } = await import("./_site");

describe("the marketing layout", () => {
  it("puts every page under it inside the marketing shell", () => {
    const Layout = Route.options.component!;

    render(
      <ThemeProvider theme={theme}>
        <Layout />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("page-shell")).toHaveTextContent("The page");
  });
});
