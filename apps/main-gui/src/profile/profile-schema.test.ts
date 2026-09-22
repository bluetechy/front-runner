import { describe, expect, it } from "vitest";
import { errorsOf, genders, profileSchema } from "./profile-schema";

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
  Gender: "Male",
  BirthDate: "1990-04-17",
  Phone: "+1 555 0134",
  Address: "San Francisco, CA",
  Facebook: "",
  Github: "github.com/marcus",
  LinkedIn: "linkedin.com/in/marcus",
  TikTok: "tiktok.com/@marcus",
  Twitter: "twitter.com/marcus",
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
        BirthDate: "",
        Phone: "",
        Address: "",
        Facebook: "",
        Github: "",
        LinkedIn: "",
        TikTok: "",
        Twitter: "",
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
    ["Github", "github com/marcus"],
    ["TikTok", "tiktok com/@marcus"],
    ["Phone", "no"],
    ["Gender", "Wizard"],
    ["BirthDate", "17-04-1990"],
    ["BirthDate", "2026-02-31"],
    ["BirthDate", "3000-01-01"],
    ["BirthDate", "1492-10-12"],
  ])("refuses %s when it is %j", (field, value) => {
    expect(errorsOf({ ...valid, [field]: value })).toHaveProperty(field);
  });

  // One round trip per mistake is a form nobody finishes, so the form is told
  // about every field at once rather than the first one.
  it("names every field that failed, not just the first", () => {
    expect(
      Object.keys(errorsOf({ ...valid, Twitter: "nope", Phone: "no" })),
    ).toEqual(expect.arrayContaining(["Twitter", "Phone"]));
  });

  // "Not given" is a real answer for a date and there is no date that means
  // it, so empty has to be allowed through to the NULL the column holds.
  it("accepts a birth date left blank, and today", () => {
    expect(errorsOf({ ...valid, BirthDate: "" })).toEqual({});
    expect(
      errorsOf({ ...valid, BirthDate: new Date().toISOString().slice(0, 10) }),
    ).toEqual({});
  });

  it("offers the four genders the column allows", () => {
    expect(genders).toEqual(["Male", "Female", "Transgender", "Not specified"]);
  });
});
