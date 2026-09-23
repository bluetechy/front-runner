import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { theme } from "../design-system";
import { EmailList } from "./email-list";
import type { UserEmail } from "./email-api";

/*
 * The addresses on file, as four columns.
 *
 * Two rules carry most of this file. The radio is the primary address and
 * there is exactly one across the table, so choosing one is a save rather than
 * a selection. And an unverified address does not get one: nobody has proved
 * they read it, and a login is not something to hand over on an unproven
 * address.
 */

const onChoosePrimary = vi.fn();
const onRemove = vi.fn();
const onResend = vi.fn();
const onAdd = vi.fn();

const address = (overrides: Partial<UserEmail> = {}): UserEmail => ({
  UserEmailUUID: "e0000000-0000-4000-8000-000000000001",
  Email: "marcus@example.test",
  IsPrimary: true,
  IsVerified: true,
  VerifiedAt: "2026-01-01T00:00:00.000Z",
  CreatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const work = address({
  UserEmailUUID: "e0000000-0000-4000-8000-000000000002",
  Email: "marcus.work@example.test",
  IsPrimary: false,
});

const unverified = address({
  UserEmailUUID: "e0000000-0000-4000-8000-000000000003",
  Email: "marcus.new@example.test",
  IsPrimary: false,
  IsVerified: false,
  VerifiedAt: null,
});

const renderList = (
  props: Partial<React.ComponentProps<typeof EmailList>> = {},
) =>
  render(
    <ThemeProvider theme={theme}>
      <EmailList
        addresses={[address(), work, unverified]}
        loading={false}
        busyId={null}
        adding={false}
        onChoosePrimary={onChoosePrimary}
        onRemove={onRemove}
        onResend={onResend}
        onAdd={onAdd}
        {...props}
      />
    </ThemeProvider>,
  );

beforeEach(() => {
  onChoosePrimary.mockReset();
  onRemove.mockReset();
  onResend.mockReset();
  onAdd.mockReset();
});

describe("the four columns", () => {
  it("heads them Primary, Email, Status and Action", () => {
    renderList();

    for (const column of ["Primary", "Email", "Status", "Action"])
      expect(screen.getByRole("heading", { name: column })).toBeInTheDocument();
  });

  it("writes every address out in full", () => {
    renderList();

    for (const shown of [
      "marcus@example.test",
      "marcus.work@example.test",
      "marcus.new@example.test",
    ])
      expect(screen.getByText(shown)).toBeInTheDocument();
  });

  // The status is a word as well as a color: nothing in this product is said
  // in color alone.
  it("says in words which addresses are verified and which are not", () => {
    renderList();

    expect(screen.getAllByText("Verified")).toHaveLength(2);
    expect(screen.getByText("Unverified")).toBeInTheDocument();
  });

  // Teal for what is settled, the accent's pink for what is still waiting on
  // somebody. Both come off `brand.statusPills`, where the ratios behind them
  // are written down.
  it("writes the two statuses in the two colors the theme keeps for them", () => {
    renderList();
    const pills = theme.palette.brand.statusPills;

    expect(screen.getAllByText("Verified")[0]).toHaveStyle({
      color: pills.settled.ink,
    });
    expect(screen.getByText("Unverified")).toHaveStyle({
      color: pills.waiting.ink,
    });
  });

  // The radio in the Primary column is the only thing that says which address
  // the account signs in with. The pill that used to say it as well was the
  // same word twice, in the column that is about something else.
  it("marks the login with the radio rather than with a pill beside it", () => {
    renderList();

    expect(screen.getAllByText("Primary")).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Primary" }),
    ).toBeInTheDocument();
  });
});

describe("the radio that marks the sign-in address", () => {
  it("is checked on the primary and on nothing else", () => {
    renderList();

    const chosen = screen.getByRole("radio", {
      name: "Sign in with marcus@example.test",
    });
    expect(chosen).toBeChecked();
    expect(
      screen.getByRole("radio", {
        name: "Sign in with marcus.work@example.test",
      }),
    ).not.toBeChecked();
  });

  it("is one group over the whole table, so choosing one clears the other", () => {
    renderList();

    expect(
      screen
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("name"))
        .every((name, _index, names) => name === names[0]),
    ).toBe(true);
  });

  it("reports the address that was chosen rather than changing anything itself", () => {
    renderList();

    fireEvent.click(
      screen.getByRole("radio", {
        name: "Sign in with marcus.work@example.test",
      }),
    );

    expect(onChoosePrimary).toHaveBeenCalledWith(work);
  });

  // The assertion this component exists to make. The database refuses it too,
  // so the missing control is agreeing with the rule rather than being it.
  it("is not drawn at all on an address nobody has verified", () => {
    renderList();

    expect(
      screen.queryByRole("radio", {
        name: "Sign in with marcus.new@example.test",
      }),
    ).toBeNull();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  // Absent rather than disabled, the way the primary row has no Delete. What
  // is missing has to be answerable somewhere else on the row, and it is: the
  // Status column says what the address is and the Action column offers the
  // link that changes it.
  it("leaves that row saying what it is and offering the way out", () => {
    renderList();

    expect(screen.getByText("Unverified")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Send link" })).toHaveLength(
      1,
    );
  });
});

describe("what a row can be asked to do", () => {
  it("offers Delete on an address that is not the login", () => {
    renderList();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove marcus.work@example.test" }),
    );

    expect(onRemove).toHaveBeenCalledWith(work);
  });

  // Whether anybody has read the address has nothing to do with whether it
  // can be given up, so an unverified one carries a Delete like any other.
  it("offers it on every address that is not the login, verified or not", () => {
    renderList();

    for (const shown of ["marcus.work@example.test", "marcus.new@example.test"])
      expect(
        screen.getByRole("button", { name: `Remove ${shown}` }),
      ).toBeInTheDocument();
  });

  // Removing it would leave an account whose login resolves to no address.
  // The button is absent rather than disabled, because there is nothing to do
  // about it here except choose another primary first. A dash stands where it
  // would have been, hidden from a screen reader, which the checked radio on
  // the same row has already answered for.
  it("offers no Delete on the login address, and leaves a dash there", () => {
    renderList();

    expect(
      screen.queryByRole("button", { name: "Remove marcus@example.test" }),
    ).toBeNull();
    expect(screen.getByText("\u2014")).toHaveAttribute("aria-hidden", "true");
  });

  // The word became a glyph, so the name it is reachable by is the only thing
  // left saying what it does: a button with no accessible name is a button
  // nobody who cannot see it can press.
  it("offers another link only where one would do something", () => {
    renderList();

    const links = screen.getAllByRole("button", { name: "Send link" });
    expect(links).toHaveLength(1);

    fireEvent.click(links[0]!);
    expect(onResend).toHaveBeenCalledWith(unverified);
  });
});

describe("the last row, which adds an address", () => {
  it("is a field in the Email column and an Add in the Action column", () => {
    renderList();

    expect(screen.getByLabelText("Add an email address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("reports the address that was typed", () => {
    renderList();

    fireEvent.change(screen.getByLabelText("Add an email address"), {
      target: { value: "marcus.third@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onAdd).toHaveBeenCalledWith("marcus.third@example.test");
  });

  // Refused in the browser rather than by a round trip, so the sentence lands
  // beside the box that caused it.
  it("refuses a typo without asking the API", () => {
    renderList();

    fireEvent.change(screen.getByLabelText("Add an email address"), {
      target: { value: "marcus" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText(/you@example\.com/)).toBeInTheDocument();
  });

  // Leaving the message up while somebody fixes the typo is scolding them for
  // something they are already dealing with.
  it("takes the message away as soon as the field is touched again", () => {
    renderList();
    const field = screen.getByLabelText("Add an email address");

    fireEvent.change(field, { target: { value: "marcus" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(field, { target: { value: "marcus@" } });

    expect(screen.queryByText(/you@example\.com/)).toBeNull();
  });

  it("empties itself once the address has gone", () => {
    renderList();
    const field = screen.getByLabelText("Add an email address");

    fireEvent.change(field, { target: { value: "marcus.third@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(field).toHaveValue("");
  });
});

describe("while something is in flight", () => {
  it("waits rather than saying the account has no addresses", () => {
    renderList({ loading: true, addresses: [] });

    expect(screen.queryByText("marcus@example.test")).toBeNull();
    // The add row stays: there is nothing to wait for to type into it.
    expect(screen.getByLabelText("Add an email address")).toBeInTheDocument();
  });

  // One row goes quiet rather than the whole table, so the rest stays
  // readable while a save runs.
  it("disables only the row that is saving", () => {
    renderList({ busyId: work.UserEmailUUID });

    expect(
      screen.getByRole("radio", {
        name: "Sign in with marcus.work@example.test",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("radio", { name: "Sign in with marcus@example.test" }),
    ).not.toBeDisabled();
  });

  it("disables the add row while an address is being added", () => {
    renderList({ adding: true });

    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
    expect(screen.getByLabelText("Add an email address")).toBeDisabled();
  });
});
