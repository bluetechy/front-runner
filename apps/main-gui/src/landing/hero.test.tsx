import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theme } from "../design-system";
import { Hero } from "./hero";

/*
 * The top of the marketing landing page.
 *
 * Both the words and the artwork are placeholder -- the copy is lorem ipsum
 * and the image is a flat screenshot with its edges faded off, which is what
 * the mask on it is for. What is asserted here is the shape that will outlive
 * them: a heading, two things to press, and an image that says what it shows
 * to somebody who cannot see it.
 */

const renderHero = () =>
  render(
    <ThemeProvider theme={theme}>
      <Hero />
    </ThemeProvider>,
  );

describe("the hero", () => {
  it("leads with the product's name", () => {
    renderHero();

    expect(
      screen.getByRole("heading", { name: "Gamification Concept" }),
    ).toBeInTheDocument();
  });

  it("offers two things to do, one of them the louder", () => {
    renderHero();

    expect(screen.getByRole("link", { name: "More details" })).toHaveAttribute(
      "href",
      "#more-details",
    );
    expect(screen.getByRole("link", { name: "View demo" })).toHaveAttribute(
      "href",
      "#view-demo",
    );
  });

  // The artwork is a screenshot of the product rather than decoration, so it
  // is described rather than hidden.
  it("says what the artwork shows", () => {
    renderHero();

    expect(
      screen.getByRole("img", {
        name: "Players climbing levels on a phone screen",
      }),
    ).toBeInTheDocument();
  });

  // Given, so the page does not jump as the image lands.
  it("holds the artwork's space before it loads", () => {
    renderHero();
    const artwork = screen.getByRole("img");

    expect(artwork).toHaveAttribute("width", "393");
    expect(artwork).toHaveAttribute("height", "397");
  });
});
