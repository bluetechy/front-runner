import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * Adding a card.
 *
 * The expiry is one field here and two everywhere else: a card prints MM/YY,
 * and the API takes a month and a whole year. Turning one into the other
 * happens here, once, and this is where that is pinned -- including what
 * happens to an expiry that cannot be read at all.
 *
 * The security code is collected because a card cannot be authorised without
 * one, and is never stored: the dialog says so, and the API drops it.
 */

vi.mock("../authentication", () => ({
  useSession: () => ({ identity: { name: "Marcus Member" } }),
}));

/* The street the dialog starts from is the one on the profile -- a starting
 * point rather than a record, since a card is billed wherever its statement
 * goes and that is frequently not where the person lives. */
vi.mock("../profile", () => ({
  useProfile: () => ({ profile: { Address: "1 Profile Street" } }),
}));

const { AddCardDialog } = await import("./add-card-dialog");

const onSave = vi.fn();
const onClose = vi.fn();

/* Far enough out that this file does not start failing on a date. */
const nextYear = new Date().getFullYear() + 2;
const shortYear = String(nextYear).slice(2);

const renderDialog = (open = true) =>
  render(
    <ThemeProvider theme={theme}>
      <AddCardDialog open={open} onClose={onClose} onSave={onSave} />
    </ThemeProvider>,
  );

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

/* A published Visa test number: it passes Luhn and belongs to nobody. */
const NUMBER = "4111 1111 1111 1111";

const fillIn = (expiry = `04/${shortYear}`) => {
  type("Card number", NUMBER);
  type("Expires", expiry);
  type("Security code", "123");
  type("Street address", "2896 S 9150 W");
  type("City", "Magna");
  type("State or region", "UT");
  type("Postal code", "84044");
  type("Country", "United States");
};

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Save card" }));

beforeEach(() => {
  onSave.mockReset().mockResolvedValue(undefined);
  onClose.mockReset();
});

describe("the dialog", () => {
  it("asks for the card, the expiry, the code and where it is billed", () => {
    renderDialog();

    for (const label of [
      "Card number",
      "Expires",
      "Security code",
      "Name on card",
      "Street address",
      "City",
      "State or region",
      "Postal code",
      "Country",
    ])
      expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  it("starts the name from the session and the street from the profile", () => {
    renderDialog();

    expect(screen.getByLabelText("Name on card")).toHaveValue("Marcus Member");
    expect(screen.getByLabelText("Street address")).toHaveValue(
      "1 Profile Street",
    );
  });

  // Collected because a card cannot be authorised without one, and never
  // stored -- dbo.CreditCards has no column for it.
  it("says the security code is not kept", () => {
    renderDialog();

    expect(screen.getByText(/never stored/)).toBeVisible();
  });

  it("shows the expiry as a card prints it", () => {
    renderDialog();

    expect(screen.getByPlaceholderText("MM/YY")).toBeInTheDocument();
  });
});

describe("the expiry", () => {
  // One field here, two on the wire. A card prints two digits of year, and
  // turning those into 2029 happens once rather than in three places.
  it("is sent as a month and a whole year", async () => {
    renderDialog();
    fillIn();

    save();

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({
      ExpirationMonth: 4,
      ExpirationYear: nextYear,
    });
  });

  it.each([["13/30"], ["not a date"], ["04"], ["  "]])(
    "refuses %s rather than sending a number it invented",
    async (expiry) => {
      renderDialog();
      fillIn(expiry);

      save();

      await waitFor(() =>
        expect(screen.getByLabelText("Expires")).toBeInvalid(),
      );
      expect(onSave).not.toHaveBeenCalled();
    },
  );

  // The schema knows two expiry fields and the form has one, so whatever
  // either of them said has to end up under the field that was typed into.
  it("shows the schema's complaint under the one field there is", async () => {
    renderDialog();
    fillIn("01/20");

    save();

    await waitFor(() => expect(screen.getByLabelText("Expires")).toBeInvalid());
  });
});

describe("the card number", () => {
  it("is sent without the separators it was typed with", async () => {
    renderDialog();
    fillIn();

    save();

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0].Number).toBe("4111111111111111");
  });

  // A mistyped digit caught here is a mistyped digit nobody has to explain to
  // a payment processor.
  it("refuses a number that fails its check digit", async () => {
    renderDialog();
    fillIn();
    type("Card number", "4111 1111 1111 1112");

    save();

    await waitFor(() =>
      expect(screen.getByLabelText("Card number")).toBeInvalid(),
    );
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("saving", () => {
  it("closes once the card is saved", async () => {
    renderDialog();
    fillIn();

    save();

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  // The API is the authority: if it refused something this form let through,
  // its message is the one worth showing.
  it("shows what the API said, and stays open", async () => {
    onSave.mockRejectedValue(new Error("That card is already saved."));
    renderDialog();
    fillIn();

    save();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That card is already saved.",
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("opening it again", () => {
  // A dialog that reopens holding somebody's card number is a dialog that
  // saves the wrong card.
  it("starts fresh", () => {
    const { rerender } = renderDialog();
    fillIn();

    for (const open of [false, true])
      rerender(
        <ThemeProvider theme={theme}>
          <AddCardDialog open={open} onClose={onClose} onSave={onSave} />
        </ThemeProvider>,
      );

    expect(screen.getByLabelText("Card number")).toHaveValue("");
    expect(screen.getByLabelText("Security code")).toHaveValue("");
  });
});
