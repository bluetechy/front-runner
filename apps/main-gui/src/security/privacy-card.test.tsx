import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import { PrivacyCard } from "./privacy-card";

/*
 * The switch under the table.
 *
 * Most of this file is about the copy, which is unusual for a component test
 * and is the point: this is a security page, and a sentence promising more
 * than dbo.GetOrganizationMembers delivers is the kind of promise that matters
 * most here. So what the block says it does and what it says it does not do
 * are both pinned.
 */

const onChange = vi.fn();

const renderCard = (
  props: Partial<React.ComponentProps<typeof PrivacyCard>> = {},
) =>
  render(
    <ThemeProvider theme={theme}>
      <PrivacyCard
        isPrivate={false}
        busy={false}
        onChange={onChange}
        {...props}
      />
    </ThemeProvider>,
  );

beforeEach(() => onChange.mockReset());

describe("the switch", () => {
  it("is labeled, so it can be reached by name", () => {
    renderCard();

    expect(
      screen.getByRole("switch", { name: "Keep my email addresses private" }),
    ).toBeInTheDocument();
  });

  it("shows what it is currently set to", () => {
    const { unmount } = renderCard({ isPrivate: true });
    expect(
      screen.getByRole("switch", { name: "Keep my email addresses private" }),
    ).toBeChecked();
    unmount();

    renderCard({ isPrivate: false });
    expect(
      screen.getByRole("switch", { name: "Keep my email addresses private" }),
    ).not.toBeChecked();
  });

  // A switch says its state in position and color, and this product says
  // nothing in color alone.
  it("says On or Off in words beside itself", () => {
    const { unmount } = renderCard({ isPrivate: true });
    expect(screen.getByText("On")).toBeInTheDocument();
    unmount();

    renderCard({ isPrivate: false });
    expect(screen.getByText("Off")).toBeInTheDocument();
  });

  it("reports what it was moved to rather than changing anything itself", () => {
    renderCard({ isPrivate: false });

    fireEvent.click(
      screen.getByRole("switch", { name: "Keep my email addresses private" }),
    );

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("cannot be moved while a save is running", () => {
    renderCard({ busy: true });

    expect(
      screen.getByRole("switch", { name: "Keep my email addresses private" }),
    ).toBeDisabled();
  });

  // The heading and the paragraph are a great deal easier to hit than a
  // 34-pixel track, so the whole block is the control's label.
  it("can be hit anywhere on the block, not only on the track", () => {
    renderCard();

    fireEvent.click(screen.getByText("Keep my email addresses private"));

    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("what the block says it does", () => {
  it("names the list the address is withheld from", () => {
    renderCard();

    expect(screen.getByText(/members list/i)).toBeInTheDocument();
  });

  it("says the name and user name stay", () => {
    renderCard();

    expect(screen.getByText(/name and user name stay/i)).toBeInTheDocument();
  });

  // The assertion this file exists for: the block must not read as though
  // turning it on deletes the address or unsends anything.
  it("says plainly what it does not do", () => {
    renderCard();

    const caveat = screen.getByText(/does not remove your address/i);
    expect(caveat).toBeInTheDocument();
    expect(caveat.textContent).toMatch(/already sent/i);
    expect(caveat.textContent).toMatch(/administrator/i);
  });
});
