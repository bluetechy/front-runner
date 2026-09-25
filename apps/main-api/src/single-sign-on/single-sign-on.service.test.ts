import { describe, expect, it, jest } from "@jest/globals";
import type {
  Account,
  IdentityAdminService,
  LinkedLogin,
  LoginProvider,
  Principal,
} from "../authentication/index.js";
import type { SecurityEventsService } from "../security-events/index.js";
import { SingleSignOnService } from "./single-sign-on.service.js";

/*
 * The other ways into an account, drawn and taken away.
 *
 * Three things here are worth more than the rest.
 *
 * **The last way in.** An account whose only way in is Google, with no
 * password behind it, is locked out by the Disconnect button. The card does
 * not draw one, and this refuses it as well, because the card is a moment old
 * and the password could be the thing that changed.
 *
 * **What a returning browser is believed about.** `confirm` is handed an alias
 * off a URL. It is not written down: it names a provider to go and ask, the
 * provider is asked, and the security log is only written if the answer is
 * yes.
 *
 * **Every subject id comes from the session.** Nothing in here takes an
 * account off a request.
 */

const principal: Principal = {
  userId: "b0000000-0000-4000-8000-000000000003",
  loginName: "marcus",
  sessionId: "session-now",
  device: "Mac OS",
};

const account: Account = {
  subjectId: "subject-marcus",
  username: "marcus",
  email: "marcus@example.test",
  firstName: "Marcus",
};

const realm: LoginProvider[] = [
  { alias: "google", name: "Google", enabled: true },
  { alias: "facebook", name: "Facebook", enabled: true },
  { alias: "apple", name: "Apple ID", enabled: false },
];

function setup(
  linked: LinkedLogin[] = [],
  hasPassword = true,
  providers: LoginProvider[] = realm,
) {
  const identity = {
    findAccount: jest.fn<(name: string) => Promise<Account | null>>(),
    loginProviders: jest.fn<() => Promise<LoginProvider[]>>(),
    linkedLogins: jest.fn<(subject: string) => Promise<LinkedLogin[]>>(),
    unlinkLogin: jest.fn<(subject: string, alias: string) => Promise<void>>(),
    hasPassword: jest.fn<(subject: string) => Promise<boolean>>(),
  };
  identity.findAccount.mockResolvedValue(account);
  identity.loginProviders.mockResolvedValue(providers);
  identity.linkedLogins.mockResolvedValue(linked);
  identity.unlinkLogin.mockResolvedValue(undefined);
  identity.hasPassword.mockResolvedValue(hasPassword);

  const events = {
    record:
      jest.fn<
        (
          loginName: string,
          eventType: string,
          description: string,
          device?: string,
        ) => Promise<void>
      >(),
  };
  events.record.mockResolvedValue(undefined);

  return {
    identity,
    events,
    service: new SingleSignOnService(
      identity as unknown as IdentityAdminService,
      events as unknown as SecurityEventsService,
    ),
  };
}

describe("what the card is drawn from", () => {
  /* Passed through in the order the realm holds them, neither sorted nor
   * filtered. The card is what decides the order it reads in. */
  it("is every provider the realm has, in the realm's order", async () => {
    const { service } = setup();

    const methods = await service.methods(principal);

    expect(methods.map((method) => method.Alias)).toEqual([
      "google",
      "facebook",
      "apple",
    ]);
  });

  // "We do not offer Google" and "Google is off this week" are the same row to
  // somebody reading the page and a different thing to whoever has to fix it.
  it("keeps a provider the realm has switched off, and says it is off", async () => {
    const { service } = setup();

    const [, , apple] = await service.methods(principal);

    expect(apple).toMatchObject({ Alias: "apple", Available: false });
  });

  it("marks the ones this account has connected, and says what it is called there", async () => {
    const { service } = setup([
      { alias: "google", userName: "marcus@gmail.test" },
    ]);

    const [google, facebook] = await service.methods(principal);

    expect(google).toMatchObject({
      Connected: true,
      ConnectedAs: "marcus@gmail.test",
    });
    expect(facebook).toMatchObject({ Connected: false, ConnectedAs: null });
  });

  it("offers no disconnection on a provider that is not connected", async () => {
    const { service } = setup([{ alias: "google", userName: null }]);

    const methods = await service.methods(principal);

    expect(methods[1]?.CanDisconnect).toBe(false);
  });

  // The guard, drawn rather than enforced: this is what stops the button
  // existing, not what stops the disconnection.
  it("offers no disconnection on the only way into an account with no password", async () => {
    const { service } = setup([{ alias: "google", userName: null }], false);

    const methods = await service.methods(principal);

    expect(methods[0]?.CanDisconnect).toBe(false);
  });

  it("offers it once a second provider is connected, password or not", async () => {
    const { service } = setup(
      [
        { alias: "google", userName: null },
        { alias: "facebook", userName: null },
      ],
      false,
    );

    const methods = await service.methods(principal);

    expect(methods[0]?.CanDisconnect).toBe(true);
    expect(methods[1]?.CanDisconnect).toBe(true);
  });

  // Nothing connected means nothing to disconnect, so the answer could not
  // change a single row. One round trip saved on the common case.
  it("does not ask about the password when nothing is connected", async () => {
    const { service, identity } = setup();

    await service.methods(principal);

    expect(identity.hasPassword).not.toHaveBeenCalled();
  });

  it("asks the provider about the account the session names", async () => {
    const { service, identity } = setup();

    await service.methods(principal);

    expect(identity.findAccount).toHaveBeenCalledWith("marcus");
    expect(identity.linkedLogins).toHaveBeenCalledWith("subject-marcus");
  });

  it("refuses when the session names an account that is no longer there", async () => {
    const { service, identity } = setup();
    identity.findAccount.mockResolvedValue(null);

    await expect(service.methods(principal)).rejects.toThrow("Login again");
  });
});

describe("disconnecting one", () => {
  it("takes it away and records it under the provider's own name", async () => {
    const { service, identity, events } = setup([
      { alias: "google", userName: "marcus@gmail.test" },
    ]);

    await service.disconnect(principal, "google");

    expect(identity.unlinkLogin).toHaveBeenCalledWith(
      "subject-marcus",
      "google",
    );
    expect(events.record).toHaveBeenCalledWith(
      "marcus",
      "SignInMethodDisconnected",
      "Google was disconnected from your account.",
      "Mac OS",
    );
  });

  it("answers the card's new state rather than nothing", async () => {
    const { service, identity } = setup([
      { alias: "google", userName: "marcus@gmail.test" },
    ]);
    identity.linkedLogins
      .mockResolvedValueOnce([
        { alias: "google", userName: "marcus@gmail.test" },
      ])
      .mockResolvedValueOnce([]);

    const methods = await service.disconnect(principal, "google");

    expect(methods.map((method) => method.Connected)).toEqual([
      false,
      false,
      false,
    ]);
  });

  // The whole point of the guard. The sentence says what to do about it,
  // because "no" with no way forward is a dead end on somebody's own account.
  it("refuses the last way into an account with no password", async () => {
    const { service, identity } = setup(
      [{ alias: "google", userName: null }],
      false,
    );

    await expect(service.disconnect(principal, "google")).rejects.toThrow(
      "the only way into this account",
    );
    expect(identity.unlinkLogin).not.toHaveBeenCalled();
  });

  it("allows it when a password is still behind it", async () => {
    const { service, identity } = setup(
      [{ alias: "google", userName: null }],
      true,
    );

    await service.disconnect(principal, "google");

    expect(identity.unlinkLogin).toHaveBeenCalled();
  });

  // A page that has been open a while. Saying so beats answering "done" about
  // a disconnection that never happened.
  it("refuses a provider that is not connected", async () => {
    const { service, identity } = setup([]);

    await expect(service.disconnect(principal, "google")).rejects.toThrow(
      "Google is not connected to this account.",
    );
    expect(identity.unlinkLogin).not.toHaveBeenCalled();
  });

  it("names an unknown provider by its alias rather than saying nothing", async () => {
    const { service } = setup([], true, []);

    await expect(service.disconnect(principal, "okta")).rejects.toThrow(
      "okta is not connected",
    );
  });
});

describe("coming back from the provider", () => {
  it("records the connection when the provider confirms it", async () => {
    const { service, events } = setup([
      { alias: "google", userName: "marcus@gmail.test" },
    ]);

    const methods = await service.confirm(principal, "google");

    expect(events.record).toHaveBeenCalledWith(
      "marcus",
      "SignInMethodConnected",
      "Google was connected to your account.",
      "Mac OS",
    );
    expect(methods[0]?.Connected).toBe(true);
  });

  // The assertion this whole operation exists for. Anybody can type a URL
  // saying they connected Google; what is written down is what Google's own
  // realm says.
  it("records nothing when the provider says it is not connected", async () => {
    const { service, events } = setup([]);

    const methods = await service.confirm(principal, "google");

    expect(events.record).not.toHaveBeenCalled();
    expect(methods[0]?.Connected).toBe(false);
  });

  it("records nothing for a provider the realm has never heard of", async () => {
    const { service, events } = setup([{ alias: "google", userName: null }]);

    await service.confirm(principal, "okta");

    expect(events.record).not.toHaveBeenCalled();
  });
});
