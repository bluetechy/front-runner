import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import { ways } from "./ways";

/*
 * The contact page: the three ways to reach us, and the form under them.
 *
 * What is asserted here is the page rather than the pieces -- each of those
 * has its own file beside it. So: that all three ways are on it, that the
 * form is the real one rather than a picture of one, and that what the form
 * says back is thrown into the corner where this product puts that.
 *
 * The send is stubbed, because a page test that reached the real one would be
 * asserting on the seam rather than on the page. `Link` is stubbed because
 * the redirect beside the form is a route.
 */

const sendMessage = vi.fn().mockResolvedValue(undefined);

vi.mock("./send-message", () => ({
  sendMessage: (message: unknown) => sendMessage(message),
}));

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

const { ContactUs } = await import("./contact-us");

const renderPage = () =>
  render(
    <ThemeProvider theme={theme}>
      <ContactUs />
    </ThemeProvider>,
  );

describe("the ways to reach us", () => {
  it("shows all three, with the thing itself under each", () => {
    renderPage();

    for (const way of ways) {
      expect(
        screen.getByRole("heading", { name: way.heading }),
      ).toBeInTheDocument();
      expect(screen.getByText(way.lines[0]!)).toBeInTheDocument();
    }
  });

  // Somebody already inside the product has a better way in than an inbox
  // that does not know who they are.
  it("points somebody who is already signed in at customer service", () => {
    renderPage();

    expect(
      screen.getByRole("link", { name: "Customer service" }),
    ).toHaveAttribute("href", "/customer-service");
  });
});

describe("what the page says back", () => {
  it("throws the answer into the corner once the message has gone", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Marcus" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "marcus@member.example" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Does this fit a reading program?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(
      await screen.findByText("Thank you, your message is with us."),
    ).toBeInTheDocument();
    await waitFor(() => expect(sendMessage).toHaveBeenCalled());
  });
});
