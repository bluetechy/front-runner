import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theme } from "../design-system";
import { StatTile } from "./stat-tile";
import { tiles } from "./metrics";

/*
 * One figure from `metrics.tiles`: a tinted icon, the label over the number,
 * and under it the same number a period ago with how far it moved.
 *
 * The tiles are drawn from the metrics rather than made up here, so a tile
 * that stops drawing one of its four parts fails whichever one it is.
 */

const [orders] = tiles;

const renderTile = (tile = orders!) =>
  render(
    <ThemeProvider theme={theme}>
      <StatTile tile={tile} />
    </ThemeProvider>,
  );

describe("a tile", () => {
  it("says what it is measuring", () => {
    renderTile();

    expect(screen.getByText(orders!.label)).toBeInTheDocument();
  });

  it("shows the figure, and the same figure a period ago", () => {
    renderTile();

    expect(screen.getByText(orders!.value)).toBeInTheDocument();
    expect(screen.getByText(orders!.previous)).toBeInTheDocument();
  });

  it("says how far it moved, and which way", () => {
    renderTile();

    expect(screen.getByText(`${orders!.changePercent}%`)).toBeInTheDocument();
    expect(screen.getByText(orders!.direction)).toBeInTheDocument();
  });

  // The icon says the same thing the label does, so a screen reader reading
  // both would say it twice.
  it("hides its icon from a screen reader", () => {
    const { container } = renderTile();
    const disc = container.querySelector("[aria-hidden]");

    expect(disc?.querySelector("svg")).not.toBeNull();
  });

  it.each(tiles.map((tile) => [tile.label, tile] as const))(
    "draws %s",
    (_label, tile) => {
      renderTile(tile);

      expect(screen.getByText(tile.value)).toBeInTheDocument();
    },
  );
});
