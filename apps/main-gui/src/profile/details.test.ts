import { describe, expect, it } from "vitest";
import { linksOf, placeholderSkills, placeholderTallies } from "./details";
import type { Profile } from "./profile-schema";

/*
 * What the profile page shows that nothing serves yet, and the one function
 * in here that is real: turning the handles somebody typed into links.
 *
 * A handle is stored the way it was typed -- with a scheme or without -- so
 * the href is where that is made good. Getting it wrong means a link that
 * goes to `/profile/github.com/marcus` rather than to GitHub, which looks
 * like a broken profile rather than a broken link.
 */

const profile = (overrides: Partial<Profile> = {}): Profile =>
  ({
    FirstName: "Marcus",
    LastName: "Member",
    NickName: "",
    Designation: "",
    Biography: "",
    Gender: "Not specified",
    BirthDate: "",
    Phone: "",
    Address: "",
    Facebook: "",
    Github: "",
    LinkedIn: "",
    TikTok: "",
    Twitter: "",
    WantsAwardEmails: true,
    WantsDigestEmails: false,
    ...overrides,
  }) as Profile;

describe("the links a profile carries", () => {
  it("has none at all for a profile with none", () => {
    expect(linksOf(profile())).toEqual([]);
  });

  it("skips the ones left empty", () => {
    const links = linksOf(
      profile({ Github: "github.com/marcus", Twitter: "" }),
    );

    expect(links).toHaveLength(1);
    expect(links[0]?.label).toBe("GitHub");
  });

  // A handle typed without a scheme is the usual case, and a relative href
  // would go somewhere inside this app rather than out of it.
  it("adds a scheme to a handle typed without one", () => {
    expect(linksOf(profile({ Github: "github.com/marcus" }))[0]?.href).toBe(
      "https://github.com/marcus",
    );
  });

  it("leaves a handle that already has one alone", () => {
    expect(
      linksOf(profile({ Github: "https://github.com/marcus" }))[0]?.href,
    ).toBe("https://github.com/marcus");
    expect(
      linksOf(profile({ Github: "http://github.com/marcus" }))[0]?.href,
    ).toBe("http://github.com/marcus");
  });

  it("does not mind how the scheme was capitalized", () => {
    expect(
      linksOf(profile({ Github: "HTTPS://github.com/marcus" }))[0]?.href,
    ).toBe("HTTPS://github.com/marcus");
  });

  // The same order the form asks for them in, and the column list behind it:
  // there is no ranking to express between five social networks.
  it("lists them alphabetically, the way the form asks for them", () => {
    const links = linksOf(
      profile({
        Facebook: "facebook.com/marcus",
        Github: "github.com/marcus",
        LinkedIn: "linkedin.com/in/marcus",
        TikTok: "tiktok.com/@marcus",
        Twitter: "twitter.com/marcus",
      }),
    );

    expect(links.map((link) => link.label)).toEqual([
      "Facebook",
      "GitHub",
      "LinkedIn",
      "TikTok",
      "Twitter",
    ]);
  });

  it("gives every link an icon and the handle as typed", () => {
    const links = linksOf(profile({ TikTok: "tiktok.com/@marcus" }));

    expect(links[0]?.icon).toBeTypeOf("function");
    expect(links[0]?.handle).toBe("tiktok.com/@marcus");
  });
});

describe("what is still placeholder", () => {
  // Points, badges and certificates, because those are what this product
  // keeps -- not the mock-up's followers and posts.
  it("counts the three things this product actually keeps", () => {
    expect(placeholderTallies.map((tally) => tally.label)).toEqual([
      "Points",
      "Badges",
      "Certificates",
    ]);
  });

  it("gives every skill a name and a figure inside the bar", () => {
    for (const skill of placeholderSkills) {
      expect(skill.label).not.toBe("");
      expect(skill.percent).toBeGreaterThan(0);
      expect(skill.percent).toBeLessThanOrEqual(100);
    }
  });
});
