import { ThemeProvider } from "@mui/material/styles";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import "../language/i18n";

/*
 * The profile page: who this is down the left, the same profile as a form
 * down the right, and one place either of them can say something back.
 *
 * That last part is what this file is about. The page owns the notice and
 * throws it as a toast into the bottom right corner; the two halves only
 * hand it a sentence and a tone. Both halves are stubbed here so this is
 * about the page rather than about either of them.
 */

let summaryNotice: (message: string, tone?: string) => void;
let formNotice: (message: string, tone?: string) => void;

vi.mock("./profile-summary", () => ({
  ProfileSummary: ({
    onNotice,
  }: {
    onNotice: (message: string, tone?: string) => void;
  }) => {
    summaryNotice = onNotice;
    return <p>The summary</p>;
  },
}));

vi.mock("./profile-form", () => ({
  ProfileForm: ({
    onNotice,
  }: {
    onNotice: (message: string, tone?: string) => void;
  }) => {
    formNotice = onNotice;
    return <p>The form</p>;
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const { Profile } = await import("./profile");

const renderPage = () =>
  render(
    <ThemeProvider theme={theme}>
      <Profile />
    </ThemeProvider>,
  );

describe("the page", () => {
  it("is titled, and says where it sits", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Profile", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("shows who this is beside the form that edits them", () => {
    renderPage();

    expect(screen.getByText("The summary")).toBeInTheDocument();
    expect(screen.getByText("The form")).toBeInTheDocument();
  });
});

describe("saying something back", () => {
  it("says nothing until one of the halves has something to say", () => {
    renderPage();

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("throws what the form says, in the tone the form chose", () => {
    renderPage();

    act(() => formNotice("Profile updated.", "success"));

    expect(screen.getByRole("alert")).toHaveTextContent("Profile updated.");
  });

  // One notice at a time: showing the next one is what replacing it means.
  it("replaces the last notice rather than stacking another beside it", () => {
    renderPage();

    act(() => formNotice("Profile updated.", "success"));
    act(() => formNotice("Some fields need another look.", "error"));

    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Some fields need another look.",
    );
  });

  // The card down the left has one thing to say -- that there is nowhere to
  // keep a picture yet -- and it is neither a success nor a failure.
  it("takes a notice from the card down the left as well", () => {
    renderPage();

    act(() => summaryNotice("There is nowhere to keep a picture yet."));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "There is nowhere to keep a picture yet.",
    );
  });

  // It fades rather than vanishing, so this waits for the transition the
  // Snackbar runs on its way out.
  it("goes away when it is dismissed", async () => {
    renderPage();
    act(() => formNotice("Profile updated.", "success"));

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});
