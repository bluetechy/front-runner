import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Reading the passkeys on the account, and taking one away.
 *
 * Three things here are worth more than the rest.
 *
 * **Every write answers the whole list**, and the list is replaced by what
 * came back rather than edited in place. The same rule `sso-api.tsx` keeps.
 *
 * **`confirm` answers what the API found rather than what the URL claimed.**
 * The browser comes back from the provider's registration page with nothing
 * but a marker saying a trip happened, and a ceremony somebody dismissed
 * comes back looking exactly like one they finished.
 *
 * **A list that could not be read is an error rather than an empty card.**
 * An account with no passkeys and an account whose passkeys could not be
 * read are the same picture and must not be: the second one is drawn as an
 * account with nothing that can login without a password.
 */

const status = vi.fn(() => "signed-in");
const getAccessToken = vi.fn(async () => "a-token" as string | null);
const fetchMock = vi.fn();

vi.mock("../authentication", () => ({
  useSession: () => ({ status: status(), getAccessToken }),
}));

const { usePasskeys } = await import("./passkey-api");

const laptop = {
  Id: "credential-laptop",
  Label: "MacBook Touch ID",
  CreatedAt: "2026-09-01T10:00:00.000Z",
};

const phone = {
  Id: "credential-phone",
  Label: "iPhone",
  CreatedAt: "2026-09-20T10:00:00.000Z",
};

const answering = (passkeys: unknown[], errors?: { message: string }[]) =>
  fetchMock.mockResolvedValue({
    json: async () => (errors ? { errors } : { data: { list: passkeys } }),
  });

/* A handle on the hook's own answer, for the tests that call into it.
 * Cleared before every test, so a stale one cannot answer a later test about
 * a hook instance that is gone. */
const held: { api?: ReturnType<typeof usePasskeys> } = {};
const api = () => {
  if (!held.api) throw new Error("the hook has not rendered yet");
  return held.api;
};

function Reader() {
  const current = usePasskeys();
  useEffect(() => {
    held.api = current;
  });
  return (
    <p>
      {current.loading ? "waiting" : `${current.passkeys.length} registered`}
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

const settled = async (passkeys: unknown[] = [laptop]) => {
  answering(passkeys);
  render(<Reader />);
  await screen.findByText(`${passkeys.length} registered`);
  fetchMock.mockReset();
};

const bodyOf = (call = 0) =>
  JSON.parse(fetchMock.mock.calls[call]![1].body as string) as {
    query: string;
    variables: Record<string, unknown>;
  };

describe("reading the card", () => {
  it("asks for the account's passkeys", async () => {
    answering([laptop]);
    render(<Reader />);
    await screen.findByText("1 registered");

    expect(bodyOf().query).toContain("passkeys");
    expect(bodyOf().query).toContain("Label");
  });

  it("draws an account with none as an empty card", async () => {
    answering([]);
    render(<Reader />);

    await screen.findByText("0 registered");
  });

  /* The assertion this block exists for. "None registered" and "we could not
   * find out" are the same picture and a different fact. */
  it("reports a list it could not read rather than drawing an empty one", async () => {
    answering([], [{ message: "The API is down." }]);
    render(<Reader />);

    await screen.findByText("0 registered: The API is down.");
  });

  it("asks nothing at all while nobody is logged in", async () => {
    status.mockReturnValue("signed-out");
    answering([laptop]);
    render(<Reader />);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("coming back from the provider's registration page", () => {
  it("asks the API what the account now holds", async () => {
    await settled([]);
    fetchMock.mockResolvedValue({
      json: async () => ({
        data: { confirmPasskey: { Registered: true, Passkeys: [laptop] } },
      }),
    });

    await expect(api().confirm()).resolves.toBe(true);
    expect(bodyOf().query).toContain("confirmPasskey");
  });

  /* The assertion this block exists for: a trip somebody abandoned comes
   * back the same way a finished one does, and only the API can tell them
   * apart. */
  it("answers no for a ceremony nobody finished", async () => {
    await settled([]);
    fetchMock.mockResolvedValue({
      json: async () => ({
        data: { confirmPasskey: { Registered: false, Passkeys: [] } },
      }),
    });

    await expect(api().confirm()).resolves.toBe(false);
  });

  it("redraws the card from what came back", async () => {
    await settled([]);
    fetchMock.mockResolvedValue({
      json: async () => ({
        data: { confirmPasskey: { Registered: true, Passkeys: [laptop] } },
      }),
    });

    await api().confirm();

    await screen.findByText("1 registered");
  });
});

describe("taking one away", () => {
  it("names the one it is about", async () => {
    await settled([laptop, phone]);
    answering([phone]);

    await api().remove("credential-laptop");

    expect(bodyOf().query).toContain("removePasskey");
    expect(bodyOf().variables).toEqual({ id: "credential-laptop" });
  });

  /* Replaced by what came back rather than filtered here: the API is what
   * says which rows are left. */
  it("redraws the card from the list the API answered", async () => {
    await settled([laptop, phone]);
    answering([phone]);

    await api().remove("credential-laptop");

    await screen.findByText("1 registered");
  });

  it("passes a refusal to whoever asked", async () => {
    await settled([laptop]);
    answering([], [{ message: "That passkey is not on this account." }]);

    await expect(api().remove("credential-laptop")).rejects.toThrow(
      "That passkey is not on this account.",
    );
  });
});
