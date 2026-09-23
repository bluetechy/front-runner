import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "./profile-schema";

/*
 * Reading and writing the signed-in person's profile.
 *
 * It is a provider rather than a hook per page because two things want it:
 * the page, and the rail, which shows the designation under somebody's name.
 * Fetching it twice would be two answers that can disagree.
 *
 * The session is stubbed, and so is the network. What is under test is the
 * bookkeeping: when it is allowed to ask at all, what it does with what comes
 * back, and what a save leaves behind.
 */

const status = vi.fn(() => "signed-in");
const getAccessToken = vi.fn(async () => "a-token" as string | null);
const fetchMock = vi.fn();

vi.mock("../authentication", () => ({
  useSession: () => ({ status: status(), getAccessToken }),
}));

const { ProfileProvider, useProfile } = await import("./profile-api");

const stored = {
  UserUUID: "a0000000-0000-4000-8000-000000000001",
  FirstName: "Marcus",
  LastName: "Member",
  NickName: "",
  Designation: "Program manager",
  Biography: "",
  Gender: "Not specified",
  BirthDate: "1990-04-17",
  Phone: "",
  Address: "",
  Facebook: "",
  Github: "",
  LinkedIn: "",
  TikTok: "",
  Twitter: "",
  WantsAwardEmails: true,
  WantsDigestEmails: false,
};

const answering = (data: unknown, errors?: { message: string }[]) =>
  fetchMock.mockResolvedValue({
    json: async () => (errors ? { errors } : { data: { profile: data } }),
  });

/* A handle on the hook's own answer, for the tests that call into it
 * rather than press something. Held on an object rather than in a variable
 * the component reassigns, which is a thing a component must not do. */
const held: { api?: ReturnType<typeof useProfile> } = {};
const api = () => held.api!;

function Reader() {
  const current = useProfile();
  /* Kept for the tests that call into it rather than press something. In an
   * effect rather than during the render, because a component that writes to
   * something outside itself while rendering is the bug this test is not
   * about. */
  useEffect(() => {
    held.api = current;
  });
  return (
    <p>
      {current.loading
        ? "waiting"
        : (current.profile?.Designation ?? "nothing")}
      {current.error ? `: ${current.error}` : ""}
    </p>
  );
}

const renderProvider = () =>
  render(
    <ProfileProvider>
      <Reader />
    </ProfileProvider>,
  );

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  status.mockReturnValue("signed-in");
  getAccessToken.mockReset().mockResolvedValue("a-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reading the profile", () => {
  it("asks for it with the token the session holds", async () => {
    answering(stored);
    renderProvider();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(request.headers.Authorization).toBe("Bearer a-token");
  });

  // The form seeds itself from the profile, so it has to be able to tell
  // "not here yet" from "here and empty" -- otherwise it seeds from empties
  // and overwrites them a moment later.
  it("says it is waiting until the first answer arrives", async () => {
    answering(stored);
    renderProvider();

    expect(screen.getByText("waiting")).toBeInTheDocument();
    expect(await screen.findByText("Program manager")).toBeInTheDocument();
  });

  // The `_app` route sends a signed-out visitor back to the landing page, so
  // this is the moment before the session has settled.
  it("asks for nothing until somebody is signed in", () => {
    status.mockReturnValue("loading");

    renderProvider();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops waiting even when the API refuses", async () => {
    answering(null, [{ message: "A Bearer token is required" }]);
    renderProvider();

    expect(
      await screen.findByText(/A Bearer token is required/),
    ).toBeInTheDocument();
  });

  it("says so rather than calling when the session has gone", async () => {
    getAccessToken.mockResolvedValue(null);
    renderProvider();

    expect(await screen.findByText(/session has expired/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("saving the profile", () => {
  const edited = { ...stored, FirstName: "  Marc  " } as unknown as Profile;

  it("sends what the schema parsed rather than what was typed", async () => {
    answering(stored);
    renderProvider();
    await screen.findByText("Program manager");

    answering({ ...stored, FirstName: "Marc" });
    await act(() =>
      api()
        .save(edited)
        .then(() => undefined),
    );

    const [, request] = fetchMock.mock.calls.at(-1) ?? [];
    expect(JSON.parse(request.body).variables.profile.FirstName).toBe("Marc");
  });

  // The rail shows the designation under somebody's name, and it must change
  // as the form is saved rather than at the next page load.
  it("keeps what came back, so everything reading it sees the new one", async () => {
    answering(stored);
    renderProvider();
    await screen.findByText("Program manager");

    answering({ ...stored, Designation: "Head of program" });
    await act(() =>
      api()
        .save(edited)
        .then(() => undefined),
    );

    expect(screen.getByText("Head of program")).toBeInTheDocument();
  });

  it("hands the failure back to the caller rather than swallowing it", async () => {
    answering(stored);
    renderProvider();
    await screen.findByText("Program manager");

    answering(null, [{ message: "BirthDate: Use the format YYYY-MM-DD" }]);

    await expect(api().save(edited)).rejects.toThrow(
      "BirthDate: Use the format YYYY-MM-DD",
    );
  });

  it("clears an earlier failure once a save works", async () => {
    answering(null, [{ message: "Could not reach the API." }]);
    renderProvider();
    await screen.findByText(/Could not reach the API./);

    answering(stored);
    await act(() =>
      api()
        .save(edited)
        .then(() => undefined),
    );

    expect(screen.queryByText(/Could not reach the API./)).toBeNull();
  });
});

describe("reading the profile from outside the provider", () => {
  // Two copies of somebody's profile that can disagree is worse than a page
  // that fails where it was written.
  it("throws rather than fetching a second copy", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Reader />)).toThrow(/inside a ProfileProvider/);
  });
});
