import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theme } from "../design-system";
import { ComingSoon } from "./coming-soon";

/*
 * The placeholder four routes in the rail and two in the header render. It
 * exists so that the shape of the product is visible before all of it is --
 * and so that a link in the rail goes somewhere rather than nowhere.
 */

const renderIn = (element: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{element}</ThemeProvider>);

describe("a page that has not been built yet", () => {
  it("says which page it would be", () => {
    renderIn(<ComingSoon title="Achievements" />);

    expect(
      screen.getByRole("heading", { name: "Achievements" }),
    ).toBeInTheDocument();
  });

  // Plainly, rather than "coming soon": nobody has promised a date.
  it("says plainly that it is not built", () => {
    renderIn(<ComingSoon title="Achievements" />);

    expect(screen.getByText(/has not been built yet/i)).toBeInTheDocument();
  });

  // It is rendered inside whichever shell its route sits in -- the marketing
  // one or the one behind the login -- so it draws no chrome of its own.
  it("draws no chrome around itself", () => {
    const { container } = renderIn(<ComingSoon title="Achievements" />);

    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelector("nav")).toBeNull();
  });
});
