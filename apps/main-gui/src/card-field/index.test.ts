import { describe, expect, it } from "vitest";
import * as cardField from "./index";
import { CardField, FieldRow } from "./card-field";

/*
 * The field and the row that labels it. Both are public, because a page that
 * took the field without the row would be deciding for itself where a label
 * goes, and the answer to that is the same on every card in the app.
 *
 * It lived in the profile vertical while the profile was the only page with a
 * form on card paper. The security page has one now.
 */

describe("what the card field offers the rest of the app", () => {
  it("offers the field and the row around it", () => {
    expect(Object.keys(cardField).toSorted()).toEqual([
      "CardField",
      "FieldRow",
    ]);
  });

  it("offers them themselves rather than copies of them", () => {
    expect(cardField.CardField).toBe(CardField);
    expect(cardField.FieldRow).toBe(FieldRow);
  });
});
