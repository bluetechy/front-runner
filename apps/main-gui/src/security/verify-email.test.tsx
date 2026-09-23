import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * Where a verification link lands.
 *
 * The assertion this file exists for is the one about the request: it carries
 * the token and no Authorization header. This page is opened by whoever reads
 * the mailbox, on whatever machine that mailbox is on, and a page that needed
 * a session would refuse the case the feature exists for.
 *
 * The other one worth having is that the token is spent once. It is good for
 * exactly one exchange, and StrictMode runs every effect twice in development,
 * so a page that did not hold its attempt would report a verification that
 * succeeded as one that had already been used.
 */

const fetchMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const { VerifyEmail } = await import("./verify-email");

const TOKEN = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

const answering = (email: string | null, errors?: { message: string }[]) =>
  fetchMock.mockResolvedValue({
    json: async () =>
      errors
        ? { errors }
        : { data: { verifyEmail: email ? { Email: email } : null } },
  });

/* The token is passed through as given rather than defaulted here: a default
 * parameter would swallow an explicit `undefined`, which is exactly the case
 * one of these tests is about. */
const renderPage = (...args: [] | [string | undefined]) =>
  render(
    <ThemeProvider theme={theme}>
      <VerifyEmail token={args.length ? args[0] : TOKEN} />
    </ThemeProvider>,
  );

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const bodyOf = (call = 0) =>
  JSON.parse(fetchMock.mock.calls[call]![1].body as string) as {
    query: string;
    variables: Record<string, unknown>;
  };

describe("the request it sends", () => {
  // The assertion this page exists for.
  it("carries no Authorization header, because there may be no session", async () => {
    answering("marcus.work@example.test");
    renderPage();
    await screen.findByRole("heading", { name: "Email address confirmed" });

    const headers = fetchMock.mock.calls[0]![1].headers as Record<
      string,
      string
    >;
    expect(Object.keys(headers)).toEqual(["Content-Type"]);
  });

  it("sends the token from the URL and nothing else", async () => {
    answering("marcus.work@example.test");
    renderPage();
    await screen.findByRole("heading", { name: "Email address confirmed" });

    expect(bodyOf().variables).toEqual({ token: TOKEN });
    expect(bodyOf().query).toContain("verifyEmail");
  });

  // Good for exactly one exchange, and StrictMode runs effects twice.
  it("spends the token once even when its effect runs again", async () => {
    answering("marcus.work@example.test");
    const { rerender } = renderPage();
    await screen.findByRole("heading", { name: "Email address confirmed" });

    rerender(
      <ThemeProvider theme={theme}>
        <VerifyEmail token={TOKEN} />
      </ThemeProvider>,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("what it tells the reader", () => {
  it("says it is working before an answer arrives", () => {
    answering("marcus.work@example.test");
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Checking your link…" }),
    ).toBeInTheDocument();
  });

  it("names the address that was confirmed", async () => {
    answering("marcus.work@example.test");
    renderPage();

    expect(
      await screen.findByText(/marcus\.work@example\.test is now verified/i),
    ).toBeInTheDocument();
  });

  it("passes the API's own sentence on when the link did not work", async () => {
    answering(null, [
      {
        message:
          "That verification link has expired. Send yourself another one.",
      },
    ]);
    renderPage();

    await screen.findByRole("heading", { name: "That link did not work" });
    expect(screen.getByText(/has expired/i)).toBeInTheDocument();
  });

  // Somebody who typed the address rather than following the link.
  it("says what happened when there is no token at all, without asking the API", () => {
    renderPage(undefined);

    expect(
      screen.getByRole("heading", { name: "That link did not work" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/missing its token/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Both endings leave somebody with something to do, and neither should
  // leave them on a page with no way on.
  it.each([
    ["confirmed", "marcus.work@example.test", undefined],
    ["failed", null, [{ message: "That verification link is not valid." }]],
  ])(
    "offers the way back to the page from %s",
    async (_name, email, errors) => {
      answering(
        email as string | null,
        errors as { message: string }[] | undefined,
      );
      renderPage();

      const link = await screen.findByRole("link", {
        name: /Security & Access/,
      });
      expect(link).toHaveAttribute("href", "/security-and-access");
    },
  );
});
