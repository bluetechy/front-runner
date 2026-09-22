import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * Adding a bank account.
 *
 * The mock-up promises a test deposit of under a dollar within three business
 * days. Nothing here does that -- there is no payment processor yet -- so the
 * dialog does not make the promise, and this asserts that it does not.
 *
 * The routing number and the account number are both checked here, against
 * their check digits, which is what catches a typo while the person can still
 * look the number up rather than three days later.
 */

vi.mock("../authentication", () => ({
  useSession: () => ({ identity: { name: "Marcus Member" } }),
}));

const { AddBankDialog } = await import("./add-bank-dialog");

const onSave = vi.fn();
const onClose = vi.fn();

const renderDialog = (open = true) =>
  render(
    <ThemeProvider theme={theme}>
      <AddBankDialog open={open} onClose={onClose} onSave={onSave} />
    </ThemeProvider>,
  );

/* A real ABA routing number, published and widely used for testing. */
const ROUTING = "021000021";

const fillIn = ({
  routing = ROUTING,
  account = "000123456789",
}: { routing?: string; account?: string } = {}) => {
  fireEvent.change(screen.getByLabelText("Routing number"), {
    target: { value: routing },
  });
  fireEvent.change(screen.getByLabelText("Account number"), {
    target: { value: account },
  });
};

beforeEach(() => {
  onSave.mockReset().mockResolvedValue(undefined);
  onClose.mockReset();
});

describe("the dialog", () => {
  it("asks for the four things a transfer needs", () => {
    renderDialog();

    expect(screen.getByLabelText("Name on bank account")).toBeInTheDocument();
    /* The account type is a select, and MUI's does not carry the label
     * through to the control the way an input does -- so it is found here by
     * the label on the panel and by what it is set to. */
    expect(screen.getByText("Account type")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveTextContent("Checking");
    expect(screen.getByLabelText("Routing number")).toBeInTheDocument();
    expect(screen.getByLabelText("Account number")).toBeInTheDocument();
  });

  // A starting point rather than a record: the name on the account is often
  // the person's, and is not always.
  it("starts the name from the session, and lets it be changed", () => {
    renderDialog();
    const name = screen.getByLabelText("Name on bank account");

    expect(name).toHaveValue("Marcus Member");
    fireEvent.change(name, { target: { value: "Northwind Trading" } });
    expect(name).toHaveValue("Northwind Trading");
  });

  // What it will not do. Saying "we will deposit under a dollar within three
  // business days" would be a promise this product cannot keep.
  it("does not promise a verification it cannot make", () => {
    renderDialog();

    expect(screen.getByText(/Nothing verifies the account yet/)).toBeVisible();
    expect(screen.queryByText(/business days/)).toBeNull();
  });
});

describe("what it refuses before asking the API", () => {
  it("refuses a routing number that fails its check digit", async () => {
    renderDialog();
    fillIn({ routing: "021000022" });

    fireEvent.click(screen.getByRole("button", { name: "Save account" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Routing number")).toBeInvalid(),
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses an empty form without calling anything", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Save account" }));

    expect(onSave).not.toHaveBeenCalled();
  });

  // The message has to go as soon as the field is touched, or it reads as
  // complaining about what is being typed now.
  it("clears a field's error as soon as it is edited", async () => {
    renderDialog();
    fillIn({ routing: "1" });
    fireEvent.click(screen.getByRole("button", { name: "Save account" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Routing number")).toBeInvalid(),
    );

    fireEvent.change(screen.getByLabelText("Routing number"), {
      target: { value: ROUTING },
    });

    expect(screen.getByLabelText("Routing number")).not.toBeInvalid();
  });
});

describe("saving", () => {
  it("hands over what the schema parsed, and closes", async () => {
    renderDialog();
    fillIn();

    fireEvent.click(screen.getByRole("button", { name: "Save account" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        NameOnAccount: "Marcus Member",
        AccountType: "Checking",
        RoutingNumber: ROUTING,
        Number: "000123456789",
      }),
    );
  });

  // The API is the authority: if it refused something this form let through,
  // its message is the one worth showing, and the dialog stays open with what
  // was typed still in it.
  it("shows what the API said, and stays open", async () => {
    onSave.mockRejectedValue(new Error("That account is already saved."));
    renderDialog();
    fillIn();

    fireEvent.click(screen.getByRole("button", { name: "Save account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That account is already saved.",
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Account number")).toHaveValue("000123456789");
  });
});

describe("opening it again", () => {
  // Whatever was typed into it last time is gone: a dialog that reopens
  // half-filled is one somebody saves without reading.
  it("starts fresh", () => {
    const { rerender } = renderDialog();
    fillIn({ account: "999888777" });

    rerender(
      <ThemeProvider theme={theme}>
        <AddBankDialog open={false} onClose={onClose} onSave={onSave} />
      </ThemeProvider>,
    );
    rerender(
      <ThemeProvider theme={theme}>
        <AddBankDialog open onClose={onClose} onSave={onSave} />
      </ThemeProvider>,
    );

    expect(screen.getByLabelText("Account number")).toHaveValue("");
  });
});
