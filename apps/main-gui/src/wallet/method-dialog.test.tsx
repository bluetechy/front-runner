import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import { DialogField, MethodDialog } from "./method-dialog";

/*
 * The shell both "add" dialogs sit in, and the field they are both built
 * from.
 *
 * Both dialogs are forms: Enter submits, Escape closes, and neither does
 * anything while a save is in flight. That last part is what most of this
 * file is about -- a payment method saved twice because somebody pressed the
 * button twice is a payment method somebody has to delete.
 */

const renderDialog = (
  props: Partial<React.ComponentProps<typeof MethodDialog>> = {},
) => {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <MethodDialog
        open
        onClose={onClose}
        title="Add a card"
        busy={false}
        submitLabel="Save card"
        onSubmit={onSubmit}
        {...props}
      >
        <p>The fields</p>
      </MethodDialog>
    </ThemeProvider>,
  );
  return { onClose, onSubmit };
};

describe("the shell", () => {
  it("is titled, and names itself to a screen reader", () => {
    renderDialog();

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Add a card");
  });

  it("holds whatever fields it was given", () => {
    renderDialog();

    expect(screen.getByText("The fields")).toBeInTheDocument();
  });

  // What this will do, or what it will not: both dialogs use it to avoid
  // promising something this product cannot yet keep.
  it("can say a line under the heading", () => {
    renderDialog({ note: "Nothing verifies the account yet." });

    expect(
      screen.getByText("Nothing verifies the account yet."),
    ).toBeInTheDocument();
  });

  it("shows what the API said when it refused", () => {
    renderDialog({ error: "That card was refused." });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "That card was refused.",
    );
  });

  it("says nothing where there is nothing wrong", () => {
    renderDialog();

    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("submitting", () => {
  it("submits from the button", () => {
    const { onSubmit } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Save card" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  // It is a form, so Enter in any field is a submit -- and the default
  // action, which would reload the page, has to be stopped.
  it("submits on Enter without reloading the page", () => {
    const { onSubmit } = renderDialog();
    const form = screen.getByRole("dialog").querySelector("form");

    const submitted = fireEvent.submit(form as HTMLFormElement);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(submitted).toBe(false);
  });

  it("closes from Cancel, and from the corner", () => {
    const { onClose } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("while a save is in flight", () => {
  // A payment method saved twice is one somebody has to delete.
  it("says so, and will not submit again", () => {
    const { onSubmit } = renderDialog({ busy: true });
    const button = screen.getByRole("button", { name: /Saving…/ });

    expect(button).toBeDisabled();
    fireEvent.submit(
      screen.getByRole("dialog").querySelector("form") as HTMLFormElement,
    );

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("cannot be closed from anywhere", () => {
    const { onClose } = renderDialog({ busy: true });

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

const renderField = (
  props: Partial<React.ComponentProps<typeof DialogField>> = {},
) => {
  const onChange = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <DialogField
        label="Routing number"
        value=""
        onChange={onChange}
        {...props}
      />
    </ThemeProvider>,
  );
  return { onChange };
};

describe("a field on the panel", () => {
  it("is labeled, and says when what is in it changes", () => {
    const { onChange } = renderField();

    fireEvent.change(screen.getByLabelText("Routing number"), {
      target: { value: "021000021" },
    });

    expect(onChange).toHaveBeenCalledWith("021000021");
  });

  it("says what the field is for", () => {
    renderField({ hint: "Nine digits, printed to the left of the account." });

    expect(
      screen.getByText("Nine digits, printed to the left of the account."),
    ).toBeInTheDocument();
  });

  // The error is the more urgent of the two, and two lines of small print
  // under one field is one line too many.
  it("replaces the hint with an error, and marks the field wrong", () => {
    renderField({
      hint: "Nine digits.",
      error: "That is not a routing number.",
    });

    expect(screen.getByText("That is not a routing number.")).toBeVisible();
    expect(screen.queryByText("Nine digits.")).toBeNull();
    expect(screen.getByLabelText("Routing number")).toBeInvalid();
  });

  it("offers exactly the answers it was given, where there is a list", () => {
    renderField({
      label: "Account type",
      value: "Checking",
      options: ["Checking", "Savings"],
    });

    fireEvent.mouseDown(screen.getByRole("combobox"));

    expect(screen.getAllByRole("option").map((one) => one.textContent)).toEqual(
      ["Checking", "Savings"],
    );
  });

  // A number field on a phone should bring up a number pad, and a field with
  // a maximum should not let more than that be typed into it.
  it("asks for the keyboard and the length the value needs", () => {
    renderField({ inputMode: "numeric", maxLength: 11 });
    const field = screen.getByLabelText("Routing number");

    expect(field).toHaveAttribute("inputmode", "numeric");
    expect(field).toHaveAttribute("maxlength", "11");
  });
});
