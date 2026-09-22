import { describe, expect, it } from "vitest";
import { theme } from "./theme";

/*
 * The palette, measured.
 *
 * docs/style-guide.md carries a table of contrast ratios and a floor under
 * them -- 4.5:1 for text, 3:1 for something drawn rather than written. This
 * is that table as arithmetic, so a colour taken one step lighter for the
 * look of it fails here rather than in somebody's eyes. The numbers are
 * recomputed from the theme, not copied from the documentation: if the two
 * disagree, the theme is right and the page is stale.
 *
 * A fade is checked at both ends, because the text crosses all of it, and
 * translucent ink is blended against its surface first -- `white at 66%` is
 * not a colour until you know what is behind it.
 */

const channels = (hex: string) =>
  (hex.replace("#", "").match(/../g) ?? []).map((pair) => parseInt(pair, 16));

const linear = (value: number) => {
  const channel = value / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const [red = 0, green = 0, blue = 0] = channels(hex).map(linear);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrast = (one: string, other: string) => {
  const [lighter, darker] = [luminance(one), luminance(other)].toSorted(
    (a, b) => b - a,
  );
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
};

/* `rgba(255, 255, 255, 0.66)` is not a colour until it is laid on something. */
const over = (translucent: string, surface: string) => {
  const [red = 0, green = 0, blue = 0, alpha = 1] = translucent
    .replace(/rgba?\(|\)/g, "")
    .split(",")
    .map((part) => Number(part.trim()));
  const behind = channels(surface);
  const mix = [red, green, blue].map((value, index) =>
    Math.round(value * alpha + (behind[index] ?? 0) * (1 - alpha)),
  );
  return `#${mix.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
};

/* The two ends of a `linear-gradient(...)`, whatever angle it is set at. */
const endsOf = (gradient: string) => {
  const stops = gradient.match(/#[0-9a-f]{6}/gi) ?? [];
  expect(stops.length).toBeGreaterThanOrEqual(2);
  return [stops[0] as string, stops.at(-1) as string];
};

const brand = theme.palette.brand;
const white = "#ffffff";

const TEXT = 4.5;
const DRAWN = 3;

describe("the chrome, which is black", () => {
  it("is one colour in both of its pieces", () => {
    expect(brand.chrome).toBe("#000000");
    expect(brand.chromeRail).toBe(brand.chrome);
  });

  it("carries white at the top of the scale", () => {
    expect(contrast(brand.chromeInk, brand.chrome)).toBeCloseTo(21, 0);
  });

  it("carries its quieter label well clear of the floor", () => {
    expect(
      contrast(over(brand.chromeLabel, brand.chrome), brand.chrome),
    ).toBeGreaterThanOrEqual(TEXT);
  });

  // Black and the field's violet are close enough in weight to run together,
  // so the hairline between them is load-bearing rather than decorative.
  it("is separated from the field by a hairline, because the two are not", () => {
    const field = "#2a0847";

    expect(contrast(brand.chrome, field)).toBeLessThan(DRAWN);
    expect(brand.chromeEdge).toMatch(/^rgba\(255, 255, 255/);
  });
});

describe("the page you are on", () => {
  // A nav item is written at 0.92rem, which needs the text floor rather than
  // the large-text one. This is why the pill's fade is not the button's.
  it("is written in white across the whole of its fade", () => {
    for (const end of endsOf(brand.chromeSelected))
      expect(contrast(brand.chromeSelectedInk, end)).toBeGreaterThanOrEqual(
        TEXT,
      );
  });

  it("reads as a shape against the chrome, at both ends", () => {
    for (const end of endsOf(brand.chromeSelected))
      expect(contrast(end, brand.chrome)).toBeGreaterThanOrEqual(DRAWN);
  });
});

describe("the accent", () => {
  it("is one fade, and the button is the thing wearing it", () => {
    expect(brand.buttonGradient).toMatch(/^linear-gradient/);
    expect(endsOf(brand.buttonGradient)).toHaveLength(2);
  });

  it("carries a white label across the whole of it", () => {
    for (const end of endsOf(brand.buttonGradient))
      expect(contrast(white, end)).toBeGreaterThanOrEqual(DRAWN);
  });
});

describe("the logo's own fade", () => {
  // Not the accent's: a logo is read rather than pressed, so it is a lighter
  // pair -- which has to clear the text floor on both surfaces it is drawn on.
  it("is readable on the chrome, at both ends", () => {
    for (const end of endsOf(brand.logoGradient))
      expect(contrast(end, brand.chrome)).toBeGreaterThanOrEqual(TEXT);
  });

  it("is readable on the field, at both ends", () => {
    const field = "#2a0847";

    for (const end of endsOf(brand.logoGradient))
      expect(contrast(end, field)).toBeGreaterThanOrEqual(TEXT);
  });

  it("gives the mark the fade's magenta end, so the two are one lockup", () => {
    expect(brand.logoMark).toBe(endsOf(brand.logoGradient)[0]);
  });
});

describe("a face", () => {
  // White initials, and the fade is drawn between two steps of the same hue
  // rather than the hue itself, so the letters clear the floor everywhere
  // between the two ends as well as at them.
  it("carries white initials across the whole of its fade", () => {
    for (const end of endsOf(brand.avatarGradient))
      expect(contrast(white, end)).toBeGreaterThanOrEqual(TEXT);
  });
});

describe("the toast a page throws", () => {
  it.each([
    ["the one that says it was done", "toastSuccess"] as const,
    ["the one that says it was not", "toastFailure"] as const,
  ])("writes %s in white, above the floor", (_which, token) => {
    expect(contrast(white, brand[token])).toBeGreaterThanOrEqual(TEXT);
  });

  // Teal is not a second accent and the pink is not the accent being spent:
  // a toast says what happened rather than offering anything.
  //
  // These two are deliberately the same weight -- 1.02:1 apart -- because
  // both carry white at the same 4.7:1 and 4.8:1. They are told apart by hue
  // and, more to the point, by the icon and the sentence in them: nothing in
  // this product is said in colour alone. See toast.test.tsx, which asserts
  // the icon, and docs/style-guide.md.
  it("separates its two toasts by hue rather than by weight", () => {
    expect(brand.toastSuccess).not.toBe(brand.toastFailure);
    expect(contrast(brand.toastSuccess, brand.toastFailure)).toBeLessThan(1.5);

    const [successRed = 0, , successBlue = 0] = channels(brand.toastSuccess);
    const [failureRed = 0, , failureBlue = 0] = channels(brand.toastFailure);

    expect(successRed).toBeLessThan(failureRed);
    expect(successBlue).toBeGreaterThan(failureBlue);
  });
});

describe("card paper", () => {
  it("is white, and takes its ink at the top of the scale", () => {
    expect(brand.card).toBe("#ffffff");
    expect(contrast(brand.cardInk, brand.card)).toBeGreaterThanOrEqual(TEXT);
  });

  it("keeps its quieter ink above the floor as well", () => {
    expect(contrast(brand.cardInkMuted, brand.card)).toBeGreaterThanOrEqual(
      TEXT,
    );
  });
});

describe("what a notification is about", () => {
  // Named for the subject rather than the colour, so a tint can be repainted
  // without renaming it -- and so nothing in this product is said in colour
  // alone: each of these carries an icon too.
  it("has a tint for each kind, none of them named for its colour", () => {
    expect(Object.keys(brand.noticeTints).toSorted()).toEqual([
      "alert",
      "commerce",
      "general",
      "message",
      "people",
      "reward",
      "task",
    ]);
  });

  it("draws each tint's disc so it can be seen on card paper", () => {
    for (const tint of Object.values(brand.noticeTints))
      expect(contrast(tint, brand.card)).toBeGreaterThanOrEqual(DRAWN);
  });
});

describe("the charts", () => {
  // Three, assigned in order and never cycled. A fourth series is not a
  // fourth hue, it is a different chart.
  it("has three series, all different", () => {
    expect(brand.chartSeries).toHaveLength(3);
    expect(new Set(brand.chartSeries).size).toBe(3);
  });
});

describe("the type", () => {
  it("sets headings, buttons and the logo in the display face", () => {
    expect(theme.typography.h1.fontFamily).toContain("Playfair Display");
    expect(theme.typography.button.fontFamily).toContain("Playfair Display");
  });

  // Material tracks buttons wide and upper-cases them; the mock-up does
  // neither.
  it("leaves buttons in sentence case, tracked normally", () => {
    expect(theme.typography.button.textTransform).toBe("none");
    expect(theme.typography.button.letterSpacing).toBe("normal");
  });

  it("sizes its headings against the viewport rather than a breakpoint", () => {
    expect(String(theme.typography.h1.fontSize)).toContain("clamp(");
  });
});
