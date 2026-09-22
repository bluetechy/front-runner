import { describe, expect, it } from "vitest";
import * as avatar from "./index";
import { InitialsAvatar, initialsOf } from "./initials-avatar";

/*
 * Both the circle and the letters inside it: a caller that only wants the
 * initials -- to put them somewhere that is not a circle -- should not have
 * to render one to get them.
 */

describe("what the avatar offers the rest of the app", () => {
  it("offers the circle and the letters", () => {
    expect(Object.keys(avatar).toSorted()).toEqual([
      "InitialsAvatar",
      "initialsOf",
    ]);
  });

  it("offers them themselves rather than copies of them", () => {
    expect(avatar.InitialsAvatar).toBe(InitialsAvatar);
    expect(avatar.initialsOf).toBe(initialsOf);
  });
});
