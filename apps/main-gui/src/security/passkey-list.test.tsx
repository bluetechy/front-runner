import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import type { Passkey } from "./passkey-api";
import { PasskeyList } from "./passkey-list";

/*
 * The passkeys on the account, one to a row.
 *
 * What is worth asserting is what an empty card says and what a row says,
 * because that is where this card can do harm. An empty card that read like
 * a broken one would have somebody adding a second passkey they already
 * have; a row with no date on it would leave two keys named the same thing
 * indistinguishable; and a row that lost its Remove button would leave a
 * credential on the account with nothing on this page able to take it off.
 *
 * The order is not asserted here, and deliberately: it is the API's, and a
 * list that sorted would be a second client quietly disagreeing about which
 * passkey is the newest.
 */

const passkey = (overrides: Partial<Passkey> = {}): Passkey => ({
  Id: "credential-laptop",
  Label: "MacBook Touch ID",
  CreatedAt: "2026-09-01T10:00:00.000Z",
  ...overrides,
});

const draw = (
  passkeys: Passkey[],
  {
    busyId = null,
    failed = false,
    loading = false,
  }: { busyId?: string | null; failed?: boolean; loading?: boolean } = {},
) => {
  const onRemove = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <PasskeyList
        passkeys={passkeys}
        loading={loading}
        failed={failed}
        busyId={busyId}
        onRemove={onRemove}
      />
    </ThemeProvider>,
  );
  return { onRemove };
};

describe("what a row says", () => {
  it("is what the passkey was called where it was registered", () => {
    draw([passkey()]);

    expect(screen.getByText("MacBook Touch ID")).toBeInTheDocument();
  });

  /* A blank where a name should be reads as a bug. An unnamed key is a real
   * thing -- not every authenticator asks -- and it is named for what it
   * is. */
  it("calls an unnamed one a passkey rather than leaving a gap", () => {
    draw([passkey({ Label: null })]);

    expect(screen.getByText("Unnamed passkey")).toBeInTheDocument();
  });

  /* The date is the whole of what tells two keys apart when somebody has
   * named them both after the same laptop. */
  it("says when it was registered", () => {
    draw([passkey()]);

    expect(screen.getByText(/^Registered on .+\.$/)).toBeInTheDocument();
  });

  it("says only that it is registered when the provider would not date it", () => {
    draw([passkey({ CreatedAt: null })]);

    expect(screen.getByText("Registered on this account.")).toBeInTheDocument();
  });

  it("offers Remove, naming the row it was pressed on", () => {
    const { onRemove } = draw([passkey()]);

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(onRemove).toHaveBeenCalledWith(
      expect.objectContaining({ Id: "credential-laptop" }),
    );
  });

  /* One row's own answer being in flight does not take the rest of the card
   * away: the other rows are still readable and still removable. */
  it("leaves the other rows alone while one is in flight", () => {
    draw([passkey(), passkey({ Id: "credential-phone", Label: "iPhone" })], {
      busyId: "credential-laptop",
    });

    const [first, second] = screen.getAllByRole("button", { name: "Remove" });

    expect(first).toBeDisabled();
    expect(second).toBeEnabled();
  });
});

describe("a card with nothing on it", () => {
  /* The assertion this block exists for: most accounts arrive here empty,
   * and an empty card has to read as a card that is working. */
  it("says there are none yet, and what adding one would buy", () => {
    draw([]);

    expect(screen.getByText(/No passkeys yet/)).toBeInTheDocument();
  });

  /* The card says why above this, in an alert. A list that repeated "none
   * yet" underneath would contradict it. */
  it("says nothing at all when the list could not be read", () => {
    draw([], { failed: true });

    expect(screen.queryByText(/No passkeys yet/)).toBeNull();
  });

  it("draws placeholders rather than an answer while it is reading", () => {
    draw([], { loading: true });

    expect(screen.queryByText(/No passkeys yet/)).toBeNull();
  });
});
