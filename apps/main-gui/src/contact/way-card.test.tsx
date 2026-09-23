import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MailIcon from "@/shared/icons/MailIcon";
import { theme } from "../design-system";
import { WayCard } from "./way-card";
import type { Way } from "./ways";

/*
 * One way of reaching us. What matters about it is that everything it is
 * given is on the screen and that the thing itself is pressable when there is
 * something to press -- a number printed and not dialled is a number somebody
 * has to copy out by hand on the device that could have rung it.
 */

const renderWay = (way: Way) =>
  render(
    <ThemeProvider theme={theme}>
      <WayCard way={way} />
    </ThemeProvider>,
  );

const email: Way = {
  id: "email",
  heading: "Email",
  icon: MailIcon,
  lines: ["hello@yourlogo.example"],
  href: "mailto:hello@yourlogo.example",
  note: "Every message is answered within one business day.",
};

const address: Way = {
  id: "address",
  heading: "Address",
  icon: MailIcon,
  lines: ["1180 Sherman Street", "Suite 410", "Denver, CO 80203"],
  note: "Open weekdays.",
};

describe("a way of reaching us", () => {
  // The page is read down its headings by anybody using one, and these three
  // are what that reader is choosing between.
  it("writes what it is as a heading", () => {
    renderWay(email);

    expect(screen.getByRole("heading", { name: "Email" })).toBeInTheDocument();
  });

  it("shows every line of it, and when it is answered", () => {
    renderWay(address);

    for (const line of address.lines)
      expect(screen.getByText(line)).toBeInTheDocument();
    expect(screen.getByText(address.note)).toBeInTheDocument();
  });

  it("makes the thing itself the link, when there is one", () => {
    renderWay(email);

    expect(screen.getByRole("link", { name: email.lines[0] })).toHaveAttribute(
      "href",
      email.href,
    );
  });

  // An address is a place. Pressing it would go to whichever map the browser
  // guessed at, so it is read rather than pressed.
  it("leaves a way with nowhere to go as something to read", () => {
    renderWay(address);

    expect(screen.queryByRole("link")).toBeNull();
  });
});
