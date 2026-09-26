import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecoveryCodeError, useRecoveryCode } from "./recovery-code";

/*
 * Spending a recovery code, which goes to main-api without a session.
 *
 * Two things are worth asserting. It carries no Authorization header, because
 * there is nothing to carry: somebody whose authenticator app is gone cannot
 * get a token at all. And what comes back is what changed rather than a
 * session, because a recovery code does not log anybody in -- it takes the
 * factor off the account, and the password login in front of somebody is
 * what does the rest.
 */

const fetchMock = vi.fn();

const answering = (payload: unknown, errors?: { message: string }[]) =>
  fetchMock.mockResolvedValue({
    json: async () =>
      errors ? { errors } : { data: { useRecoveryCode: payload } },
  });

const bodyOf = () =>
  JSON.parse(fetchMock.mock.calls[0]![1].body as string) as {
    query: string;
    variables: Record<string, unknown>;
  };

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("spending one", () => {
  it("sends the name, the password and the code", async () => {
    answering({ TwoFactorRemoved: true, Remaining: 9 });

    await useRecoveryCode("marcus", "a-password", "abcde-fghij");

    expect(bodyOf().variables).toEqual({
      identifier: "marcus",
      password: "a-password",
      code: "abcde-fghij",
    });
  });

  /* Nothing to send: this is the call for somebody who cannot get a token.
   * A header here would be a header that is always empty. */
  it("carries no session", async () => {
    answering({ TwoFactorRemoved: true, Remaining: 9 });

    await useRecoveryCode("marcus", "a-password", "abcde-fghij");

    const headers = fetchMock.mock.calls[0]![1].headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBeUndefined();
  });

  it("answers what changed rather than a session", async () => {
    answering({ TwoFactorRemoved: true, Remaining: 4 });

    const used = await useRecoveryCode("marcus", "a-password", "abcde-fghij");

    expect(used).toEqual({ TwoFactorRemoved: true, Remaining: 4 });
    expect(JSON.stringify(used)).not.toMatch(/token|session/i);
  });
});

describe("when it does not work", () => {
  /* One sentence out of the API for every way this fails, and the card shows
   * what it is given: anything that varied would make this form a way to
   * find out who has an account here. */
  it("shows the sentence the API wrote", async () => {
    answering(null, [
      {
        message:
          "That email address, password and recovery code do not match an account.",
      },
    ]);

    await expect(
      useRecoveryCode("marcus", "wrong", "abcde-fghij"),
    ).rejects.toThrow(/do not match an account/);
  });

  it("says so plainly when the request did not go out at all", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      useRecoveryCode("marcus", "a-password", "abcde-fghij"),
    ).rejects.toThrow(/Could not reach the server/);
  });

  it("throws its own error, so the card can tell it from a bug", async () => {
    answering(null, [{ message: "No." }]);

    await expect(
      useRecoveryCode("marcus", "a-password", "abcde-fghij"),
    ).rejects.toBeInstanceOf(RecoveryCodeError);
  });

  it("does not read an empty answer as success", async () => {
    answering(null);

    await expect(
      useRecoveryCode("marcus", "a-password", "abcde-fghij"),
    ).rejects.toThrow(/did not work/);
  });
});
