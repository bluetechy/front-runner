import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import "../language/i18n";

/*
 * The bar along the top of the application.
 *
 * The search field is the mock-up's and does nothing yet, which is worth
 * asserting rather than leaving to be discovered. What is real is who is
 * signed in and the menu that signs them out; the flag and the bell are
 * verticals of their own and are stubbed here so this is about the bar.
 */

const logout = vi.fn();
const session = vi.fn();

vi.mock("../authentication", () => ({ useSession: () => session() }));
vi.mock("../language", () => ({ LanguageMenu: () => <i>The flag</i> }));
vi.mock("../notifications", () => ({
  NotificationMenu: () => <i>The bell</i>,
}));

const { AppTopBar } = await import("./app-top-bar");

const signedIn = {
  identity: { name: "Thomas John", loginName: "member", email: "t@j.test" },
  logout,
};

const renderBar = (state: unknown = signedIn) => {
  session.mockReturnValue(state);
  const onOpenNav = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <AppTopBar onOpenNav={onOpenNav} />
    </ThemeProvider>,
  );
  return { onOpenNav };
};

beforeEach(() => {
  logout.mockReset();
});

describe("what the bar holds", () => {
  it("holds the flag and the bell", () => {
    renderBar();

    expect(screen.getByText("The flag")).toBeInTheDocument();
    expect(screen.getByText("The bell")).toBeInTheDocument();
  });

  // The mock-up's field. It does nothing yet -- there is nothing behind it
  // to search.
  //
  // It is found here by its placeholder rather than by its label: the
  // `aria-label` on the TextField lands on the wrapper rather than on the
  // input, so the input has no accessible name of its own. Worth fixing when
  // the field does something; this asserts what it is today rather than what
  // it should be.
  it("holds a search field that does not search anything yet", () => {
    renderBar();
    const search = screen.getByPlaceholderText("Search here");

    fireEvent.change(search, { target: { value: "badges" } });

    expect(search).toHaveValue("badges");
  });

  it("opens the rail on a narrow window", () => {
    const { onOpenNav } = renderBar();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    expect(onOpenNav).toHaveBeenCalledTimes(1);
  });
});

describe("whoever is signed in", () => {
  it("says their name, their login, and draws their face", () => {
    renderBar();

    expect(screen.getByText("Thomas John")).toBeInTheDocument();
    expect(screen.getByText("member")).toBeInTheDocument();
    expect(screen.getByText("TJ")).toBeInTheDocument();
  });

  // The moment before the session has settled. An em dash rather than a name
  // invented for them, and the avatar has no letters to draw.
  it("says nothing much while the session is still settling", () => {
    renderBar({ identity: null, logout });

    /* An em dash in both the name and the face, rather than a name invented
     * for somebody the session has not named yet. */
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Account" })).toBeVisible();
  });

  it("signs them out from the menu behind their name", () => {
    renderBar();

    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Logout" }));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("opens nothing until the account is pressed", () => {
    renderBar();

    expect(screen.queryByRole("menu")).toBeNull();
  });
});
