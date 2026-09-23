import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import { Privacy } from "./privacy";
import { sections } from "./sections";

/*
 * The page the notice links to.
 *
 * It is a layout over `sections.ts` and almost nothing else, so what is
 * asserted is that every section actually reaches the page with an anchor on
 * it, and the one thing on it that is not words: the button that reopens the
 * cookie dialog. "You may withdraw your consent" printed beside no way of
 * doing it is a sentence rather than a right.
 */

const edit = vi.fn();

vi.mock("../cookie-consent", () => ({
  useCookieConsent: () => ({ edit }),
}));

const renderPage = () =>
  render(
    <ThemeProvider theme={theme}>
      <Privacy />
    </ThemeProvider>,
  );

describe("the policy on the page", () => {
  it("is headed as what it is", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy Policy" }),
    ).toBeInTheDocument();
  });

  it("draws every section, with the anchor it claims", () => {
    const { container } = renderPage();

    for (const section of sections) {
      expect(
        screen.getByRole("heading", { level: 2, name: section.heading }),
      ).toBeInTheDocument();
      expect(container.querySelector(`#${section.id}`)).not.toBeNull();
    }
  });

  it("writes out the lists a section carries", () => {
    renderPage();

    expect(
      screen.getByText(/Google Fonts, which serves the two typefaces/),
    ).toBeInTheDocument();
  });

  it("says when it was last written", () => {
    renderPage();

    expect(screen.getByText(/^Last updated /)).toBeInTheDocument();
  });
});

describe("changing your mind from here", () => {
  // The dialog itself is mounted once, above every page, so this asks for it
  // rather than drawing a second copy of it.
  it("opens the cookie choices rather than only describing them", () => {
    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Change your cookie choices" }),
    );

    expect(edit).toHaveBeenCalled();
  });
});
