import { describe, expect, it } from "vitest";
import * as contactUs from "./index";
import { ContactUs } from "./contact-us";

/*
 * One export: the page. The ways to reach us, the form and the seam a message
 * will one day leave through are how this page is built -- a caller that
 * could reach `ways` could print a phone number somewhere this vertical does
 * not know about, and then there would be two of them to keep true.
 */

describe("what contact-us offers the rest of the app", () => {
  it("offers the page, and nothing else", () => {
    expect(Object.keys(contactUs).toSorted()).toEqual(["ContactUs"]);
  });

  it("offers it itself rather than a copy of it", () => {
    expect(contactUs.ContactUs).toBe(ContactUs);
  });
});
