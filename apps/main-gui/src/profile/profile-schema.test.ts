import { describe, expect, it } from "vitest";
import { errorsOf, languages, profileSchema } from "./profile-schema";

/*
 * The browser's copy of main-api's rules. These tests are here to catch the
 * copy drifting: every case below has a twin in
 * apps/main-api/src/profiles/profiles.test.ts, and the two are meant to agree
 * about what is acceptable. See the note at the top of profile-schema.ts.
 */

const valid = {
  FirstName: "Marcus",
  LastName: "Member",
  NickName: "Marc",
  Designation: "Programme manager",
  Biography: "Runs the scoreboard.",
  Language: "en-US",
  Phone: "+1 555 0134",
  Address: "San Francisco, CA",
  Website: "marcus.example",
  Twitter: "twitter.com/marcus",
  Facebook: "",
  LinkedIn: "linkedin.com/in/marcus",
  Github: "github.com/marcus",
  WantsAwardEmails: true,
  WantsDigestEmails: false,
};

describe("what the profile form accepts", () => {
  it("accepts a filled-in profile", () => {
    expect(errorsOf(valid)).toEqual({});
  });

  it("accepts every optional field left empty", () => {
    expect(
      errorsOf({
        ...valid,
        FirstName: "",
        LastName: "",
        NickName: "",
        Designation: "",
        Biography: "",
        Phone: "",
        Address: "",
        Website: "",
        Twitter: "",
        LinkedIn: "",
        Github: "",
      }),
    ).toEqual({});
  });

  it("trims what it is given, so what is sent is what was checked", () => {
    expect(
      profileSchema.parse({ ...valid, FirstName: "  Marcus  " }),
    ).toMatchObject({ FirstName: "Marcus" });
  });

  it.each([
    ["FirstName", "M".repeat(65)],
    ["Biography", "b".repeat(2001)],
    ["Website", "not a website"],
    ["Github", "github com/marcus"],
    ["Phone", "no"],
    ["Language", "kl-KL"],
  ])("refuses %s when it is %j", (field, value) => {
    expect(errorsOf({ ...valid, [field]: value })).toHaveProperty(field);
  });

  // One round trip per mistake is a form nobody finishes, so the form is told
  // about every field at once rather than the first one.
  it("names every field that failed, not just the first", () => {
    expect(
      Object.keys(errorsOf({ ...valid, Website: "nope", Phone: "no" })),
    ).toEqual(expect.arrayContaining(["Website", "Phone"]));
  });

  it("offers the languages the API stores, as tags", () => {
    expect(languages.map((language) => language.tag)).toEqual([
      "en-US",
      "en-GB",
      "es-ES",
      "fr-FR",
    ]);
  });
});
