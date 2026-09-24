import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * When the account's password was last set, and changing it.
 *
 * Two things here are worth more than the rest, and both are absences.
 *
 * **No password is ever held.** Both of them are arguments to one call and
 * neither reaches state, so there is nothing in this hook for a later render,
 * a devtools panel or an error report to find. That is what the last block
 * asserts, by reading back everything the hook answers with.
 *
 * **A stamp that could not be read is not a failure.** The date is one line on
 * a card whose job is the form under it, and a page that shouted about a
 * missing date over a working form would be reporting its least important
 * failure loudest.
 */

const status = vi.fn(() => "signed-in");
const getAccessToken = vi.fn(async () => "a-token" as string | null);
const fetchMock = vi.fn();

vi.mock("../authentication", () => ({
  useSession: () => ({ status: status(), getAccessToken }),
}));

const { usePassword } = await import("./password-api");

const CHANGED = "2026-09-20T21:42:00.000Z";

const answering = (data: unknown, errors?: { message: string }[]) =>
  fetchMock.mockResolvedValue({
    json: async () => (errors ? { errors } : { data }),
  });

/* A handle on the hook's own answer, for the tests that call into it. Cleared
 * before every test: an effect from a render that has already been torn down
 * can still commit under load, and a stale handle would answer a later test
 * about a hook instance that is gone. */
const held: { api?: ReturnType<typeof usePassword> } = {};
const api = () => {
  if (!held.api) throw new Error("the hook has not rendered yet");
  return held.api;
};

function Reader() {
  const current = usePassword();
  useEffect(() => {
    held.api = current;
  });
  return (
    <p>{current.loading ? "waiting" : (current.changedAt ?? "no date")}</p>
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

const settled = async (changedAt: string | null = CHANGED) => {
  answering({ passwordStatus: { ChangedAt: changedAt } });
  render(<Reader />);
  await screen.findByText(changedAt ?? "no date");
  fetchMock.mockReset();
};

const bodyOf = (call = 0) =>
  JSON.parse(fetchMock.mock.calls[call]![1].body as string) as {
    query: string;
    variables: Record<string, unknown>;
  };

describe("reading when the password was last set", () => {
  it("asks once and answers with what came back", async () => {
    await settled();

    expect(api().changedAt).toBe(CHANGED);
    expect(api().loading).toBe(false);
  });

  it("waits rather than saying it does not know", () => {
    answering({ passwordStatus: { ChangedAt: CHANGED } });
    render(<Reader />);

    expect(screen.getByText("waiting")).toBeInTheDocument();
  });

  it("asks for nothing while nobody is signed in", () => {
    status.mockReturnValue("signed-out");
    render(<Reader />);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  /* The one read on this page that swallows its failure. A red alert over a
   * working form because a stamp could not be fetched would be the page
   * reporting its least important failure loudest. */
  it("stops waiting and says nothing when the API refuses", async () => {
    answering(null, [{ message: "Action cannot be performed." }]);
    render(<Reader />);

    expect(await screen.findByText("no date")).toBeInTheDocument();
  });
});

describe("changing it", () => {
  it("sends both passwords", async () => {
    await settled();
    answering({
      changePassword: { ChangedAt: CHANGED, OtherSessionsEnded: 2 },
    });

    await act(async () => {
      await api().change("letmein", "Trombone-42-Fig");
    });

    expect(bodyOf().variables).toEqual({
      currentPassword: "letmein",
      newPassword: "Trombone-42-Fig",
    });
  });

  it("carries the session's token on it", async () => {
    await settled();
    answering({
      changePassword: { ChangedAt: CHANGED, OtherSessionsEnded: 0 },
    });

    await act(async () => {
      await api().change("letmein", "Trombone-42-Fig");
    });

    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBe(
      "Bearer a-token",
    );
  });

  /* The mutation already knows the new date, so the card redraws its line from
   * the answer rather than asking again: a second round trip would leave the
   * old date on screen for as long as it took. */
  it("moves the stamp from what the change answered with", async () => {
    await settled();
    answering({
      changePassword: {
        ChangedAt: "2026-09-24T10:00:00.000Z",
        OtherSessionsEnded: 1,
      },
    });

    await act(async () => {
      await api().change("letmein", "Trombone-42-Fig");
    });

    expect(api().changedAt).toBe("2026-09-24T10:00:00.000Z");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("hands back how many other sessions were ended", async () => {
    await settled();
    answering({
      changePassword: { ChangedAt: CHANGED, OtherSessionsEnded: 3 },
    });

    const changed = await act(async () =>
      api().change("letmein", "Trombone-42-Fig"),
    );

    expect(changed).toEqual({
      ChangedAt: CHANGED,
      OtherSessionsEnded: 3,
    });
  });

  it("passes the API's own refusal on", async () => {
    await settled();
    answering(null, [{ message: "That is not the password you use now." }]);

    await expect(
      act(async () => api().change("wrong", "Trombone-42-Fig")),
    ).rejects.toThrow("That is not the password you use now.");
  });

  /* The assertion this file exists for. Neither password may survive the call
   * that carried it: what the hook answers with is the whole of what it
   * holds. */
  it("keeps neither password anywhere", async () => {
    await settled();
    answering({
      changePassword: { ChangedAt: CHANGED, OtherSessionsEnded: 0 },
    });

    await act(async () => {
      await api().change("letmein", "Trombone-42-Fig");
    });

    expect(JSON.stringify(api())).not.toContain("letmein");
    expect(JSON.stringify(api())).not.toContain("Trombone-42-Fig");
  });
});
