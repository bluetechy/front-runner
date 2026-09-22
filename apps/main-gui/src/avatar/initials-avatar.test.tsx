import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theme } from "../design-system";
import { InitialsAvatar, initialsOf } from "./initials-avatar";

/*
 * There is nowhere to keep a photograph in this product yet, so a person is
 * drawn as their initials. Four places do it -- the rail, the top bar, the
 * profile page and a notification -- and they all draw the same letters,
 * which is the whole reason this stopped being a private copy in two of them.
 */

const renderIn = (element: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{element}</ThemeProvider>);

describe("the letters standing in for a face", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsOf("Thomas John")).toBe("TJ");
  });

  // A login name has no space in it, and one letter is the right answer: this
  // is an avatar, not a label.
  it("takes one letter from a single word", () => {
    expect(initialsOf("member")).toBe("M");
  });

  it("stops at two, however many names somebody has", () => {
    expect(initialsOf("Ana María de la Cruz")).toBe("AM");
  });

  it("ignores the spacing it was given", () => {
    expect(initialsOf("  thomas   john  ")).toBe("TJ");
  });

  // The rail draws an em dash while the session is loading, and "—" has no
  // letters in it. Better an empty circle than a circle with punctuation in it.
  it("answers nothing for a name that has no letters", () => {
    expect(initialsOf("")).toBe("");
    expect(initialsOf("   ")).toBe("");
  });
});

describe("the circle around them", () => {
  it("draws somebody's initials", () => {
    renderIn(<InitialsAvatar name="Thomas John" size={42} fontSize="1rem" />);

    expect(screen.getByText("TJ")).toBeInTheDocument();
  });

  // The three callers draw this at 36, 42 and 124 pixels, and the proportion
  // that reads well is not the same at both ends of that -- so the size of
  // the letters is passed rather than worked out from the size of the circle.
  it("is drawn at the size it is given, letters and all", () => {
    const { container } = renderIn(
      <InitialsAvatar name="Thomas John" size={124} fontSize="2.4rem" />,
    );
    const circle = container.firstElementChild as HTMLElement;

    expect(circle).toHaveStyle({ width: "124px", height: "124px" });
    expect(circle).toHaveStyle({ fontSize: "2.4rem" });
  });

  it("takes any further styling the caller passes", () => {
    const { container } = renderIn(
      <InitialsAvatar
        name="Thomas John"
        size={68}
        fontSize="1.4rem"
        sx={{ border: "3px solid rgb(1, 2, 3)" }}
      />,
    );

    expect(container.firstElementChild).toHaveStyle({
      border: "3px solid rgb(1, 2, 3)",
    });
  });
});
