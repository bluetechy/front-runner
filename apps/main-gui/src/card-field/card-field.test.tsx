import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import { CardField, FieldRow } from "./card-field";

/*
 * A form field on card paper.
 *
 * The theme's own field is a pill hollowed out of the dark sign-in panel; on
 * white it would be a white box on a white card. What this component adds is
 * therefore mostly appearance -- but three of its behaviors are not: a field
 * that is loading stands in for itself rather than showing an empty box, an
 * error replaces the hint rather than sitting beside it, and a read-only
 * field is shown without being editable.
 */

const renderIn = (element: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{element}</ThemeProvider>);

describe("the row a field sits in", () => {
  it("labels the control it is given", () => {
    renderIn(
      <FieldRow label="First name" htmlFor="first-name">
        <input id="first-name" />
      </FieldRow>,
    );

    expect(screen.getByLabelText("First name")).toBeInTheDocument();
  });
});

describe("an ordinary field", () => {
  it("shows what is in it, and says when that changes", () => {
    const onChange = vi.fn();
    renderIn(<CardField id="first-name" value="Marcus" onChange={onChange} />);
    const field = screen.getByRole("textbox");

    expect(field).toHaveValue("Marcus");
    fireEvent.change(field, { target: { value: "Marc" } });

    expect(onChange).toHaveBeenCalledWith("Marc");
  });

  it("says what it is for, under it", () => {
    renderIn(
      <CardField
        id="first-name"
        value=""
        onChange={vi.fn()}
        hint="Leave it empty if you would rather not say."
      />,
    );

    expect(
      screen.getByText("Leave it empty if you would rather not say."),
    ).toBeInTheDocument();
  });

  // The shape of what goes in, where the shape is not obvious. It is not a
  // label and never says what the field is.
  it("can show the shape of what goes in it", () => {
    renderIn(
      <CardField
        id="birth-date"
        value=""
        onChange={vi.fn()}
        placeholder="YYYY/MM/DD"
      />,
    );

    expect(screen.getByPlaceholderText("YYYY/MM/DD")).toBeInTheDocument();
  });
});

describe("a field with something wrong in it", () => {
  // The error is the more urgent of the two, and two lines of small print
  // under one field is one line too many.
  it("replaces the hint with the error", () => {
    renderIn(
      <CardField
        id="birth-date"
        value="1990/13/01"
        onChange={vi.fn()}
        hint="Leave it empty if you would rather not say."
        error="Write the date as YYYY/MM/DD"
      />,
    );

    expect(screen.getByText("Write the date as YYYY/MM/DD")).toBeVisible();
    expect(
      screen.queryByText("Leave it empty if you would rather not say."),
    ).toBeNull();
  });

  it("marks the field itself as wrong, not just the line under it", () => {
    renderIn(
      <CardField
        id="birth-date"
        value="1990/13/01"
        onChange={vi.fn()}
        error="Write the date as YYYY/MM/DD"
      />,
    );

    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("a field the page cannot change", () => {
  it("shows the value without letting it be edited", () => {
    renderIn(
      <CardField
        id="email"
        value="member@example.test"
        onChange={vi.fn()}
        readOnly
      />,
    );

    expect(screen.getByRole("textbox")).toHaveAttribute("readonly");
    expect(screen.getByRole("textbox")).toHaveValue("member@example.test");
  });
});

describe("a field that is still waiting for the profile", () => {
  // Standing in for itself rather than showing an empty box somebody might
  // start typing into and lose.
  it("stands in for itself rather than showing an empty box", () => {
    const { container } = renderIn(
      <CardField id="first-name" value="" onChange={vi.fn()} loading />,
    );

    expect(container.querySelector(".MuiSkeleton-root")).not.toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});

describe("a field with a list of answers", () => {
  it("offers exactly those, and reports the value rather than the label", () => {
    const onChange = vi.fn();
    renderIn(
      <CardField
        id="gender"
        value="Not specified"
        onChange={onChange}
        options={[
          { value: "Not specified", label: "Rather not say" },
          { value: "Male", label: "Male" },
          { value: "Female", label: "Female" },
        ]}
      />,
    );

    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Female" }));

    expect(onChange).toHaveBeenCalledWith("Female");
  });
});

describe("a field that takes more than a line", () => {
  it("grows rather than hiding the end of a long answer", () => {
    renderIn(<CardField id="biography" value="" onChange={vi.fn()} rows={4} />);

    expect(screen.getByRole("textbox").tagName).toBe("TEXTAREA");
  });
});

/*
 * A password on card paper, for the change-password card on Security & Access.
 *
 * It is the browser's own password field rather than a text box with the
 * letters hidden by hand, and it carries an autocomplete: that is what a
 * password manager reads to tell one of three password boxes from the next,
 * and what a phone keyboard turns autocorrect off for. Neither is decoration.
 */
describe("a field holding a password", () => {
  it("hides what is typed in it", () => {
    renderIn(
      <FieldRow label="Current password" htmlFor="current">
        <CardField
          id="current"
          type="password"
          value="letmein"
          onChange={() => undefined}
        />
      </FieldRow>,
    );

    expect(screen.getByLabelText("Current password")).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("says which password it is for, where it is told", () => {
    renderIn(
      <FieldRow label="New password" htmlFor="new">
        <CardField
          id="new"
          type="password"
          autoComplete="new-password"
          value=""
          onChange={() => undefined}
        />
      </FieldRow>,
    );

    expect(screen.getByLabelText("New password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
  });

  /* Every other form on card paper wants the browser's ordinary behavior, so
   * a field that was not told says nothing and the browser decides. */
  it("says nothing about it where it is not told", () => {
    renderIn(<CardField id="first-name" value="" onChange={() => undefined} />);

    expect(screen.getByRole("textbox")).not.toHaveAttribute("autocomplete");
  });
});
