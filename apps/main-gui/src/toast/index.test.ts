import { describe, expect, it } from "vitest";
import * as toast from "./index";
import { Toast } from "./toast";

/*
 * One export at runtime: `Notice` and `ToastTone` are types and leave nothing
 * behind, which is why they are not in this list even though the profile page
 * imports both.
 */

describe("what the toast offers the rest of the app", () => {
  it("offers the toast, and nothing else", () => {
    expect(Object.keys(toast).toSorted()).toEqual(["Toast"]);
  });

  it("offers it itself rather than a copy of it", () => {
    expect(toast.Toast).toBe(Toast);
  });
});
