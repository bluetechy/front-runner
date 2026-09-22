import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import "./i18n";
import { languages } from "./languages";

/*
 * The flag in the top bar, and the languages behind it.
 *
 * `language-preference.test.tsx` covers what choosing one does -- the
 * interface changes and the choice is remembered. This is about the control
 * itself: what it wears, what it offers, and what it says it is for.
 *
 * The preference is stubbed so that those are the only things under test; a
 * menu that reached real storage would be testing the provider again.
 */

const choose = vi.fn();
const language = { tag: "en-US", label: "US English", flag: "US" };

vi.mock("./language-preference", () => ({
  useLanguage: () => ({ language, choose }),
}));

const { LanguageMenu } = await import("./language-menu");

const renderMenu = () =>
  render(
    <ThemeProvider theme={theme}>
      <LanguageMenu />
    </ThemeProvider>,
  );

beforeEach(() => {
  choose.mockClear();
});

describe("the button", () => {
  // A globe says "there are languages". The flag says which one you are in,
  // which is the question somebody looking at the bar is actually asking.
  it("wears the flag of the language in force", () => {
    const { container } = renderMenu();

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/flags/us.svg",
    );
  });

  it("says which language that is, for anybody not looking at the flag", () => {
    renderMenu();

    expect(screen.getByRole("button")).toHaveAccessibleName(
      "Language: US English",
    );
  });

  it("says it opens a menu", () => {
    renderMenu();

    expect(screen.getByRole("button")).toHaveAttribute("aria-haspopup", "menu");
  });
});

describe("the menu behind it", () => {
  it("opens nothing until it is pressed", () => {
    renderMenu();

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("offers every language, each with its own flag", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button"));

    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(languages.length);
    for (const item of items)
      expect(item.querySelector("img")?.getAttribute("src")).toMatch(
        /^\/flags\/[a-z-]+\.svg$/,
      );
  });

  // A language names itself: "Español (México)" is what it is called in every
  // interface, including an English one, so these labels never go through t().
  it("writes each language in itself", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button"));

    for (const offered of languages)
      expect(
        screen.getByRole("menuitem", { name: offered.label }),
      ).toBeInTheDocument();
  });

  it("marks the one in force", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("menuitem", { name: "US English" })).toHaveClass(
      "Mui-selected",
    );
    expect(
      screen.getByRole("menuitem", { name: "Español (México)" }),
    ).not.toHaveClass("Mui-selected");
  });

  it("chooses a language and closes itself", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button"));

    fireEvent.click(screen.getByRole("menuitem", { name: "Español (México)" }));

    expect(choose).toHaveBeenCalledWith("es-MX");
  });
});
