import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import type { SecurityEvent } from "./activity-api";
import type { UserEmail } from "./email-api";

/*
 * The security page: the addresses, the recent activity under them, the switch
 * under that, and what the page says back afterwards.
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

const activity = vi.fn();
const review = vi.fn();

vi.mock("./email-api", () => ({ useEmails: () => emails() }));
vi.mock("./activity-api", () => ({ useSecurityActivity: () => activity() }));

const password = vi.fn();
const changePassword = vi.fn();

vi.mock("./password-api", () => ({ usePassword: () => password() }));

/* The user name is read off the token rather than fetched, so the page asks
 * the session for it directly.
 *
 * The session is the only thing stubbed here. The password rules come out of
 * the same module and are left real: they are the rules the change-password
 * card draws its checklist from, and a stub of them would make this file agree
 * with itself about what a password is rather than with the product. */
vi.mock("../authentication", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../authentication")>()),
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

const login: SecurityEvent = {
  SecurityEventUUID: "2d000000-0000-4000-8000-000000000001",
  EventType: "LoginSucceeded",
  Description: "New login on Mac OS.",
  Device: "Mac OS",
  Location: "Utah, USA",
  OccurredAt: "2026-09-20T21:42:00.000Z",
  ReviewedAt: null,
  Recognized: null,
};

const logging = (overrides: Record<string, unknown> = {}) =>
  activity.mockReturnValue({
    events: [login],
    loading: false,
    error: null,
    review,
    ...overrides,
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

const holding = (overrides: Record<string, unknown> = {}) =>
  password.mockReturnValue({
    changedAt: "2026-09-20T21:42:00.000Z",
    loading: false,
    change: changePassword,
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
  activity.mockReset();
  password.mockReset();
  for (const call of [add, remove, setPrimary, resend, setPrivacy, review])
    call.mockReset().mockResolvedValue(undefined);
  changePassword
    .mockReset()
    .mockResolvedValue({ ChangedAt: null, OtherSessionsEnded: 0 });
  answering();
  logging();
  holding();
});

describe("the page itself", () => {
  it("is titled for the page the rail links to", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Security & Access" }),
    ).toBeInTheDocument();
  });

  // Five cards, headed the same way, and the order is the argument: what the
  // account is called and cannot change, then the addresses that can, then the
  // password both of those rest on, then what has lately been done to any of
  // them, then what the other members are shown.
  it("holds the user name, the addresses, the password, the activity and the switch, in that order", () => {
    renderPage();

    /* The tables' own column headings are drawn with the same label, so the
     * card names are picked out of the page rather than counted. */
    const cards = [
      "User Name",
      "Email Addresses",
      "Change Password",
      "Recent Activity",
      "Email Privacy",
    ];

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

describe("the recent activity", () => {
  it("lists what has happened to the account", () => {
    renderPage();

    expect(screen.getByText("New login on Mac OS.")).toBeInTheDocument();
  });

  /* A log that could not be read is a different thing from an empty one, and
   * it is drawn above its own table rather than above the addresses. */
  it("says so when the log could not be read at all", () => {
    logging({ events: [], error: "Action cannot be performed." });
    renderPage();

    expect(screen.getByText("Action cannot be performed.")).toBeInTheDocument();
  });

  it("opens the dialog on the event whose row was pressed", () => {
    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: "View New login on Mac OS." }),
    );

    expect(
      screen.getByRole("heading", { name: "New login" }),
    ).toBeInTheDocument();
  });

  it("records that the activity was recognized", async () => {
    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: "View New login on Mac OS." }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Yes, it was me/ }));

    await waitFor(() =>
      expect(review).toHaveBeenCalledWith(login.SecurityEventUUID, true),
    );
    expect(
      await screen.findByText(/marked that activity as recognized/i),
    ).toBeInTheDocument();
  });

  /* Saying no sends a message, and somebody who is not told to expect it will
   * not know to go and open it. That is why the two answers are two sentences
   * rather than one "saved". */
  it("says a link is on its way when the activity was disowned", async () => {
    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: "View New login on Mac OS." }),
    );
    fireEvent.click(screen.getByRole("button", { name: /No, secure account/ }));

    await waitFor(() =>
      expect(review).toHaveBeenCalledWith(login.SecurityEventUUID, false),
    );
    expect(
      await screen.findByText(/link to choose a new password is on its way/i),
    ).toBeInTheDocument();
  });

  it("passes the API's own refusal on rather than a sentence of its own", async () => {
    review.mockRejectedValue(new Error("Action cannot be performed."));
    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: "View New login on Mac OS." }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Yes, it was me/ }));

    expect(
      await screen.findByText("Action cannot be performed."),
    ).toBeInTheDocument();
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
      new Error(
        "An email address has to be verified before you can login with it.",
      ),
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
    add.mockRejectedValue(
      new Error("That email address is already on an account."),
    );
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

/*
 * The change-password card, from the page's side: what it sends, and what the
 * page says back.
 *
 * The three sentences here are the whole of why this is tested at the page
 * rather than only at the card. Changing a password ends the sessions on
 * somebody's other devices, and there are three different true things to say
 * about that -- some were ended, there were none, and we could not tell. A
 * page that said the second when it meant the third would be telling somebody
 * to stop looking.
 */
describe("the change-password card", () => {
  const fill = (current = "letmein", next = "Trombone-42-Fig") => {
    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: current },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: next },
    });
    fireEvent.change(screen.getByLabelText("New password again"), {
      target: { value: next },
    });
  };

  it("says when the password was last changed", () => {
    renderPage();

    expect(
      screen.getByText(/Last changed on Sep 20, 2026/),
    ).toBeInTheDocument();
  });

  /* Every account's password was set at least when the account was made, so
   * there is no such thing as "never": a provider that would not say gets no
   * line rather than a wrong one. */
  it("says nothing about when, rather than never, where nothing is known", () => {
    holding({ changedAt: null });
    renderPage();

    expect(screen.queryByText(/Last changed/)).toBeNull();
  });

  it("sends both passwords", async () => {
    renderPage();

    fill();
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() =>
      expect(changePassword).toHaveBeenCalledWith("letmein", "Trombone-42-Fig"),
    );
  });

  // Both halves in one sentence: somebody who is not told their other sessions
  // were ended will wonder why a phone in their pocket wants a login.
  it("says the password changed and what happened to the other sessions", async () => {
    changePassword.mockResolvedValue({
      ChangedAt: "2026-09-24T10:00:00.000Z",
      OtherSessionsEnded: 2,
    });
    renderPage();

    fill();
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    expect(
      await screen.findByText(
        "Your password was changed, and 2 sessions on your other devices ended.",
      ),
    ).toBeInTheDocument();
  });

  it("counts one session in the singular", async () => {
    changePassword.mockResolvedValue({
      ChangedAt: null,
      OtherSessionsEnded: 1,
    });
    renderPage();

    fill();
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    expect(
      await screen.findByText(
        "Your password was changed, and 1 session on your other devices ended.",
      ),
    ).toBeInTheDocument();
  });

  it("says there were none when there were none", async () => {
    renderPage();

    fill();
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    expect(
      await screen.findByText(
        "Your password was changed. There were no other sessions open.",
      ),
    ).toBeInTheDocument();
  });

  /* Null is not zero. The password changed and nothing here knows what became
   * of the sessions, which is the one answer that must not be drawn as "there
   * were none". */
  it("does not report sessions it could not account for as none", async () => {
    changePassword.mockResolvedValue({
      ChangedAt: null,
      OtherSessionsEnded: null,
    });
    renderPage();

    fill();
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    expect(
      await screen.findByText(/Check Recent Activity below/),
    ).toBeInTheDocument();
  });

  // The API's own sentence, which is the one worth showing: "That is not the
  // password you use now" is written to be read.
  it("passes the API's own refusal on rather than a sentence of its own", async () => {
    changePassword.mockRejectedValue(
      new Error("That is not the password you use now."),
    );
    renderPage();

    fill();
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    expect(
      await screen.findByText("That is not the password you use now."),
    ).toBeInTheDocument();
  });

  it("empties the boxes once the password has changed", async () => {
    renderPage();

    fill();
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Current password")).toHaveValue(""),
    );
    expect(screen.getByLabelText("New password")).toHaveValue("");
  });

  /* A form cleared by a refusal is one somebody has to type again to find out
   * what was wrong with it. */
  it("leaves what was typed alone when the API refuses", async () => {
    changePassword.mockRejectedValue(new Error("That is not the password."));
    renderPage();

    fill();
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    await screen.findByText("That is not the password.");
    expect(screen.getByLabelText("New password")).toHaveValue(
      "Trombone-42-Fig",
    );
  });

  it("sends nothing at all when the two new passwords differ", async () => {
    renderPage();

    fill();
    fireEvent.change(screen.getByLabelText("New password again"), {
      target: { value: "Trombone-42-Fog" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    expect(
      await screen.findByText("The two passwords do not match"),
    ).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("sends nothing when the new password breaks the rules", async () => {
    renderPage();

    fill("letmein", "short");
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    expect(
      await screen.findByText("A password needs at least 12 characters"),
    ).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });
});
