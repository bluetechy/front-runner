import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it } from "vitest";
import { theme } from "../design-system";
import { Route } from "./_app.tutorials";

/*
 * /tutorials — a page the rail or the header links to but that is not built yet.
 *
 * A route file declares the route and renders one thing; anything longer
 * belongs in a vertical (docs/codebase-structure.md). So what is asserted is
 * the one thing: that this URL leads to the placeholder, under the name the
 * link beside it uses. A link that goes nowhere is worse than no link, and a
 * placeholder titled after the wrong page is worse again.
 *
 * The router's plugin rewrites `component` into a lazily loaded one so that
 * each page is its own chunk, which is why this renders inside a `Suspense`
 * and waits rather than asserting on the first frame.
 */

describe("/tutorials", () => {
  it("renders the placeholder, named for the page it stands in for", async () => {
    const Page = Route.options.component!;

    render(
      <ThemeProvider theme={theme}>
        <Suspense fallback={null}>
          <Page />
        </Suspense>
      </ThemeProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Tutorials" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/has not been built yet/)).toBeInTheDocument();
  });
});
