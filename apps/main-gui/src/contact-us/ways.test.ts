import { describe, expect, it } from "vitest";
import { ways } from "./ways";

/*
 * The three ways to reach us. What is asserted here is not the data -- the
 * number, the street and the mailbox are invented and will all be replaced --
 * but the two things that have to stay true whatever they are replaced with:
 * every way says what it is and when it is answered, and a way that is a link
 * links to the thing printed above the link.
 *
 * That second one is the bug worth catching. A `tel:` or a `mailto:` that has
 * drifted from the line beside it is invisible on the page and wrong for
 * everybody who presses it rather than reads it.
 */

const digits = (value: string) => value.replace(/\D/g, "");

describe("the ways to reach us", () => {
  // The order is the order they are read in, so it is part of the page.
  it("offers a number, a place and a mailbox, in that order", () => {
    expect(ways.map((way) => way.id)).toEqual(["phone", "address", "email"]);
  });

  it("says what each one is, what it is, and when it is answered", () => {
    for (const way of ways) {
      expect(way.heading).not.toBe("");
      expect(way.lines.length).toBeGreaterThan(0);
      expect(way.note).not.toBe("");
    }
  });

  // The address is a place. Pressing it would go to whichever map the
  // browser guessed at, which is a worse answer than the street itself.
  it("leaves the address as something to read rather than press", () => {
    expect(ways[1].href).toBeUndefined();
  });

  it("dials the number that is printed", () => {
    const [phone] = ways;

    expect(phone.href).toMatch(/^tel:/);
    expect(digits(phone.href!)).toBe(digits(phone.lines[0]!));
  });

  it("writes to the address that is printed", () => {
    const [, , email] = ways;

    expect(email.href).toBe(`mailto:${email.lines[0]}`);
  });
});
