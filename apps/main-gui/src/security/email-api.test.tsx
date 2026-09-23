import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Reading and writing the signed-in person's addresses.
 *
 * Every write that touches the list answers with the whole list rather than
 * the row it touched, because every one of them can move something else:
 * choosing a primary clears the old one, and removing a row changes what the
 * rest can do. So the list on screen is always replaced wholesale, which is
 * what this file pins.
 *
 * The other thing it pins is an absence. There is no verification token in any
 * request or any answer: it is the secret from the link in a mail, and the
 * browser has no use for it.
 */

const status = vi.fn(() => "signed-in");
const getAccessToken = vi.fn(async () => "a-token" as string | null);
const fetchMock = vi.fn();

vi.mock("../authentication", () => ({
  useSession: () => ({ status: status(), getAccessToken }),
}));

const { useEmails } = await import("./email-api");

const address = (overrides: Record<string, unknown> = {}) => ({
  UserEmailUUID: "e0000000-0000-4000-8000-000000000001",
  Email: "marcus@example.test",
  IsPrimary: true,
  IsVerified: true,
  VerifiedAt: "2026-01-01T00:00:00.000Z",
  CreatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const ID = "e0000000-0000-4000-8000-000000000002";

/* The read answers with the page; the writes answer with a list. Both arrive
 * as the single value of a data object, which is what the hook unwraps. */
const answeringSettings = (
  addresses: unknown[],
  emailIsPrivate = false,
  errors?: { message: string }[],
) =>
  fetchMock.mockResolvedValue({
    json: async () =>
      errors
        ? { errors }
        : {
            data: {
              emailSettings: {
                Addresses: addresses,
                EmailIsPrivate: emailIsPrivate,
              },
            },
          },
  });

const answeringList = (addresses: unknown[], errors?: { message: string }[]) =>
  fetchMock.mockResolvedValue({
    json: async () => (errors ? { errors } : { data: { list: addresses } }),
  });

/* A handle on the hook's own answer, for the tests that call into it. Held on
 * an object rather than in a variable the component reassigns, which is a
 * thing a component must not do.
 *
 * It is cleared before every test. Testing Library unmounts between them, but
 * an effect from a render that has already been torn down can still commit
 * under load, and a stale handle here would answer a later test about a hook
 * instance that is gone. Clearing it turns that into a failure that names
 * itself rather than an assertion about the wrong list. */
const held: { api?: ReturnType<typeof useEmails> } = {};
const api = () => {
  if (!held.api) throw new Error("the hook has not rendered yet");
  return held.api;
};

function Reader() {
  const current = useEmails();
  useEffect(() => {
    held.api = current;
  });
  return (
    <p>
      {current.loading ? "waiting" : `${current.addresses.length} on file`}
      {current.isPrivate ? ": private" : ""}
      {current.error ? `: ${current.error}` : ""}
    </p>
  );
}

beforeEach(() => {
  held.api = undefined;
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  status.mockReturnValue("signed-in");
  getAccessToken.mockReset().mockResolvedValue("a-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const settled = async (
  addresses: unknown[] = [address()],
  isPrivate = false,
) => {
  answeringSettings(addresses, isPrivate);
  render(<Reader />);
  await screen.findByText(new RegExp(`${addresses.length} on file`));
  fetchMock.mockReset();
};

const bodyOf = (call = 0) =>
  JSON.parse(fetchMock.mock.calls[call]![1].body as string) as {
    query: string;
    variables: Record<string, unknown>;
  };

describe("reading the page", () => {
  it("asks for the list and the switch in one round trip", async () => {
    answeringSettings([address()], true);
    render(<Reader />);
    await screen.findByText("1 on file: private");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bodyOf().query).toContain("emailSettings");
  });

  // Private while it waits, which is what every account is until it says
  // otherwise. A switch that started on Public and corrected itself once the
  // answer landed would be saying the wrong thing about somebody's address in
  // the one moment they cannot check it.
  it("waits rather than saying the account has no addresses", () => {
    answeringSettings([address()]);
    render(<Reader />);

    expect(screen.getByText("waiting: private")).toBeInTheDocument();
  });

  it("presents the session's token", async () => {
    await settled();

    expect((fetchMock.mock.calls[0] ?? [])[1] ?? { headers: {} }).toBeDefined();
  });

  it("asks for nothing at all when nobody is signed in", () => {
    status.mockReturnValue("signed-out");
    render(<Reader />);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  // A list that could not be read is a different thing from an empty one and
  // has to say so rather than look like one.
  it("reports a refusal rather than showing an empty list", async () => {
    answeringSettings([], false, [{ message: "Your session has expired." }]);
    render(<Reader />);

    await screen.findByText(/Your session has expired\./);
  });
});

describe("the writes", () => {
  it.each([
    ["add", () => api().add("marcus.work@example.test"), "addEmail"],
    ["remove", () => api().remove(ID), "removeEmail"],
    ["setPrimary", () => api().setPrimary(ID), "setPrimaryEmail"],
    ["resend", () => api().resend(ID), "resendEmailVerification"],
  ])("sends %s as its own mutation", async (_name, run, operation) => {
    await settled();
    answeringList([address(), address({ UserEmailUUID: ID })]);

    await act(async () => {
      await run();
    });

    expect(bodyOf().query).toContain(operation);
  });

  // The rule the whole hook is built on.
  it("replaces the list with what came back rather than patching it", async () => {
    await settled();
    answeringList([
      address({ IsPrimary: false }),
      address({
        UserEmailUUID: ID,
        Email: "marcus.work@example.test",
        IsPrimary: true,
      }),
    ]);

    await act(async () => {
      await api().setPrimary(ID);
    });

    await screen.findByText("2 on file");
    expect(api().addresses.map((one) => one.IsPrimary)).toEqual([false, true]);
  });

  // Parsed rather than sent as typed, so what is sent is what was validated
  // and what the column will hold.
  it("folds and trims an address on the way out", async () => {
    await settled();
    answeringList([address()]);

    await act(async () => {
      await api().add("  Marcus.Work@Example.TEST  ");
    });

    expect(bodyOf().variables).toEqual({
      email: "marcus.work@example.test",
    });
  });

  it("refuses to send something that is not an address", async () => {
    await settled();

    await expect(api().add("marcus")).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // The switch answers with the page rather than the list, and the list that
  // comes with it is taken anyway so a stale one cannot survive the trip.
  it("takes the list back from the privacy switch as well", async () => {
    await settled();
    answeringSettings([address(), address({ UserEmailUUID: ID })], true);

    await act(async () => {
      await api().setPrivacy(true);
    });

    await screen.findByText("2 on file: private");
    expect(bodyOf().variables).toEqual({ isPrivate: true });
  });

  it("passes the API's own sentence on when it refuses", async () => {
    await settled();
    answeringList(
      [],
      [
        {
          message:
            "An address has to be verified before you can sign in with it.",
        },
      ],
    );

    await expect(api().setPrimary(ID)).rejects.toThrow("has to be verified");
  });

  // A refused change must leave the list exactly as it was, so the radio
  // stays where it was rather than moving to a row the API would not accept.
  it("leaves the list alone when a change is refused", async () => {
    await settled();
    answeringList([], [{ message: "Action cannot be performed." }]);

    await expect(api().setPrimary(ID)).rejects.toThrow();

    /* Nothing was committed, so the list on screen is the one that was there
     * before: `replace` only reaches `setAddresses` once the call has
     * resolved. Read through the rendered text as well as the handle, so this
     * is an assertion about what somebody is looking at. */
    expect(screen.getByText("1 on file")).toBeInTheDocument();
    expect(api().addresses).toHaveLength(1);
    expect(api().addresses[0]!.IsPrimary).toBe(true);
  });
});

describe("what never crosses the wire", () => {
  // The token is the secret from a link in an email. The API does not send it
  // and nothing here asks for it.
  it("never asks for a verification token", async () => {
    await settled();
    answeringList([address()]);

    await act(async () => {
      await api().add("marcus.work@example.test");
      await api().resend(ID);
    });

    for (const call of fetchMock.mock.calls)
      expect(
        JSON.parse(call[1].body as string).query.toLowerCase(),
      ).not.toContain("token");
  });
});
