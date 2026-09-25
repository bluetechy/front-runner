import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Reading the other ways into the account, and taking one away.
 *
 * Two things here are worth more than the rest.
 *
 * **Every write answers the whole list**, and the list is replaced by what
 * came back. A disconnection can change a row it was not aimed at: taking one
 * provider away can take the last Disconnect button on the card with it.
 *
 * **`confirm` answers what the API found rather than what the URL claimed.**
 * The browser comes back from a provider with an alias on the address bar, and
 * a trip somebody abandoned halfway comes back the same way a finished one
 * does.
 */

const status = vi.fn(() => "signed-in");
const getAccessToken = vi.fn(async () => "a-token" as string | null);
const fetchMock = vi.fn();

vi.mock("../authentication", () => ({
  useSession: () => ({ status: status(), getAccessToken }),
}));

const { useSignInMethods } = await import("./sso-api");

const google = {
  Alias: "google",
  Name: "Google",
  Available: true,
  Connected: false,
  ConnectedAs: null,
  CanDisconnect: false,
};

const answering = (methods: unknown[], errors?: { message: string }[]) =>
  fetchMock.mockResolvedValue({
    json: async () => (errors ? { errors } : { data: { list: methods } }),
  });

/* A handle on the hook's own answer, for the tests that call into it. Cleared
 * before every test, so a stale one cannot answer a later test about a hook
 * instance that is gone. */
const held: { api?: ReturnType<typeof useSignInMethods> } = {};
const api = () => {
  if (!held.api) throw new Error("the hook has not rendered yet");
  return held.api;
};

function Reader() {
  const current = useSignInMethods();
  useEffect(() => {
    held.api = current;
  });
  return (
    <p>
      {current.loading ? "waiting" : `${current.methods.length} offered`}
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

const settled = async (methods: unknown[] = [google]) => {
  answering(methods);
  render(<Reader />);
  await screen.findByText(`${methods.length} offered`);
  fetchMock.mockReset();
};

const bodyOf = (call = 0) =>
  JSON.parse(fetchMock.mock.calls[call]![1].body as string) as {
    query: string;
    variables: Record<string, unknown>;
  };

describe("reading the card", () => {
  it("asks for every provider and what this account has done about each", async () => {
    answering([google]);
    render(<Reader />);
    await screen.findByText("1 offered");

    expect(bodyOf().query).toContain("signInMethods");
    expect(bodyOf().query).toContain("CanDisconnect");
  });

  it("waits rather than drawing an empty card first", () => {
    answering([google]);
    render(<Reader />);

    expect(screen.getByText("waiting")).toBeInTheDocument();
  });

  // Reported rather than swallowed, unlike the password card's stamp: this
  // read is the card, and a list that could not be read must not draw as a
  // site that offers nothing.
  it("says when the list could not be read at all", async () => {
    answering([], [{ message: "Your session has expired." }]);
    render(<Reader />);

    expect(
      await screen.findByText("0 offered: Your session has expired."),
    ).toBeInTheDocument();
  });

  it("asks nothing at all when nobody is signed in", () => {
    status.mockReturnValue("signed-out");
    render(<Reader />);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("disconnecting one", () => {
  it("names the provider and replaces the whole list with the answer", async () => {
    await settled();
    answering([{ ...google, Name: "Google", Connected: false }]);

    await api().disconnect("google");

    expect(bodyOf().query).toContain("disconnectSignInMethod");
    expect(bodyOf().variables).toEqual({ alias: "google" });
    await screen.findByText("1 offered");
  });

  it("lets a refusal through to whoever asked", async () => {
    await settled();
    answering([], [{ message: "Google is the only way into this account." }]);

    await expect(api().disconnect("google")).rejects.toThrow(
      "Google is the only way into this account.",
    );
  });
});

describe("coming back from a provider", () => {
  it("hands the alias to the API and answers the row it found", async () => {
    await settled();
    answering([{ ...google, Connected: true, ConnectedAs: "m@gmail.test" }]);

    await expect(api().confirm("google")).resolves.toMatchObject({
      Connected: true,
      ConnectedAs: "m@gmail.test",
    });
    expect(bodyOf().query).toContain("confirmSignInMethod");
  });

  // The assertion the whole operation exists for: the URL said it connected,
  // the API asked the provider, and the answer is the provider's.
  it("answers a row that is not connected when the trip did not finish", async () => {
    await settled();
    answering([google]);

    await expect(api().confirm("google")).resolves.toMatchObject({
      Connected: false,
    });
  });

  it("answers nothing at all for a provider the API does not have", async () => {
    await settled();
    answering([google]);

    await expect(api().confirm("okta")).resolves.toBeNull();
  });
});
