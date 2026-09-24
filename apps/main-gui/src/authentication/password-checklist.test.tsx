import { ThemeProvider } from "@mui/material/styles";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theme } from "../design-system";
import { PasswordChecklist } from "./password-checklist";

/*
 * The rules a password has to keep, drawn.
 *
 * What matters here is what somebody who cannot see it is told. Nothing in
 * this product is said in color alone, so a met rule has to say it is met in
 * words as well as in a tick and in fuller ink: read aloud, this is five
 * requirements and the ones that are done say so.
 */

const renderIn = (password: string) =>
  render(
    <ThemeProvider theme={theme}>
      <PasswordChecklist password={password} />
    </ThemeProvider>,
  );

const lines = () => within(screen.getByRole("list")).getAllByRole("listitem");

describe("the list", () => {
  it("names itself, so it is not five sentences from nowhere", () => {
    renderIn("");

    expect(
      screen.getByRole("list", { name: "What a password needs" }),
    ).toBeInTheDocument();
  });

  /* Standing there before anybody types is what makes it a set of
   * instructions rather than a telling-off. */
  it("shows every rule against an empty box", () => {
    renderIn("");

    expect(lines()).toHaveLength(5);
    expect(screen.getByText("At least 12 characters")).toBeInTheDocument();
  });
});

describe("what it says about a rule that is met", () => {
  // The assertion this file exists for.
  it("says done in words, not only in a tick and a color", () => {
    renderIn("Trombone");

    const met = lines().filter((line) =>
      /\(done\)/.test(line.textContent ?? ""),
    );

    expect(met.map((line) => line.textContent)).toEqual([
      "A capital letter (done)",
      "A lower case letter (done)",
    ]);
  });

  it("says it of all five once the password keeps them all", () => {
    renderIn("Trombone-42-Fig");

    expect(
      lines().filter((line) => /\(done\)/.test(line.textContent ?? "")),
    ).toHaveLength(5);
  });

  it("says nothing of the kind about one that is not met", () => {
    renderIn("");

    expect(screen.queryByText(/done/)).toBeNull();
  });
});
