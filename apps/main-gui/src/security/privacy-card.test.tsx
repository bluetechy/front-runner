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
  // nothing in color alone. The word is Private or Public rather than On or
  // Off: On says the switch moved, Private says what that did, and it is the
  // word the paragraph beside it uses.
  it("says Private or Public in words beside itself", () => {
    const { unmount } = renderCard({ isPrivate: true });
    expect(screen.getByText("Private")).toBeInTheDocument();
    unmount();

    renderCard({ isPrivate: false });
    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  // Material draws this control for a dark surface, and off is the state that
  // shows least of all: the default track is white held back, which on card
  // paper is a switch you have to already know is there. Both ends come off
  // `brand.cardSwitch*`, where the ratios behind them are written down.
  it("is drawn for the paper it sits on, off as much as on", () => {
    const brand = theme.palette.brand;

    const off = renderCard({ isPrivate: false });
    expect(off.container.querySelector(".MuiSwitch-track")).toHaveStyle({
      backgroundColor: brand.cardSwitchTrack,
      opacity: "1",
    });
    expect(off.container.querySelector(".MuiSwitch-thumb")).toHaveStyle({
      backgroundColor: brand.cardSwitchThumb,
    });
    off.unmount();

    const on = renderCard({ isPrivate: true });
    expect(on.container.querySelector(".MuiSwitch-track")).toHaveStyle({
      backgroundColor: brand.cardSwitchTrackOn,
    });
  });

  // It sits on the card's title line, opposite EMAIL PRIVACY and centered
  // against it, rather than floating above the paragraph: the heading names
  // the setting and the control is the answer to it, so the two belong on one
  // line. That is what CardSurface's `action` row is.
  it("sits on the title line, opposite the heading", () => {
    renderCard();

    const row = screen.getByRole("heading", {
      name: "Email Privacy",
    }).parentElement!;

    expect(row).toContainElement(screen.getByRole("switch"));
    expect(row).toHaveStyle({ alignItems: "center" });
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

  // The paragraph is a great deal easier to hit than a 34-pixel track, so the
  // whole block is the control's label. The heading is the card's now, which
  // is outside this component and therefore outside the label.
  it("can be hit anywhere on the block, not only on the track", () => {
    renderCard();

    fireEvent.click(screen.getByText(/members list/i));

    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("what the block says it does", () => {
  it("names the list the address is withheld from", () => {
    renderCard();

    expect(screen.getByText(/members list/i)).toBeInTheDocument();
  });

  // The two words on the switch have to appear in the sentence that explains
  // it, or the control and the copy are describing the setting separately.
  it("explains the setting in the same two words the switch uses", () => {
    renderCard();

    const copy = screen.getByText(/members list/i);
    expect(copy.textContent).toMatch(/Private/);
    expect(copy.textContent).toMatch(/Set this to Public/);
  });

  // Private is what the account was given at creation rather than something
  // to go and find, and the copy has to say so: somebody reading this should
  // learn they are already withheld, not wonder whether they are.
  it("says the addresses are private to begin with", () => {
    renderCard();

    expect(
      screen.getByText(/addresses are Private to begin with/i),
    ).toBeInTheDocument();
  });

  // One paragraph, the caveat included: set apart on its own line it reads as
  // a footnote somebody else added rather than part of the promise.
  it("says all of it in one paragraph", () => {
    renderCard();

    const copy = screen.getByText(/members list/i);
    expect(copy.textContent).toMatch(/does not remove your email address/i);
  });

  it("says the name and user name stay", () => {
    renderCard();

    expect(screen.getByText(/name and user name stay/i)).toBeInTheDocument();
  });

  // The assertion this file exists for: the block must not read as though
  // turning it on deletes the address or unsends anything.
  it("says plainly what it does not do", () => {
    renderCard();

    const caveat = screen.getByText(/does not remove your email address/i);
    expect(caveat).toBeInTheDocument();
    expect(caveat.textContent).toMatch(/already sent/i);
    expect(caveat.textContent).toMatch(/administrator/i);
  });
});
