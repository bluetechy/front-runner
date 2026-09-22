import { describe, expect, it } from "vitest";
import * as cardSurface from "./index";
import { CardLabel, CardSurface } from "./card-surface";

/*
 * Both the card and the label over it: the sections inside a card carry the
 * same label as the card itself, and drawing one by hand would be a second
 * opinion about what that label looks like.
 */

describe("what the card surface offers the rest of the app", () => {
  it("offers the card and its label", () => {
    expect(Object.keys(cardSurface).toSorted()).toEqual([
      "CardLabel",
      "CardSurface",
    ]);
  });

  it("offers them themselves rather than copies of them", () => {
    expect(cardSurface.CardSurface).toBe(CardSurface);
    expect(cardSurface.CardLabel).toBe(CardLabel);
  });
});
