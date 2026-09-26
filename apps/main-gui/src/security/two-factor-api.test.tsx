import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Reading the second factor and the recovery codes, and changing either.
 *
 * Three things here are worth more than the rest.
 *
 * **Both cards come out of one round trip.** They are drawn together, and two
 * calls would let the page show a factor before it knew whether there were
 * any codes behind it -- which is exactly the pair of facts somebody is
 * reading the page to compare.
 *
 * **`confirm` answers what the API found rather than what the URL claimed.**
 * The browser comes back from the provider's setup page with a kind on the
 * address bar, and somebody who abandoned the QR code comes back the same way
 * as somebody who scanned it.
 *
 * **The codes are handed over and not kept.** The hook holds the count
 * afterwards, because the API stores hashes and there is nothing to show a
 * second time.
 */

const status = vi.fn(() => "signed-in");
const getAccessToken = vi.fn(async () => "a-token" as string | null);
const fetchMock = vi.fn();

vi.mock("../authentication", () => ({
  useSession: () => ({ status: status(), getAccessToken }),
}));

const { useTwoFactor } = await import("./two-factor-api");

const app = {
  Kind: "authenticator-app",
  Name: "Authenticator app",
  Available: true,
  Configured: false,
  ConfiguredAt: null,
  Label: null,
  Recommended: true,
};

const noCodes = { Remaining: 0, Total: 0, GeneratedAt: null };

const answeringRead = (
  methods: unknown[] = [app],
  codes: unknown = noCodes,
  errors?: { message: string }[],
) =>
  fetchMock.mockResolvedValue({
    json: async () =>
      errors
        ? { errors }
        : { data: { twoFactorMethods: methods, recoveryCodes: codes } },
  });

const answeringWrite = (payload: unknown) =>
  fetchMock.mockResolvedValue({
    json: async () => ({ data: { anything: payload } }),
  });

/* A handle on the hook's own answer, for the tests that call into it. */
const held: { api?: ReturnType<typeof useTwoFactor> } = {};
const api = () => {
  if (!held.api) throw new Error("the hook has not rendered yet");
  return held.api;
};

function Reader() {
  const current = useTwoFactor();
  useEffect(() => {
    held.api = current;
  });
  return (
    <p>
      {current.loading
        ? "waiting"
        : `${current.methods.length} offered, ${current.codes.Remaining} left`}
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
  methods: unknown[] = [app],
  codes: unknown = noCodes,
) => {
  answeringRead(methods, codes);
  render(<Reader />);
  await screen.findByText(/offered/);
  fetchMock.mockReset();
};

const bodyOf = (call = 0) =>
  JSON.parse(fetchMock.mock.calls[call]![1].body as string) as {
    query: string;
    variables: Record<string, unknown>;
  };

describe("reading the two cards", () => {
  it("asks for the factors and the codes in one call", async () => {
    answeringRead();
    render(<Reader />);
    await screen.findByText("1 offered, 0 left");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bodyOf().query).toContain("twoFactorMethods");
    expect(bodyOf().query).toContain("recoveryCodes");
  });

  it("waits rather than drawing an unprotected account first", () => {
    answeringRead();
    render(<Reader />);

    expect(screen.getByText("waiting")).toBeInTheDocument();
  });

  /* Reported rather than swallowed. These cards are what somebody reads to
   * find out whether their account has a second factor, and a read that
   * failed must not draw as an account that has none. */
  it("says when it could not be read at all", async () => {
    answeringRead([], noCodes, [{ message: "Your session has expired." }]);
    render(<Reader />);

    expect(
      await screen.findByText(/Your session has expired\./),
    ).toBeInTheDocument();
  });

  it("asks nothing at all when nobody is signed in", () => {
    status.mockReturnValue("signed-out");
    render(<Reader />);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("turning one off", () => {
  it("names the kind and replaces the whole list with the answer", async () => {
    await settled();
    answeringWrite([{ ...app, Configured: false }]);

    await api().disable("authenticator-app");

    expect(bodyOf().variables).toEqual({ kind: "authenticator-app" });
    expect(await screen.findByText(/1 offered/)).toBeInTheDocument();
  });
});

describe("coming back from the provider", () => {
  it("answers the row as the API found it, not as the URL claimed it", async () => {
    await settled();
    answeringWrite([{ ...app, Configured: true }]);

    const row = await api().confirm("authenticator-app");

    expect(row).toMatchObject({ Configured: true });
  });

  /* A trip somebody abandoned at the QR code. The API says the account still
   * has nothing, and the hook passes that on rather than the claim. */
  it("answers a row that is still not configured for a trip that did not finish", async () => {
    await settled();
    answeringWrite([{ ...app, Configured: false }]);

    const row = await api().confirm("authenticator-app");

    expect(row).toMatchObject({ Configured: false });
  });

  it("answers nothing for a kind the API does not list", async () => {
    await settled();
    answeringWrite([app]);

    await expect(api().confirm("sms")).resolves.toBeNull();
  });
});

describe("making recovery codes", () => {
  const made = {
    Codes: ["abcde-fghij", "klmno-pqrst"],
    Status: { Remaining: 2, Total: 2, GeneratedAt: "2026-09-25T12:00:00.000Z" },
  };

  it("hands the codes to the caller", async () => {
    await settled();
    answeringWrite(made);

    await expect(api().generate()).resolves.toEqual(made.Codes);
  });

  /* The count is kept and the codes are not: the API stores hashes, so the
   * card can never show them again and must not pretend it could. */
  it("keeps the count and not the codes", async () => {
    await settled();
    answeringWrite(made);

    await api().generate();

    expect(await screen.findByText(/2 left/)).toBeInTheDocument();
    expect(JSON.stringify(api())).not.toContain("abcde-fghij");
  });
});
