import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theme } from "../design-system";
import { Change } from "./change";

/*
 * How far a figure moved, and which way.
 *
 * The arrow is there so the direction is not carried by the color alone,
 * and the word beside it is there for somebody who sees neither -- nothing in
 * this product is said in color alone. Both are what this file is for.
 */

const renderChange = (element: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{element}</ThemeProvider>);

describe("which way a figure went", () => {
  it("says how far it moved", () => {
    renderChange(<Change percent={5.5} direction="up" />);

    expect(screen.getByText("5.5%")).toBeInTheDocument();
  });

  // Three ways at once: the color, the arrow, and the word. A reader who
  // cannot tell green from red still has two of them.
  it("draws an arrow as well as coloring it", () => {
    const { container } = renderChange(<Change percent={5.5} direction="up" />);

    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.firstElementChild).toHaveStyle({
      color: theme.palette.brand.rise,
    });
  });

  it("says the direction in a word, for somebody who sees neither", () => {
    renderChange(<Change percent={5.5} direction="up" />);
    expect(screen.getByText("up")).toBeInTheDocument();

    renderChange(<Change percent={1.5} direction="down" />);
    expect(screen.getByText("down")).toBeInTheDocument();
  });

  it("colors a fall differently from a rise", () => {
    const { container } = renderChange(
      <Change percent={1.5} direction="down" />,
    );

    expect(container.firstElementChild).toHaveStyle({
      color: theme.palette.brand.fall,
    });
  });
});

const background = (element: Element) =>
  getComputedStyle(element).backgroundColor;

describe("the two forms it takes", () => {
  // Bare text on a tile, a pill on the revenue card.
  it("is bare text unless it is asked to be a pill", () => {
    const { container } = renderChange(<Change percent={5.5} direction="up" />);

    expect(background(container.firstElementChild as Element)).toBe(
      "rgba(0, 0, 0, 0)",
    );
  });

  it("takes the card's tint when it is a pill", () => {
    const { container } = renderChange(
      <Change percent={5.5} direction="up" tinted />,
    );

    expect(background(container.firstElementChild as Element)).not.toBe(
      "rgba(0, 0, 0, 0)",
    );
  });
});
