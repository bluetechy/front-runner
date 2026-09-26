import { describe, expect, it, jest } from "@jest/globals";
import { BadRequestException } from "@nestjs/common";
import type {
  Account,
  IdentityAdminService,
  Passkey,
  Principal,
} from "../authentication/index.js";
import type { SecurityEventsService } from "../security-events/index.js";
import { PasskeysService } from "./passkeys.service.js";

/*
 * Passkeys: the credential that replaces a password rather than guarding one.
 *
 * Four things here are worth more than the rest.
 *
 * **What a returning browser is believed about.** `confirm` is handed
 * nothing, because there is nothing it would be right to believe: the trip
 * to the provider's registration page comes back the same whether somebody
 * touched the fingerprint reader or dismissed the dialog. The provider is
 * asked, and the answer is worked out from what it holds.
 *
 * **A ceremony nobody finished is reported as one nobody finished.** That is
 * the assertion the whole `confirm` block is built around: the easy failure
 * is congratulating somebody for a passkey that does not exist, and they will
 * find out the next time they try to login without a password.
 *
 * **Removing the last one is not refused**, on the terms disabling a second
 * factor is not. Nobody is locked out by losing a passkey: the password and
 * every connected provider still work, and the sentence about it belongs in
 * the dialog rather than in a refusal here.
 *
 * **Every subject id comes from the session.** Nothing here takes an account
 * off a request. The one argument in this vertical is a credential handle,
 * and it is checked against the account's own list before it is used.
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

const laptop: Passkey = {
  id: "credential-laptop",
  label: "MacBook Touch ID",
  createdAt: new Date("2026-09-01T10:00:00.000Z"),
};

const phone: Passkey = {
  id: "credential-phone",
  label: "iPhone",
  createdAt: new Date("2026-09-20T10:00:00.000Z"),
};

/* Registered a minute ago, which is what a browser coming back from the
 * provider's registration page has just done. */
const justNow = (over: Partial<Passkey> = {}): Passkey => ({
  id: "credential-new",
  label: "YubiKey",
  createdAt: new Date(Date.now() - 60 * 1000),
  ...over,
});

function setup(held: Passkey[] = []) {
  const identity = {
    findAccount: jest.fn<(name: string) => Promise<Account | null>>(),
    passkeys: jest.fn<(subject: string) => Promise<Passkey[]>>(),
    removePasskey: jest.fn<(subject: string, id: string) => Promise<void>>(),
  };
  identity.findAccount.mockResolvedValue(account);
  identity.passkeys.mockResolvedValue(held);
  identity.removePasskey.mockResolvedValue(undefined);

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
    service: new PasskeysService(
      identity as unknown as IdentityAdminService,
      events as unknown as SecurityEventsService,
    ),
  };
}

describe("what the card is drawn from", () => {
  it("is the account's own passkeys, in the schema's vocabulary", async () => {
    const { service } = setup([laptop]);

    await expect(service.list(principal)).resolves.toEqual([
      {
        Id: "credential-laptop",
        Label: "MacBook Touch ID",
        CreatedAt: new Date("2026-09-01T10:00:00.000Z"),
      },
    ]);
  });

  /* The row somebody came to read is the one they registered last, and the
   * row they came to remove is the one on a laptop they no longer have. */
  it("puts the newest first", async () => {
    const { service } = setup([laptop, phone]);

    const rows = await service.list(principal);

    expect(rows.map((row) => row.Id)).toEqual([
      "credential-phone",
      "credential-laptop",
    ]);
  });

  it("sorts one the provider would not date to the bottom", async () => {
    const { service } = setup([{ ...laptop, createdAt: null }, phone]);

    const rows = await service.list(principal);

    expect(rows.map((row) => row.Id)).toEqual([
      "credential-phone",
      "credential-laptop",
    ]);
  });

  it("draws an account with none as an empty list", async () => {
    const { service } = setup([]);

    await expect(service.list(principal)).resolves.toEqual([]);
  });

  it("asks about the account the session names", async () => {
    const { service, identity } = setup([]);

    await service.list(principal);

    expect(identity.findAccount).toHaveBeenCalledWith("marcus");
    expect(identity.passkeys).toHaveBeenCalledWith("subject-marcus");
  });

  it("says so rather than drawing an empty card when the account is gone", async () => {
    const { service, identity } = setup([]);
    identity.findAccount.mockResolvedValue(null);

    await expect(service.list(principal)).rejects.toThrow(BadRequestException);
  });
});

describe("coming back from the provider's registration page", () => {
  it("reads a passkey registered during the trip as the one it made", async () => {
    const { service } = setup([laptop, justNow()]);

    await expect(service.confirm(principal)).resolves.toMatchObject({
      Registered: true,
    });
  });

  it("writes it down, named as the person named it", async () => {
    const { service, events } = setup([justNow()]);

    await service.confirm(principal);

    expect(events.record).toHaveBeenCalledWith(
      "marcus",
      "PasskeyAdded",
      'The passkey "YubiKey" was added to your account. It can be used to login without a password.',
      "Mac OS",
    );
  });

  it("calls an unnamed one a passkey rather than leaving a gap", async () => {
    const { service, events } = setup([justNow({ label: null })]);

    await service.confirm(principal);

    expect(events.record.mock.calls[0]![2]).toBe(
      "A passkey was added to your account. It can be used to login without a password.",
    );
  });

  /* The assertion this block exists for. Somebody who dismissed the browser's
   * dialog comes back to the same route as somebody who touched the reader,
   * and the only difference is what the provider holds. */
  it("reads a ceremony nobody finished as one nobody finished", async () => {
    const { service, events } = setup([laptop]);

    await expect(service.confirm(principal)).resolves.toMatchObject({
      Registered: false,
    });
    expect(events.record).not.toHaveBeenCalled();
  });

  it("does not mistake a passkey from last month for a new one", async () => {
    const { service } = setup([
      { ...laptop, createdAt: new Date(Date.now() - 40 * 60 * 1000) },
    ]);

    await expect(service.confirm(principal)).resolves.toMatchObject({
      Registered: false,
    });
  });

  /* Unknown resolves the safe way: "we could not confirm it" sends somebody
   * to look at the card, and "it worked" sends them away. */
  it("answers no for a passkey the provider would not date", async () => {
    const { service } = setup([{ ...laptop, createdAt: null }]);

    await expect(service.confirm(principal)).resolves.toMatchObject({
      Registered: false,
    });
  });

  it("answers the list as it now stands either way", async () => {
    const { service } = setup([laptop]);

    const answer = await service.confirm(principal);

    expect(answer.Passkeys.map((row) => row.Id)).toEqual(["credential-laptop"]);
  });
});

describe("taking one off the account", () => {
  it("removes the credential by the handle the read gave it", async () => {
    const { service, identity } = setup([laptop, phone]);

    await service.remove(principal, "credential-laptop");

    expect(identity.removePasskey).toHaveBeenCalledWith(
      "subject-marcus",
      "credential-laptop",
    );
  });

  it("writes it down", async () => {
    const { service, events } = setup([laptop]);

    await service.remove(principal, "credential-laptop");

    expect(events.record).toHaveBeenCalledWith(
      "marcus",
      "PasskeyRemoved",
      'The passkey "MacBook Touch ID" was removed from your account. It can no longer be used to login.',
      "Mac OS",
    );
  });

  /* Nobody is locked out by losing a passkey: the password and every
   * connected provider still work. The warning belongs in the dialog. */
  it("does not refuse to remove the last one", async () => {
    const { service, identity } = setup([laptop]);
    identity.passkeys.mockResolvedValueOnce([laptop]);
    identity.passkeys.mockResolvedValueOnce([]);

    await expect(
      service.remove(principal, "credential-laptop"),
    ).resolves.toEqual([]);
    expect(identity.removePasskey).toHaveBeenCalled();
  });

  /* The port reads this as done, because it is asked for an end state. A
   * page reporting "removed" about a row that was already gone would be
   * telling somebody their list is now right when it was right before they
   * pressed anything. */
  it("refuses a handle that is not on this account", async () => {
    const { service, identity } = setup([laptop]);

    await expect(
      service.remove(principal, "credential-somebody-elses"),
    ).rejects.toThrow("That passkey is not on this account.");
    expect(identity.removePasskey).not.toHaveBeenCalled();
  });

  it("writes nothing down for a handle it refused", async () => {
    const { service, events } = setup([laptop]);

    await expect(
      service.remove(principal, "credential-somebody-elses"),
    ).rejects.toThrow(BadRequestException);
    expect(events.record).not.toHaveBeenCalled();
  });

  it("answers the list as the provider now has it", async () => {
    const { service, identity } = setup([laptop, phone]);
    identity.passkeys.mockResolvedValueOnce([laptop, phone]);
    identity.passkeys.mockResolvedValueOnce([phone]);

    await expect(
      service.remove(principal, "credential-laptop"),
    ).resolves.toEqual([
      {
        Id: "credential-phone",
        Label: "iPhone",
        CreatedAt: new Date("2026-09-20T10:00:00.000Z"),
      },
    ]);
  });
});
