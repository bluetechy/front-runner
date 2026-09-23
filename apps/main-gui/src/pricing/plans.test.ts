import { describe, expect, it } from "vitest";
import {
  ANNUAL_DISCOUNT,
  amountOf,
  annualTotal,
  audiences,
  CONTACT_BUTTON,
  money,
  monthlyRate,
  percentOff,
  START_BUTTON,
  type Plan,
} from "./plans";

/*
 * What each plan costs and what it opens up.
 *
 * The arithmetic is the part worth pinning: the discount is one number, and
 * the monthly rate, the annual total and the sentence saying how much is
 * saved all come out of it. Three places computing a fifth off separately is
 * how a page ends up advertising two different prices.
 */

const plans = audiences.flatMap((audience) => audience.plans);
const priced = plans.filter(
  (plan): plan is Plan & { monthlyPrice: number } => plan.monthlyPrice !== null,
);

describe("the plans on offer", () => {
  it("offers two audiences, each with plans under it", () => {
    expect(audiences).toHaveLength(2);
    for (const audience of audiences)
      expect(audience.plans.length).toBeGreaterThan(0);
  });

  it("gives every plan a name, a tagline and a list", () => {
    for (const plan of plans) {
      expect(plan.name).not.toBe("");
      expect(plan.tagline).not.toBe("");
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  // The words on a button are not a plan's to choose: there are two of them
  // for the whole page, and which one a card wears is decided by whether the
  // plan can be started at all.
  it("keeps the two buttons off the plans themselves", () => {
    expect(START_BUTTON).not.toBe("");
    expect(CONTACT_BUTTON).not.toBe("");
    expect(plans).not.toContainEqual(
      expect.objectContaining({ callToAction: expect.anything() }),
    );
  });

  it("gives every plan an id of its own", () => {
    expect(new Set(plans.map((plan) => plan.id)).size).toBe(plans.length);
  });

  // At most one card per audience is drawn forward. Two of them means
  // neither is.
  it("draws at most one plan forward in each audience", () => {
    for (const audience of audiences)
      expect(audience.plans.filter((plan) => plan.featured)).toHaveLength(1);
  });

  // A plan that starts from another names it, so the card can say
  // "everything in Standard, and" rather than repeating eight lines.
  it("names the plan each one starts from, where there is one", () => {
    const names = new Set(plans.map((plan) => plan.name));

    for (const plan of plans)
      if (plan.inherits) expect(names).toContain(plan.inherits);
  });

  // Enterprise is the one plan you cannot start on your own, and it is also
  // the one with no price -- those two go together.
  it("gives a price to every plan but the one you have to ask about", () => {
    for (const plan of plans)
      expect(plan.monthlyPrice === null).toBe(plan.contactSales === true);
  });
});

describe("what a plan costs", () => {
  it("charges the monthly price when it is billed monthly", () => {
    expect(monthlyRate(19, "monthly")).toBe(19);
  });

  it("takes the discount off when it is billed for a year", () => {
    expect(monthlyRate(19, "annual")).toBe(15.2);
    expect(monthlyRate(19, "annual")).toBe(
      Math.round(19 * (1 - ANNUAL_DISCOUNT) * 100) / 100,
    );
  });

  // Twelve of the discounted month, and rounded again afterwards: twelve
  // times 15.2 is 182.39999999999998 in binary floating point, and a page
  // advertising that is a page nobody trusts.
  it("charges a year as twelve of the discounted months, to the cent", () => {
    expect(annualTotal(19)).toBe(182.4);
    expect(annualTotal(19)).toBeCloseTo(monthlyRate(19, "annual") * 12, 10);
    expect(String(annualTotal(19))).toBe("182.4");
  });

  it("leaves a free plan free, however it is billed", () => {
    expect(monthlyRate(0, "annual")).toBe(0);
    expect(annualTotal(0)).toBe(0);
  });

  // Every price on the page comes from the one discount, so a change to it
  // moves the cards, the totals and the sentence together.
  it("says the discount out loud as the same number it applies", () => {
    expect(percentOff).toBe("20%");

    for (const plan of priced)
      expect(monthlyRate(plan.monthlyPrice, "annual")).toBeLessThanOrEqual(
        plan.monthlyPrice,
      );
  });

  it("rounds to the cent rather than leaving a fraction of one", () => {
    expect(monthlyRate(29, "annual")).toBe(23.2);
    expect(annualTotal(29)).toBe(278.4);
  });
});

describe("how a price is written", () => {
  // The big price on a card sets its dollar sign as a separate, smaller span,
  // which is why the figure and the sign are two functions.
  it("drops the cents when there are none", () => {
    expect(amountOf(19)).toBe("19");
    expect(money(19)).toBe("$19");
  });

  it("keeps both cents when there are any", () => {
    expect(amountOf(15.2)).toBe("15.20");
    expect(money(15.2)).toBe("$15.20");
  });

  it("writes nothing as nothing rather than as an empty string", () => {
    expect(amountOf(0)).toBe("0");
    expect(money(0)).toBe("$0");
  });
});
