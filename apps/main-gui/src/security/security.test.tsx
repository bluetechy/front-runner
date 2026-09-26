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

const signInMethods = vi.fn();
const disconnect = vi.fn();
const confirmConnection = vi.fn();

vi.mock("./sso-api", () => ({ useSignInMethods: () => signInMethods() }));

const passkeys = vi.fn();
const removePasskey = vi.fn();
const confirmPasskey = vi.fn();

vi.mock("./passkey-api", () => ({ usePasskeys: () => passkeys() }));

/* Adding a passkey leaves the page the same way connecting a provider does:
 * the real one hands the browser to the identity provider, whose own page
 * runs a ceremony jsdom has no authenticator for. What is under test here is
 * that it is called at all, and only after the dialog has said what is about
 * to happen. */
const beginPasskeyRegistration = vi.fn();

/* Connecting a provider leaves the page: the real one hands the browser to the
 * identity provider, which jsdom has nowhere to go with. What is under test
 * here is that it is called for the right provider and only after the dialog
 * has said what is about to happen. */
const beginAccountLink = vi.fn();

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
  beginAccountLink: (alias: string) => beginAccountLink(alias),
  beginPasskeyRegistration: () => beginPasskeyRegistration(),
  /* Stubbed true rather than left real: the real one reads the deployment's
   * environment, and a page test that drew no Add passkey button because a
   * variable was unset would be a test about vite rather than about this
   * page. The button's absence has its own test in `passkey-setup.test.ts`. */
  canRegisterPasskey: () => true,
}));

const navigate = vi.fn();

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
  useNavigate: () => navigate,
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

const google = {
  Alias: "google",
  Name: "Google",
  Available: true,
  Connected: false,
  ConnectedAs: null,
  CanDisconnect: false,
};

const apple = {
  Alias: "apple",
  Name: "Apple ID",
  Available: false,
  Connected: false,
  ConnectedAs: null,
  CanDisconnect: false,
};

const offering = (overrides: Record<string, unknown> = {}) =>
  signInMethods.mockReturnValue({
    methods: [google, apple],
    loading: false,
    error: null,
    disconnect,
    confirm: confirmConnection,
    ...overrides,
  });

const laptop = {
  Id: "credential-laptop",
  Label: "MacBook Touch ID",
  CreatedAt: "2026-09-01T10:00:00.000Z",
};

const registered = (overrides: Record<string, unknown> = {}) =>
  passkeys.mockReturnValue({
    passkeys: [laptop],
    loading: false,
    error: null,
    confirm: confirmPasskey,
    remove: removePasskey,
    ...overrides,
  });

const renderPage = (connected?: string, passkey?: string) =>
  render(
    <ThemeProvider theme={theme}>
      <Security connected={connected} passkey={passkey} />
    </ThemeProvider>,
  );

beforeEach(() => {
  emails.mockReset();
  activity.mockReset();
  password.mockReset();
  signInMethods.mockReset();
  passkeys.mockReset();
  navigate.mockReset();
  for (const call of [
    add,
    remove,
    setPrimary,
    resend,
    setPrivacy,
    review,
    disconnect,
    beginAccountLink,
    beginPasskeyRegistration,
    removePasskey,
  ])
    call.mockReset().mockResolvedValue(undefined);
  confirmPasskey.mockReset().mockResolvedValue(true);
  changePassword
    .mockReset()
    .mockResolvedValue({ ChangedAt: null, OtherSessionsEnded: 0 });
  confirmConnection
    .mockReset()
    .mockResolvedValue({ ...google, Connected: true });
  answering();
  logging();
  holding();
  offering();
  registered();
});

describe("the page itself", () => {
  it("is titled for the page the rail links to", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Security & Access" }),
    ).toBeInTheDocument();
  });

  // Seven cards, headed the same way, and the order is the argument: what the
  // account is called and cannot change, then the addresses that can, then who
  // else is shown them, then the password all of that rests on, then the thing
  // that would replace typing it, then the other credentials somebody else
  // holds for this account, then what has lately been done to any of it.
  //
  // Passkeys sit directly under the password and above the providers because
  // of what they are: a passkey is an alternative to a password, and
  // everything below it is a way of asking for something as well as one.
  it("holds the user name, the addresses, the switch, the password, the passkeys, the providers and the activity, in that order", () => {
    renderPage();

    /* The tables' own column headings are drawn with the same label, so the
     * card names are picked out of the page rather than counted. */
    const cards = [
      "User Name",
      "Email Addresses",
      "Email Privacy",
      "Change Password",
      "Passkeys",
      "Single Sign-On (SSO)",
      "Recent Activity Log",
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
      await screen.findByText(/Check Recent Activity Log below/),
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

describe("the single sign-on card", () => {
  it("offers what the realm has, and says what each one is for", () => {
    renderPage();

    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(
      screen.getByText("Login with your Google account."),
    ).toBeInTheDocument();
  });

  // A provider the realm has switched off is still a row: an account that
  // connected it before it was switched off still has it connected.
  it("draws a provider that is switched off, and offers nothing on it", () => {
    renderPage();

    expect(
      screen.getByText("Apple ID is not switched on here yet."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Connect" })).toHaveLength(1);
  });

  // Pressing Connect does not connect anything: it hands the browser to the
  // identity provider and the page goes away. Saying so first is the whole
  // reason the dialog exists.
  it("says what is about to happen before it leaves the page", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    expect(
      screen.getByRole("heading", { name: "Connect Google" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/This page will go to Google/)).toBeInTheDocument();
    expect(beginAccountLink).not.toHaveBeenCalled();
  });

  // The question this card is asked most: connecting a provider is widely read
  // as replacing the password, and it does not. Said as "nothing else you
  // login with", because an account that arrived through a provider may never
  // have had a password.
  it("says everything else keeps working", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    expect(
      screen.getByText(
        "Nothing else you login with changes, and it all keeps working.",
      ),
    ).toBeInTheDocument();
  });

  it("starts the trip for the provider that was asked about", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to Google" }));

    await waitFor(() =>
      expect(beginAccountLink).toHaveBeenCalledWith("google"),
    );
  });

  it("says so rather than leaving a dead button when the trip cannot start", async () => {
    beginAccountLink.mockRejectedValue(
      new Error("Could not reach the identity provider."),
    );
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to Google" }));

    expect(
      await screen.findByText("Could not reach the identity provider."),
    ).toBeInTheDocument();
  });

  it("does not ask twice", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("heading", { name: "Connect Google" }),
    ).not.toBeInTheDocument();
    expect(beginAccountLink).not.toHaveBeenCalled();
  });
});

describe("disconnecting a provider", () => {
  const connected = {
    ...google,
    Connected: true,
    ConnectedAs: "marcus@gmail.test",
    CanDisconnect: true,
  };

  it("says what the account is called at the provider", () => {
    offering({ methods: [connected] });
    renderPage();

    expect(
      screen.getByText("Connected as marcus@gmail.test."),
    ).toBeInTheDocument();
  });

  it("asks before taking it away, and says what keeps working", () => {
    offering({ methods: [connected] });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(
      screen.getByRole("heading", { name: "Disconnect Google" }),
    ).toBeInTheDocument();
    expect(disconnect).not.toHaveBeenCalled();
  });

  it("disconnects it and says both halves of what happened", async () => {
    offering({ methods: [connected] });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    fireEvent.click(screen.getByRole("button", { name: "Disconnect Google" }));

    await waitFor(() => expect(disconnect).toHaveBeenCalledWith("google"));
    expect(
      await screen.findByText(
        "Google was disconnected. Everything else you login with still works.",
      ),
    ).toBeInTheDocument();
  });

  it("reports a refusal rather than saying it worked", async () => {
    offering({ methods: [connected] });
    disconnect.mockRejectedValue(new Error("Action cannot be performed."));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    fireEvent.click(screen.getByRole("button", { name: "Disconnect Google" }));

    expect(
      await screen.findByText("Action cannot be performed."),
    ).toBeInTheDocument();
  });

  // The account whose only way in is this provider. The button is not drawn at
  // all, and the row says why instead of leaving a control that refuses.
  it("offers nothing on the account's only way in, and says why", () => {
    offering({ methods: [{ ...connected, CanDisconnect: false }] });
    renderPage();

    expect(
      screen.getByText(/It is your only way to login/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Disconnect" }),
    ).not.toBeInTheDocument();
  });
});

describe("coming back from a provider", () => {
  it("checks the claim on the URL with the API rather than believing it", async () => {
    renderPage("google");

    await waitFor(() =>
      expect(confirmConnection).toHaveBeenCalledWith("google"),
    );
    expect(
      await screen.findByText(
        "Google is now connected to your account. You can login with it from now on.",
      ),
    ).toBeInTheDocument();
  });

  // A trip somebody abandoned at the provider comes back the same way a
  // finished one does. The only difference is what the provider says when the
  // API asks it.
  it("says nothing changed when the provider did not connect it", async () => {
    confirmConnection.mockResolvedValue({ ...google, Connected: false });
    renderPage("google");

    expect(
      await screen.findByText(
        "That connection was not finished, so nothing has changed. You can try it again from the Single Sign-On card.",
      ),
    ).toBeInTheDocument();
  });

  it("says nothing at all when there is no claim on the URL", () => {
    renderPage();

    expect(confirmConnection).not.toHaveBeenCalled();
  });

  /* Off the address bar before the call is made, so that a refresh cannot ask
   * the question a second time. */
  it("takes the claim off the URL", async () => {
    renderPage("google");

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: "/security-and-access",
        replace: true,
      }),
    );
  });

  it("reports a check that could not be made", async () => {
    confirmConnection.mockRejectedValue(new Error("Your session has expired."));
    renderPage("google");

    expect(
      await screen.findByText("Your session has expired."),
    ).toBeInTheDocument();
  });
});

/*
 * The passkeys card.
 *
 * What is worth asserting here is the page's own work rather than the list's,
 * which has its own test: that adding one asks before the page goes away,
 * that removing one says what still works afterwards, and that a browser
 * coming back from the provider is believed no further than the API will
 * back it up.
 */
describe("adding a passkey", () => {
  /* Pressing it does not leave: the dialog says what is about to happen
   * first, because the page is gone the moment the trip starts. The same
   * arrangement Connect has on the SSO card. */
  it("asks before the page goes anywhere", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Add passkey" }));

    expect(beginPasskeyRegistration).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("starts the trip once the dialog is answered", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Add passkey" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to your device" }),
    );

    await waitFor(() => expect(beginPasskeyRegistration).toHaveBeenCalled());
  });

  it("says so rather than going quiet when the provider cannot be reached", async () => {
    beginPasskeyRegistration.mockRejectedValue(new Error("Nothing answered."));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Add passkey" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to your device" }),
    );

    expect(await screen.findByText("Nothing answered.")).toBeInTheDocument();
  });
});

describe("coming back from the provider's registration page", () => {
  /* The claim on the URL is a hint about what to go and check. The page asks
   * the API, and the API asks the provider. */
  it("asks the API what actually happened", async () => {
    renderPage(undefined, "registered");

    await waitFor(() => expect(confirmPasskey).toHaveBeenCalled());
  });

  /* Taken off the address bar before the question is asked, so a reload
   * cannot ask it twice. */
  it("takes the claim off the URL", async () => {
    renderPage(undefined, "registered");

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: "/security-and-access",
        replace: true,
      }),
    );
  });

  /* Both halves. A passkey is tied to the device that made it, and the phone
   * in somebody's pocket is where they will next try to login. */
  it("says it worked, and that the phone needs its own", async () => {
    renderPage(undefined, "registered");

    expect(
      await screen.findByText(/add one on your phone as well/),
    ).toBeInTheDocument();
  });

  /* The assertion this block exists for: somebody who dismissed their
   * browser's dialog comes back looking exactly like somebody who did not,
   * and must not be congratulated for a passkey that does not exist. */
  it("says nothing changed when the ceremony was not finished", async () => {
    confirmPasskey.mockResolvedValue(false);
    renderPage(undefined, "registered");

    expect(
      await screen.findByText(/That passkey was not added/),
    ).toBeInTheDocument();
  });

  it("asks nothing at all when the browser did not come back from one", () => {
    renderPage();

    expect(confirmPasskey).not.toHaveBeenCalled();
  });
});

describe("removing a passkey", () => {
  it("asks before it takes one off", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(removePasskey).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("names the one it was asked about", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove it" }));

    await waitFor(() =>
      expect(removePasskey).toHaveBeenCalledWith("credential-laptop"),
    );
  });

  /* Two things happened and the sentence says both, the way disconnecting a
   * provider does: somebody who is not told the rest still works will assume
   * they have just locked themselves out. */
  it("says what stopped working and what did not", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove it" }));

    expect(
      await screen.findByText(
        '"MacBook Touch ID" was removed. Your password and anything you have connected still work.',
      ),
    ).toBeInTheDocument();
  });

  it("says so rather than going quiet when it is refused", async () => {
    removePasskey.mockRejectedValue(
      new Error("That passkey is not on this account."),
    );
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove it" }));

    expect(
      await screen.findByText("That passkey is not on this account."),
    ).toBeInTheDocument();
  });
});
