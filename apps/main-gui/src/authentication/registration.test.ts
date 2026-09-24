import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RegistrationError, registerAccount } from "./registration";
import type { RegistrationForm } from "./registration-schema";

/*
 * Asking main-api to make an account: the one thing this app asks it for
 * without a session.
 *
 * The assertion this file exists for is the absence: the confirmation box
 * does not leave the browser, and no token is presented, because there is no
 * session yet and the mutation is public on purpose.
 */

const fetchMock = vi.fn();

const form: RegistrationForm = {
  Username: "marcus",
  Email: "marcus@example.test",
  FirstName: "Marcus",
  LastName: "Wright",
  Password: "a-good-enough-password",
  Confirm: "a-good-enough-password",
};

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

describe("asking for an account", () => {
  it("sends the five fields the API asks for", async () => {
    answering({
      data: { register: { Username: "marcus", Email: "m@e.test" } },
    });

    await registerAccount(form);

    expect(sent().variables.account).toEqual({
      Username: "marcus",
      Email: "marcus@example.test",
      FirstName: "Marcus",
      LastName: "Wright",
      Password: "a-good-enough-password",
    });
  });

  // A typing aid, only meaningful next to the box above it. The API has no
  // use for a second copy of a password it is about to hash.
  it("keeps the confirmation box in the browser", async () => {
    answering({
      data: { register: { Username: "marcus", Email: "m@e.test" } },
    });

    await registerAccount(form);

    expect(sent().variables.account.Confirm).toBeUndefined();
  });

  // Nobody registering has a session, which is why the mutation is public.
  it("presents no token, because there is none to present", async () => {
    answering({
      data: { register: { Username: "marcus", Email: "m@e.test" } },
    });

    await registerAccount(form);

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBeUndefined();
  });

  it("answers with the username and address as they were stored", async () => {
    answering({
      data: { register: { Username: "marcus", Email: "marcus@example.test" } },
    });

    await expect(registerAccount(form)).resolves.toEqual({
      Username: "marcus",
      Email: "marcus@example.test",
    });
  });
});

describe("when it does not work", () => {
  // GraphQL answers 200 with an errors array, so the status says nothing.
  // These messages are written to be read: "That username or email address is
  // already taken".
  it("shows what the API said", async () => {
    answering({ errors: [{ message: "That username is already taken" }] });

    await expect(registerAccount(form)).rejects.toThrow(
      "That username is already taken",
    );
  });

  it("says the server could not be reached when the request never landed", async () => {
    fetchMock.mockRejectedValue(new Error("Failed to fetch"));

    await expect(registerAccount(form)).rejects.toThrow(
      "Could not reach the server",
    );
  });

  it("refuses an answer with no account in it", async () => {
    answering({ data: { register: null } });

    await expect(registerAccount(form)).rejects.toThrow("could not be created");
  });

  // The card tells a RegistrationError's message apart from anything else,
  // and shows a flat sentence for the rest.
  it("fails with a RegistrationError, whatever went wrong", async () => {
    answering({ errors: [{ message: "no" }] });

    await expect(registerAccount(form)).rejects.toBeInstanceOf(
      RegistrationError,
    );
  });
});
