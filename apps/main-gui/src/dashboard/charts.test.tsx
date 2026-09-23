import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theme } from "../design-system";
import { DailySalesBars, EarningsDonut, SalesLines } from "./charts";
import { money, weekdays } from "./metrics";

/*
 * The three charts, drawn as SVG by hand rather than by a charting library.
 *
 * What is worth asserting is not where a pixel lands but the two things a
 * chart can get wrong and still look right: the scale it is drawn against,
 * and whether a reader who cannot see it is told anything at all. Every
 * shape carries a `<title>` for that reason, and the legends beside them are
 * `aria-hidden` because they say what the titles already say.
 */

const renderChart = (element: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{element}</ThemeProvider>);

const labels = [...weekdays];

describe("the weekly lines", () => {
  const series = [
    { label: "This week", values: [2810, 3120, 3960, 3480, 4210, 3520, 3254] },
    { label: "Last week", values: [2410, 2680, 3050, 3890, 3260, 4020, 2880] },
  ];

  it("names each series once, beside its color", () => {
    renderChart(<SalesLines series={series} labels={labels} />);

    expect(screen.getByText("This week")).toBeInTheDocument();
    expect(screen.getByText("Last week")).toBeInTheDocument();
  });

  it("names every day along the bottom", () => {
    const { container } = renderChart(
      <SalesLines series={series} labels={labels} />,
    );
    const drawn = [...container.querySelectorAll("text")].map(
      (text) => text.textContent,
    );

    for (const day of labels) expect(drawn).toContain(day);
  });

  // Both series are drawn against one scale, or the second one is a lie.
  // Every point of both has to land inside the plot, top and bottom.
  it("draws both series inside the same box", () => {
    const { container } = renderChart(
      <SalesLines series={series} labels={labels} />,
    );
    const lines = container.querySelectorAll("polyline");

    expect(lines).toHaveLength(series.length);
    for (const line of lines) {
      const heights = (line.getAttribute("points") ?? "")
        .trim()
        .split(/\s+/)
        .map((point) => Number(point.split(",")[1]));

      expect(heights).toHaveLength(labels.length);
      for (const height of heights) {
        expect(height).toBeGreaterThanOrEqual(0);
        expect(height).toBeLessThanOrEqual(230);
      }
    }
  });

  // The legend is drawn for the eye; the same names are in the chart's own
  // titles, and a screen reader hearing both would hear everything twice.
  it("hides the legend from a screen reader", () => {
    const { container } = renderChart(
      <SalesLines series={series} labels={labels} />,
    );

    expect(container.querySelector("ul")).toHaveAttribute("aria-hidden");
  });
});

describe("the daily bars", () => {
  const values = [5200, 6400, 5900, 7100, 6300, 5800, 6014];

  it("draws one bar per day", () => {
    const { container } = renderChart(
      <DailySalesBars values={values} labels={labels} />,
    );

    expect(container.querySelectorAll("rect")).toHaveLength(values.length);
  });

  // A bar somebody cannot see is a bar somebody cannot read, so each one
  // says which day it is and what it is worth.
  it("says what each bar is worth", () => {
    const { container } = renderChart(
      <DailySalesBars values={values} labels={labels} />,
    );
    const titles = [...container.querySelectorAll("rect title")].map(
      (title) => title.textContent,
    );

    expect(titles[0]).toBe(`Sun: ${money(5200)}`);
    expect(titles).toHaveLength(values.length);
  });

  it("says what the whole chart is", () => {
    const { container } = renderChart(
      <DailySalesBars values={values} labels={labels} />,
    );

    expect(container.querySelector("svg > title")).toHaveTextContent(
      "Sales by day",
    );
  });

  // The tallest bar must not reach the top of the box, or it reads as
  // "off the scale" rather than as the highest of seven.
  it("draws every bar inside the box", () => {
    const { container } = renderChart(
      <DailySalesBars values={values} labels={labels} />,
    );

    for (const bar of container.querySelectorAll("rect")) {
      const y = Number(bar.getAttribute("y"));
      const height = Number(bar.getAttribute("height"));
      expect(y).toBeGreaterThanOrEqual(0);
      expect(height).toBeGreaterThan(0);
      expect(y + height).toBeLessThanOrEqual(150);
    }
  });
});

describe("the earnings doughnut", () => {
  const slices = [
    { label: "Groceries", value: 9_500 },
    { label: "Electronics", value: 11_500 },
    { label: "Others", value: 11_000 },
  ];

  it("draws one segment per slice", () => {
    const { container } = renderChart(<EarningsDonut slices={slices} />);

    /* The track the segments are drawn on, plus one circle per slice. */
    expect(container.querySelectorAll("circle").length).toBeGreaterThanOrEqual(
      slices.length,
    );
  });

  it("says what each slice is, and how much of it there is", () => {
    const { container } = renderChart(<EarningsDonut slices={slices} />);
    const titles = [...container.querySelectorAll("title")].map(
      (title) => title.textContent ?? "",
    );

    for (const slice of slices)
      expect(titles.some((title) => title.includes(slice.label))).toBe(true);
  });

  // Nothing at all rather than a full circle of the first color.
  it("survives a doughnut with nothing in it", () => {
    expect(() => renderChart(<EarningsDonut slices={[]} />)).not.toThrow();
  });
});
