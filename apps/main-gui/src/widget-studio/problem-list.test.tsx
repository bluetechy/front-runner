import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theme } from "../design-system";
import { ProblemList } from "./problem-list";

const draw = (problems: string[]) =>
  render(
    <ThemeProvider theme={theme}>
      <ProblemList problems={problems} />
    </ThemeProvider>,
  );

describe("what was wrong with the document", () => {
  it("lists every problem, each naming where it is", () => {
    draw([
      "root.children[0].value: must be string",
      "canvas.width: is required",
    ]);
    expect(
      screen.getByText("root.children[0].value: must be string"),
    ).toBeInTheDocument();
    expect(screen.getByText("canvas.width: is required")).toBeInTheDocument();
  });

  /* A real list, so a screen reader says how many there are before reading
   * them: that is the first thing somebody wants to know. */
  it("is a list rather than a paragraph", () => {
    const { container } = draw(["one", "two", "three"]);
    expect(container.querySelectorAll("li")).toHaveLength(3);
  });

  /* Announced as an alert and carrying an icon as well as the color: nothing in
   * this product is said in color alone. */
  it("is announced rather than only colored", () => {
    draw(["one"]);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("That definition was refused")).toBeInTheDocument();
  });

  it("draws nothing at all when there is nothing wrong", () => {
    const { container } = draw([]);
    expect(container).toBeEmptyDOMElement();
  });
});
