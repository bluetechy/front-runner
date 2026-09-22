import { ThemeProvider } from "@mui/material/styles";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * The one card on the dashboard that is not placeholder.
 *
 * It shows the identity Keycloak issued the token for beside the account
 * main-api returned when that same token was sent to it, which is the only
 * view in the product that proves the whole chain rather than just the login
 * form. That is why it is worth a test of its own: it is the thing somebody
 * looks at when they are asking "is any of this actually wired up?".
 */

const getAccessToken = vi.fn();
const fetchMock = vi.fn();

vi.mock("../authentication", () => ({
  useSession: () => ({
    identity: {
      subject: "subject-id",
      loginName: "member",
      name: "Thomas John",
      email: "member@example.test",
    },
    getAccessToken,
  }),
}));

const { AccountCard } = await import("./account-card");

const account = {
  UserUUID: "a0000000-0000-4000-8000-000000000001",
  Name: "Thomas John",
  LoginName: "member",
  Email: "member@example.test",
  IsAdmin: false,
};

const answering = (data: unknown, errors?: { message: string }[]) =>
  fetchMock.mockResolvedValue({
    json: async () => (errors ? { errors } : { data: { me: data } }),
  });

const renderCard = () =>
  render(
    <ThemeProvider theme={theme}>
      <AccountCard />
    </ThemeProvider>,
  );

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  getAccessToken.mockReset().mockResolvedValue("an-access-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the identity Keycloak issued", () => {
  it("is shown without asking anybody", () => {
    answering(account);
    renderCard();

    expect(screen.getByText("subject-id")).toBeInTheDocument();
    expect(screen.getAllByText("Thomas John").length).toBeGreaterThan(0);
  });
});

describe("the account main-api returned", () => {
  it("is asked for with the token the session holds", async () => {
    answering(account);
    renderCard();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(request.headers.Authorization).toBe("Bearer an-access-token");
    expect(JSON.parse(request.body).query).toContain("me");
  });

  it("is shown beside the identity once it arrives", async () => {
    answering(account);
    renderCard();

    expect(
      await screen.findByText("a0000000-0000-4000-8000-000000000001"),
    ).toBeInTheDocument();
    expect(screen.getByText("no")).toBeInTheDocument();
  });

  it("asks nothing at all when there is no token to ask with", async () => {
    getAccessToken.mockResolvedValue(null);
    renderCard();

    await waitFor(() => expect(getAccessToken).toHaveBeenCalled());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // The API answers 200 with an errors array, so the status says nothing.
  // What it said is worth showing here of all places: this card exists to
  // explain why the chain is not working.
  it("shows what the API said when it refused", async () => {
    answering(null, [{ message: "A Bearer token is required" }]);
    renderCard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A Bearer token is required",
    );
  });

  it("says something honest when the API cannot be reached at all", async () => {
    fetchMock.mockRejectedValue(new Error("Failed to fetch"));
    renderCard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to fetch",
    );
  });

  // A card that flashes "not set" and then fills in is worse than one that
  // says nothing until it knows.
  it("shows nothing rather than blanks while it is waiting", () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const { container } = renderCard();

    expect(container.querySelectorAll(".MuiSkeleton-root").length).toBe(2);
  });
});
