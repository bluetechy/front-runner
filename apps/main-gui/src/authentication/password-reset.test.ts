import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PasswordResetError,
  requestPasswordReset,
  resetPassword,
} from "./password-reset";

/*
 * Asking main-api for a reset link, and spending it.
 *
 * Both calls go to main-api rather than to Keycloak, because the identity
 * provider will only mail its own link to its own page. Neither carries a
 * token of ours: somebody who cannot login has none, which is why both
 * mutations are public over there.
 */

const fetchMock = vi.fn();

const answering = (body: unknown) =>
  fetchMock.mockResolvedValue({ json: async () => body });

const sent = () => JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("asking for a link", () => {
  it("sends the name that was typed", async () => {
    answering({ data: { requestPasswordReset: { Identifier: "marcus" } } });

    await requestPasswordReset("marcus");

    expect(sent().variables).toEqual({ identifier: "marcus" });
    expect(sent().query).toContain("requestPasswordReset");
  });

  // There is no session to present, and the mutation is public because of it.
  it("presents no token of its own", async () => {
    answering({ data: { requestPasswordReset: { Identifier: "marcus" } } });

    await requestPasswordReset("marcus");

    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      "Content-Type": "application/json",
    });
  });

  it("surfaces what the API said when it refused", async () => {
    answering({
      errors: [{ message: "Enter your username or email address" }],
    });

    await expect(requestPasswordReset("")).rejects.toThrow(
      "Enter your username or email address",
    );
  });

  // A refusal reads as something to fix; a network that carried nothing does
  // not.
  it("says the server could not be reached when the call did not land", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    await expect(requestPasswordReset("marcus")).rejects.toThrow(
      "Could not reach the server",
    );
  });

  it("names its failures so a card can tell them from anything else", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    await expect(requestPasswordReset("marcus")).rejects.toBeInstanceOf(
      PasswordResetError,
    );
  });
});

describe("spending the link", () => {
  it("sends the token and the new password", async () => {
    answering({ data: { resetPassword: { LoginName: "marcus" } } });

    await resetPassword("a-token", "a-good-enough-password");

    expect(sent().variables).toEqual({
      token: "a-token",
      password: "a-good-enough-password",
    });
  });

  // What to login with, which somebody who has forgotten a password has often
  // forgotten too.
  it("answers with the login name", async () => {
    answering({ data: { resetPassword: { LoginName: "marcus" } } });

    await expect(resetPassword("a-token", "a-password")).resolves.toBe(
      "marcus",
    );
  });

  // GraphQL answers 200 with an errors array, so the status says nothing.
  it("surfaces a link that has already been used", async () => {
    answering({
      errors: [
        {
          message:
            "That password reset link is not valid or has already been used.",
        },
      ],
    });

    await expect(resetPassword("a-token", "a-password")).rejects.toThrow(
      "already been used",
    );
  });

  it("refuses an answer with no account in it", async () => {
    answering({ data: { resetPassword: null } });

    await expect(resetPassword("a-token", "a-password")).rejects.toThrow(
      "did not work",
    );
  });
});
