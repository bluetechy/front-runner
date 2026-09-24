import { ThemeProvider } from "@mui/material/styles";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import { PasswordCard } from "./password-card";

/*
 * The change-password card.
 *
 * Three things here are worth more than the rest.
 *
 * **The current password box is the point of the card.** A session says which
 * account this is; it does not say who is at the keyboard, and this is the box
 * a browser somebody walked away from cannot fill.
 *
 * **The boxes are password fields with autocomplete on them.** That is not
 * decoration: it is what a password manager reads to tell this form apart from
 * a login, and what a screen reader announces.
 *
 * **Nothing is sent until the form is good**, and nothing is emptied until the
 * page says the API agreed. A form cleared by a refusal is one somebody has to
 * type again to find out what was wrong with it.
 */

const onChange = vi.fn();

const renderCard = (over: Record<string, unknown> = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <PasswordCard
        changedAt="2026-09-20T21:42:00.000Z"
        loading={false}
        busy={false}
        onChange={onChange}
        {...over}
      />
    </ThemeProvider>,
  );

const box = (label: string) => screen.getByLabelText(label);

const fill = (
  current = "letmein",
  next = "Trombone-42-Fig",
  confirm = next,
) => {
  fireEvent.change(box("Current password"), { target: { value: current } });
  fireEvent.change(box("New password"), { target: { value: next } });
  fireEvent.change(box("New password again"), { target: { value: confirm } });
};

const change = () =>
  fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

beforeEach(() => {
  onChange.mockReset();
});

describe("the card", () => {
  it("is headed the way the cards around it are", () => {
    renderCard();

    expect(
      screen.getByRole("heading", { name: "Change Password" }),
    ).toBeInTheDocument();
  });

  it("says what changing a password will do to the other sessions", () => {
    renderCard();

    expect(screen.getByText(/ends every other session/i)).toBeInTheDocument();
  });
});

describe("when the password was last changed", () => {
  it("writes the day and the hour out rather than counting back", () => {
    renderCard();

    expect(
      screen.getByText(/Last changed on Sep 20, 2026/),
    ).toBeInTheDocument();
  });

  /* Every account's password was set at least when the account was made, so
   * there is no such thing as "never": a provider that would not say gets no
   * line rather than a wrong one. */
  it("says nothing rather than never when nothing is known", () => {
    renderCard({ changedAt: null });

    expect(screen.queryByText(/Last changed/)).toBeNull();
    expect(screen.queryByText(/never/i)).toBeNull();
  });

  it("says nothing while the answer is still on its way", () => {
    renderCard({ loading: true, changedAt: null });

    expect(screen.queryByText(/Last changed/)).toBeNull();
  });
});

describe("the boxes", () => {
  it("asks for the password they have now as well as the one they want", () => {
    renderCard();

    expect(box("Current password")).toBeInTheDocument();
    expect(box("New password")).toBeInTheDocument();
    expect(box("New password again")).toBeInTheDocument();
  });

  it("hides what is typed in every one of them", () => {
    renderCard();

    for (const label of [
      "Current password",
      "New password",
      "New password again",
    ])
      expect(box(label)).toHaveAttribute("type", "password");
  });

  /* What tells a password manager this is a change rather than a login, and
   * which of the three boxes is which. */
  it("says which password each box is for", () => {
    renderCard();

    expect(box("Current password")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(box("New password")).toHaveAttribute("autocomplete", "new-password");
    expect(box("New password again")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
  });

  it("shows the rules a new password has to keep, before anybody types", () => {
    renderCard();

    expect(
      screen.getByRole("list", { name: "What a password needs" }),
    ).toBeInTheDocument();
  });
});

describe("sending it", () => {
  it("hands over what was typed", () => {
    renderCard();
    fill();

    change();

    expect(onChange).toHaveBeenCalledWith(
      {
        Current: "letmein",
        Password: "Trombone-42-Fig",
        Confirm: "Trombone-42-Fig",
      },
      expect.any(Function),
    );
  });

  it("empties the boxes only when it is told the change went through", () => {
    renderCard();
    fill();
    change();

    expect(box("New password")).toHaveValue("Trombone-42-Fig");

    /* The page calls this back when the API has said yes, and only then. */
    const [, done] = onChange.mock.calls[0]!;
    act(() => (done as () => void)());

    expect(box("Current password")).toHaveValue("");
    expect(box("New password")).toHaveValue("");
    expect(box("New password again")).toHaveValue("");
  });

  it("says so while the change is in flight, and cannot be pressed twice", () => {
    renderCard({ busy: true });

    expect(
      screen.getByRole("button", { name: /Changing your password/ }),
    ).toBeDisabled();
  });
});

describe("what it refuses to send", () => {
  it.each([
    [
      "a new password that breaks a rule",
      ["letmein", "short", "short"],
      "A password needs at least 12 characters",
    ],
    [
      "two new passwords that do not match",
      ["letmein", "Trombone-42-Fig", "Trombone-42-Fog"],
      "The two passwords do not match",
    ],
    [
      "nothing in the box for the password they have now",
      ["", "Trombone-42-Fig", "Trombone-42-Fig"],
      "Enter the password you use now",
    ],
  ])("refuses %s", (_name, [current, next, confirm], sentence) => {
    renderCard();
    fill(current, next, confirm);

    change();

    expect(screen.getByText(sentence!)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  /* Leaving the sentence there while somebody fixes the typo is scolding them
   * for something they are already dealing with. */
  it("clears a sentence as soon as its box is being fixed", () => {
    renderCard();
    fill("letmein", "short", "short");
    change();

    fireEvent.change(box("New password"), {
      target: { value: "Trombone-42-Fig" },
    });

    expect(
      screen.queryByText("A password needs at least 12 characters"),
    ).toBeNull();
  });
});
