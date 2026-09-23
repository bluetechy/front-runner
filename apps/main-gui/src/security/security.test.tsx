import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import type { UserEmail } from "./email-api";

/*
 * The security page: the addresses, the switch under them, and what the page
 * says back afterwards.
 *
 * The API hook is stubbed -- it has a test of its own -- so what is under test
 * here is the page's own work: which row is held while a save is in flight,
 * and what it says when one finishes or fails.
 *
 * The sentences matter more here than on most pages. Choosing a primary
 * address changes a credential at the identity provider, and asking for
 * another link stops the previous one working; somebody who is not told either
 * of those will be surprised by them later.
 */

const emails = vi.fn();
const add = vi.fn();
const remove = vi.fn();
const setPrimary = vi.fn();
const resend = vi.fn();
const setPrivacy = vi.fn();

vi.mock("./email-api", () => ({ useEmails: () => emails() }));

/* The user name is read off the token rather than fetched, so the page asks
 * the session for it directly. */
vi.mock("../authentication", () => ({
  useSession: () => ({
    identity: { name: "Marcus Member", loginName: "member", email: "m@e.test" },
  }),
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

const { Security } = await import("./security");

const address = (overrides: Partial<UserEmail> = {}): UserEmail => ({
  UserEmailUUID: "e0000000-0000-4000-8000-000000000001",
  Email: "marcus@example.test",
  IsPrimary: true,
  IsVerified: true,
  VerifiedAt: "2026-01-01T00:00:00.000Z",
  CreatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const work = address({
  UserEmailUUID: "e0000000-0000-4000-8000-000000000002",
  Email: "marcus.work@example.test",
  IsPrimary: false,
});

const unverified = address({
  UserEmailUUID: "e0000000-0000-4000-8000-000000000003",
  Email: "marcus.new@example.test",
  IsPrimary: false,
  IsVerified: false,
  VerifiedAt: null,
});

const answering = (overrides: Record<string, unknown> = {}) =>
  emails.mockReturnValue({
    addresses: [address(), work, unverified],
    isPrivate: false,
    loading: false,
    error: null,
    add,
    remove,
    setPrimary,
    resend,
    setPrivacy,
    ...overrides,
  });

const renderPage = () =>
  render(
    <ThemeProvider theme={theme}>
      <Security />
    </ThemeProvider>,
  );

beforeEach(() => {
  emails.mockReset();
  for (const call of [add, remove, setPrimary, resend, setPrivacy])
    call.mockReset().mockResolvedValue(undefined);
  answering();
});

describe("the page itself", () => {
  it("is titled for the page the rail links to", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Security & Access" }),
    ).toBeInTheDocument();
  });

  // Three cards, headed the same way, and the order is the argument: what
  // the account is called and cannot change, then the addresses that can, then
  // what the other members are shown of them.
  it("holds the user name, the addresses and the privacy switch, in that order", () => {
    renderPage();

    /* The table's own column headings are drawn with the same label, so the
     * three card names are picked out of the page rather than counted. */
    const cards = ["User Name", "Email Addresses", "Email Privacy"];

    expect(
      screen
        .getAllByRole("heading")
        .map((heading) => heading.textContent ?? "")
        .filter((name) => cards.includes(name)),
    ).toEqual(cards);

    expect(
      screen.getByRole("switch", { name: "Keep my email addresses private" }),
    ).toBeInTheDocument();
  });

  // Off the token, not out of the API: there is nothing to fetch for a value
  // this page only reads.
  it("shows the name the session says the account signs in with", () => {
    renderPage();

    expect(screen.getByLabelText("User name")).toHaveValue("member");
  });

  // The rule that governs the whole page, said once at the top rather than
  // only discovered by clicking a disabled radio.
  it("says up front that an address has to be verified to become the login", () => {
    renderPage();

    expect(screen.getByText(/has to be verified/i)).toBeInTheDocument();
  });

  // A list that could not be read is a different thing from an empty one.
  it("says so when the list could not be read at all", () => {
    answering({ error: "Your session has expired.", addresses: [] });
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your session has expired.",
    );
  });
});

describe("choosing the address somebody signs in with", () => {
  it("asks the API for the address that was chosen", async () => {
    renderPage();

    fireEvent.click(
      screen.getByRole("radio", {
        name: "Login with marcus.work@example.test",
      }),
    );

    await waitFor(() =>
      expect(setPrimary).toHaveBeenCalledWith(work.UserEmailUUID),
    );
  });

  // Two things happened: this application's copy changed and so did the
  // credential at Keycloak. Somebody not told the second will try their old
  // address next time.
  it("says which address they will login with from now on", async () => {
    renderPage();

    fireEvent.click(
      screen.getByRole("radio", {
        name: "Login with marcus.work@example.test",
      }),
    );

    expect(
      await screen.findByText(
        /login with marcus\.work@example\.test from now on/i,
      ),
    ).toBeInTheDocument();
  });

  it("passes the API's own refusal on rather than a sentence of its own", async () => {
    setPrimary.mockRejectedValue(
      new Error("An address has to be verified before you can login with it."),
    );
    renderPage();

    fireEvent.click(
      screen.getByRole("radio", {
        name: "Login with marcus.work@example.test",
      }),
    );

    expect(
      await screen.findByText(/has to be verified before you can login/i),
    ).toBeInTheDocument();
  });
});

describe("adding an address", () => {
  it("asks the API and then says where to look for the link", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Add an email address"), {
      target: { value: "marcus.third@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(add).toHaveBeenCalledWith("marcus.third@example.test"),
    );
    expect(
      await screen.findByText(/open the link we sent it/i),
    ).toBeInTheDocument();
  });

  it("says what went wrong when the API refuses", async () => {
    add.mockRejectedValue(new Error("That address is already on an account."));
    renderPage();

    fireEvent.change(screen.getByLabelText("Add an email address"), {
      target: { value: "marcus.work@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText(/already on an account/i),
    ).toBeInTheDocument();
  });
});

describe("asking for another link", () => {
  // Somebody looking at two messages in an inbox needs to know which one to
  // open, and the old one has stopped working by the time this returns.
  it("says that any earlier link has stopped working", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Send link" }));

    await waitFor(() =>
      expect(resend).toHaveBeenCalledWith(unverified.UserEmailUUID),
    );
    expect(
      await screen.findByText(/earlier link has stopped working/i),
    ).toBeInTheDocument();
  });
});

describe("removing an address", () => {
  it("asks the API and says which one went", async () => {
    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove marcus.work@example.test" }),
    );

    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith(work.UserEmailUUID),
    );
    expect(
      await screen.findByText("marcus.work@example.test was removed."),
    ).toBeInTheDocument();
  });
});

describe("the privacy switch", () => {
  it("saves what it was moved to", async () => {
    renderPage();

    fireEvent.click(
      screen.getByRole("switch", { name: "Keep my email addresses private" }),
    );

    await waitFor(() => expect(setPrivacy).toHaveBeenCalledWith(true));
  });

  // The sentence follows what was saved rather than what was clicked, so a
  // save the API answered differently to does not get reported as the click.
  it("says which way it ended up, from the answer rather than the click", async () => {
    setPrivacy.mockResolvedValue(true);
    renderPage();

    fireEvent.click(
      screen.getByRole("switch", { name: "Keep my email addresses private" }),
    );

    expect(
      await screen.findByText(/hidden from the members list/i),
    ).toBeInTheDocument();
  });

  it("says so when the setting was not saved", async () => {
    setPrivacy.mockRejectedValue(new Error("Action cannot be performed."));
    renderPage();

    fireEvent.click(
      screen.getByRole("switch", { name: "Keep my email addresses private" }),
    );

    expect(
      await screen.findByText("Action cannot be performed."),
    ).toBeInTheDocument();
  });
});
