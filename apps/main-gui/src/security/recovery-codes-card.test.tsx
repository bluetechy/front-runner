import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import { RecoveryCodesCard } from "./recovery-codes-card";
import type { RecoveryCodeStatus } from "./two-factor-api";

/*
 * RECOVERY CODES, which is a count and a button.
 *
 * What is worth asserting is when it raises its voice. An account with a
 * second factor and no codes behind it is one lost phone away from being
 * locked out for good, and the card is the only thing in the product that
 * knows. An account with no second factor is in no danger at all, and the
 * same warning there would be noise that teaches people to ignore it.
 */

const status = (
  overrides: Partial<RecoveryCodeStatus> = {},
): RecoveryCodeStatus => ({
  Remaining: 0,
  Total: 0,
  GeneratedAt: null,
  ...overrides,
});

const draw = (
  codes: RecoveryCodeStatus,
  { hasSecondFactor = true, busy = false, loading = false } = {},
) => {
  const onGenerate = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <RecoveryCodesCard
        status={codes}
        loading={loading}
        busy={busy}
        hasSecondFactor={hasSecondFactor}
        onGenerate={onGenerate}
      />
    </ThemeProvider>,
  );
  return { onGenerate };
};

describe("what the card says about the codes", () => {
  it("says an account has none yet rather than showing it zeros", () => {
    draw(status());

    expect(screen.getByText(/have not made any recovery codes/)).toBeVisible();
  });

  it("counts what is left out of what was made, and dates it", () => {
    draw(
      status({
        Remaining: 4,
        Total: 10,
        GeneratedAt: "2026-09-01T10:00:00.000Z",
      }),
    );

    expect(screen.getByText(/4 codes left of 10, made on/)).toBeVisible();
  });

  it("writes one left as a sentence rather than as 1 code(s)", () => {
    draw(status({ Remaining: 1, Total: 10 }));

    expect(screen.getByText(/1 code left of 10/)).toBeVisible();
  });
});

describe("when it raises its voice", () => {
  /* The account this card exists for: a factor in front of the password and
   * nothing at all behind it. */
  it("warns an account that has a factor and no codes", () => {
    draw(status(), { hasSecondFactor: true });

    expect(screen.getByRole("alert")).toHaveTextContent(
      /nothing here can let you back in/,
    );
  });

  it("warns when the set is nearly spent", () => {
    draw(status({ Remaining: 2, Total: 10 }), { hasSecondFactor: true });

    expect(screen.getByRole("alert")).toHaveTextContent(/2 codes left/);
  });

  it("says nothing loud about a set with plenty left", () => {
    draw(status({ Remaining: 9, Total: 10 }));

    expect(screen.queryByRole("alert")).toBeNull();
  });

  /* Nothing is asking for a second factor, so nothing can lock this account
   * out. A warning here would be the card crying wolf. */
  it("says nothing loud when there is no second factor to lose", () => {
    draw(status(), { hasSecondFactor: false });

    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("making a set", () => {
  it("offers to make the first set", () => {
    const { onGenerate } = draw(status());

    fireEvent.click(
      screen.getByRole("button", { name: /Make recovery codes/ }),
    );

    expect(onGenerate).toHaveBeenCalled();
  });

  // The words change once there is a set, because making another one stops
  // the first working and the button should say which it is doing.
  it("offers a new set once there is one", () => {
    draw(status({ Remaining: 10, Total: 10 }));

    expect(
      screen.getByRole("button", { name: /Make a new set/ }),
    ).toBeInTheDocument();
  });

  it("holds the button while one is being made", () => {
    draw(status(), { busy: true });

    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("before anything has been read", () => {
  it("draws neither a count nor a warning", () => {
    draw(status(), { loading: true, hasSecondFactor: true });

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
