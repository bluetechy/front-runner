import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTranslation } from "react-i18next";
import { theme } from "../design-system";
import i18n from "./i18n";
import { LanguageMenu } from "./language-menu";
import { LanguageProvider } from "./language-preference";

const STORAGE_KEY = "front-runner.language";

/*
 * The test's own storage, rather than the environment's.
 *
 * jsdom supplies a real one, but Node 25 installs a `localStorage` global of
 * its own that shadows it and -- without `--localstorage-file` -- carries no
 * methods at all, so the same test passes on the pinned Node 24 and reads
 * empty on a newer one. A fake is also a clean slate per test, which the
 * real one would not be.
 */
function useFakeStorage() {
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
    clear: () => entries.clear(),
  });
}

/* Something with a string in it, so a change of language is visible rather
 * than only stored. "Logout" is the shortest one the chrome actually uses. */
function Chrome() {
  const { t } = useTranslation();
  return <p>{t("Logout")}</p>;
}

/* The menu reads `palette.brand`, which is this app's augmentation rather
 * than Material's, so it needs the real theme and not a default one. */
function Bar() {
  return (
    <ThemeProvider theme={theme}>
      <LanguageProvider>
        <LanguageMenu />
        <Chrome />
      </LanguageProvider>
    </ThemeProvider>
  );
}

describe("choosing the language the interface is in", () => {
  beforeEach(async () => {
    useFakeStorage();
    await i18n.changeLanguage("en-US");
  });

  it("starts in US English, with its flag on the button", () => {
    render(<Bar />);

    expect(screen.getByText("Logout")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAccessibleName(
      "Language: US English",
    );
  });

  it("translates the interface and remembers the choice", () => {
    render(<Bar />);

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("menuitem", { name: /México/ }));

    expect(screen.getByText("Cerrar sesión")).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("es-MX");
  });

  /* The whole point of writing it down: the next visit is a fresh provider
   * reading storage, not the one that made the choice. */
  it("opens in the language the last visit chose", () => {
    localStorage.setItem(STORAGE_KEY, "es-MX");

    render(<Bar />);

    expect(screen.getByText("Cerrar sesión")).toBeInTheDocument();
  });

  /* A language that was offered once and is not any more, left behind in a
   * browser somebody has not opened in a year. */
  it("ignores a remembered language it no longer offers", () => {
    localStorage.setItem(STORAGE_KEY, "fr-FR");

    render(<Bar />);

    expect(screen.getByText("Logout")).toBeInTheDocument();
  });
});
