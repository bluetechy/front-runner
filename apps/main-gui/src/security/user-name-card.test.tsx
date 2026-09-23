import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theme } from "../design-system";
import { UserNameCard } from "./user-name-card";

/*
 * The user name, at the top of the security page.
 *
 * It is drawn as a field and it is not one: nothing in this application
 * writes a user name back, so the two things worth pinning are that it shows
 * what Keycloak said and that it refuses a keystroke. The copy is pinned for
 * the same reason the privacy card's is: a field somebody can click into and
 * type nothing in has to have said why first.
 */

const renderCard = (userName = "jdoe") =>
  render(
    <ThemeProvider theme={theme}>
      <UserNameCard userName={userName} />
    </ThemeProvider>,
  );

describe("the user handle", () => {
  it("is headed as its own section", () => {
    renderCard();

    expect(
      screen.getByRole("heading", { name: "User Name" }),
    ).toBeInTheDocument();
  });

  it("shows the name the account signs in with", () => {
    renderCard("jdoe");

    expect(screen.getByLabelText("User name")).toHaveValue("jdoe");
  });

  // The field is a field so that the value sits in the same kind of box the
  // addresses under it do. What it must never be is editable: there is
  // nowhere for a typed value to go.
  it("looks like a field and will not take a keystroke", () => {
    renderCard("jdoe");

    const field = screen.getByLabelText("User name");
    expect(field).toHaveAttribute("readonly");

    fireEvent.change(field, { target: { value: "someone-else" } });
    expect(field).toHaveValue("jdoe");
  });

  // Somebody who can click into the box has to have been told already, rather
  // than finding out by typing into it and watching nothing happen.
  it("says the name was set at sign-up and does not change", () => {
    renderCard();

    const copy = screen.getByText(/set when you signed up/i);
    expect(copy.textContent).toMatch(/stays with the account for good/i);
    expect(copy.textContent).toMatch(/read rather than changed/i);
  });

  // The realm allows either, and only the primary address: Keycloak holds one
  // per account. Saying "your email address" would be an invitation to try
  // one of the others and be refused.
  it("says the name and the primary email address are the two ways in", () => {
    renderCard();

    expect(
      screen.getByText(
        /login with it or with the email address marked primary/i,
      ),
    ).toBeInTheDocument();
  });

  // "Address" alone is a street on the profile page. Every one of these is an
  // email address and the copy says so each time.
  it("says email address rather than address", () => {
    renderCard();

    const copy = screen.getByText(/set when you signed up/i).textContent ?? "";
    expect(copy).toMatch(/email address marked primary/i);
    expect(copy).toMatch(/email addresses can come and go/i);
    expect(copy.match(/(?<!email )addresses?\b/gi)).toBeNull();
  });

  // It is not a private label. Other members see it, and it is what they type
  // to flag somebody, which is the other half of why it cannot move.
  it("says other members see it and use it to flag you", () => {
    renderCard();

    const copy = screen.getByText(/set when you signed up/i);
    expect(copy.textContent).toMatch(/other members/i);
    expect(copy.textContent).toMatch(/flag you/i);
  });

  // Shown rather than described: "@" in front of the name is the whole
  // convention. The example stands for the shape of a mention, so it is
  // `@username` whoever is reading it, and the field under it is where this
  // account's own name is.
  it("shows the mention written out, as @username", () => {
    renderCard("jdoe");

    const copy = screen.getByText(/set when you signed up/i);
    expect(copy.textContent).toMatch(/as in @username/);
    expect(copy.textContent).not.toMatch(/@jdoe/);
  });

  // An account is always signed in by the time this page renders, but the
  // token arrives a moment after the first paint. An empty box is what a
  // field with nothing in it looks like; "undefined" is not.
  it("shows an empty field rather than a word, before the token lands", () => {
    renderCard("");

    expect(screen.getByLabelText("User name")).toHaveValue("");
  });
});
