import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theme } from "../design-system";
import { Faq } from "./faq";

/*
 * The questions somebody asks between reading the prices and signing up.
 *
 * All closed to begin with, so the page ends short rather than in a wall of
 * prose -- which is the one behaviour here worth holding on to, along with
 * each question being a control somebody can reach rather than a heading
 * that happens to expand.
 *
 * The answers are copy, not policy: nothing bills yet, and each one has to be
 * checked against the real terms before this page meets a paying customer.
 * See docs/pricing-page.md.
 */

const renderFaq = () =>
  render(
    <ThemeProvider theme={theme}>
      <Faq />
    </ThemeProvider>,
  );

describe("the questions", () => {
  it("asks more than a couple, each one a control", () => {
    renderFaq();

    const questions = screen.getAllByRole("button");
    expect(questions.length).toBeGreaterThan(5);
  });

  it("asks the ones somebody about to pay actually asks", () => {
    renderFaq();

    for (const question of [
      /credit card to start/i,
      /counts as a member/i,
      /change plans later/i,
      /paying yearly/i,
      /refunds/i,
    ])
      expect(screen.getByRole("button", { name: question })).toBeVisible();
  });
});

describe("the answers", () => {
  // A wall of prose is what this shape avoids: the page ends shortly after
  // the prices unless somebody asks for more.
  it("keeps every one of them folded away to begin with", () => {
    renderFaq();

    for (const question of screen.getAllByRole("button"))
      expect(question).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the one that was asked", () => {
    renderFaq();
    const question = screen.getByRole("button", {
      name: /credit card to start/i,
    });

    fireEvent.click(question);

    expect(question).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(/Free is free for as long as you want it/),
    ).toBeVisible();
  });

  // Independent panels rather than one accordion: somebody comparing two
  // answers should not have to keep re-opening the first.
  it("leaves an open answer open when another is asked", () => {
    renderFaq();
    const first = screen.getByRole("button", { name: /credit card to start/i });
    const second = screen.getByRole("button", { name: /counts as a member/i });

    fireEvent.click(first);
    fireEvent.click(second);

    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(second).toHaveAttribute("aria-expanded", "true");
  });

  // The page above says a year costs a fifth less; the answer down here has
  // to say the same number.
  it("says the same discount the cards do", () => {
    renderFaq();

    fireEvent.click(screen.getByRole("button", { name: /paying yearly/i }));

    expect(screen.getByText(/20% less/)).toBeVisible();
  });
});
