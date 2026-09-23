import { describe, expect, it } from "vitest";
import { MAILBOX, UPDATED, sections } from "./sections";

/*
 * The policy itself.
 *
 * The wording is going to be edited, so nothing here asserts a sentence. What
 * it asserts is the shape a privacy policy has to keep to be one: the things
 * the GDPR says have to be in it are in it, the anchors are stable enough to
 * link to, and the section about cookies carries a way to change them rather
 * than only a paragraph saying you may.
 */

const headings = sections.map((section) => section.heading).join(" ");
const everything = sections
  .flatMap((section) => [...section.paragraphs, ...(section.points ?? [])])
  .join(" ");

describe("the shape of the policy", () => {
  it("gives every section an anchor of its own, so a link into it works", () => {
    const ids = sections.map((section) => section.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("leaves no section with nothing in it", () => {
    for (const section of sections) {
      expect(section.heading.length).toBeGreaterThan(0);
      expect(section.paragraphs.length).toBeGreaterThan(0);
    }
  });

  it("says when it was last written", () => {
    expect(UPDATED.length).toBeGreaterThan(0);
  });
});

describe("what a policy has to answer", () => {
  // Articles 13 and 14: who is asking, what for, on what basis, who else
  // sees it, how long it is kept, and what the reader can do about it.
  it.each([
    ["who is collecting it", /who we are/i],
    ["what is collected", /what we collect/i],
    ["what allows it", /what allows us/i],
    ["who else sees it", /who else sees it/i],
    ["how long it is kept", /how long we keep it/i],
    ["what the reader can do", /your rights/i],
  ])("has a section saying %s", (_case, heading) => {
    expect(headings).toMatch(heading);
  });

  it("names a way to ask, and it is the one the contact page uses", () => {
    expect(everything).toContain(MAILBOX);
  });

  // The two that are easiest to leave out and the two regulators ask about
  // first: where to complain, and that a consent can be taken back.
  it("says a complaint can be made to a supervisory authority", () => {
    expect(everything).toMatch(/supervisory authority/i);
  });

  it("says a consent can be taken back", () => {
    expect(everything).toMatch(/take back a consent/i);
  });
});

describe("the section about cookies", () => {
  it("is there, and is the only one carrying a control", () => {
    const carrying = sections.filter((section) => section.cookieChoices);

    expect(carrying.map((section) => section.id)).toEqual(["cookies"]);
  });

  // The one third party that sees a visit whether or not anybody signs in.
  // It is named because it is true, and a policy that leaves out the only
  // company watching is the kind that gets people fined.
  it("names the fonts as something a third party serves", () => {
    expect(everything).toMatch(/fonts\.googleapis\.com/);
  });

  it("says how long a choice stands before it is asked again", () => {
    expect(everything).toMatch(/six months/i);
  });
});
