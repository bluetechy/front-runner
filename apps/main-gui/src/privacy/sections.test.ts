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

/*
 * The security log is personal data the product started keeping when RECENT
 * ACTIVITY LOG was built, and a policy that does not mention it is a policy
 * somebody would be surprised by on their own Security & Access page.
 *
 * The number is the part worth pinning. Twelve months is enforced by
 * `dbo.trim_security_events`, and this page is where the product promises it:
 * the two have to agree, so changing one has to break the other.
 */
describe("the section about the security log", () => {
  it("says the logins are recorded and where they can be read", () => {
    expect(everything).toMatch(/each login/i);
    expect(everything).toMatch(/Security & Access/);
  });

  it("says a device is recorded, and how coarsely", () => {
    expect(everything).toMatch(/kind of device/i);
    expect(everything).toMatch(/"Mac OS"/);
  });

  /* Added after the log was: a refused login is personal data about somebody
   * whose only involvement was being guessed at, and it is the one entry on the
   * page this product does not cause. A policy that named only the successes
   * would be describing half the page. */
  it("says the refused logins are recorded too", () => {
    expect(everything).toMatch(/refused/i);
  });

  /* The honest limit of it, and the reason the log cannot be used to find out
   * whether an account exists: an attempt on a name nobody holds is written
   * nowhere. */
  it("says an attempt aimed at no account is recorded against nobody", () => {
    expect(everything).toMatch(/nobody at all/i);
  });

  /* The other half of a login, added with it: the page records when a session
   * ended as well as when it began, and the policy has to say so because a
   * logout is as much a record of somebody's movements as the login was. */
  it("says the end of a session is recorded as well as its start", () => {
    expect(everything).toMatch(/end of each session/i);
  });

  /* Two honest limits on that one. It does not claim to know why a session
   * ended, and it cannot record the end of a session it never saw begin. */
  it("does not claim to know whether a session was ended or ran out", () => {
    expect(everything).toMatch(/whether you logged out or it simply ran out/i);
  });

  // The same twelve months dbo.trim_security_events deletes on. If this fails,
  // one of the two moved and the other has to move with it.
  it("says how long it is kept, and agrees with the database", () => {
    expect(everything).toMatch(/twelve months/i);
  });

  // The honest half of the promise: the sweep happens when something is
  // written, so an account nobody touches is not swept on a schedule.
  it("does not promise a deletion date it cannot keep", () => {
    expect(everything).toMatch(/dropped as new ones are recorded/i);
  });
});
