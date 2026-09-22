import { describe, expect, it } from "@jest/globals";
import { BadRequestException } from "@nestjs/common";
import { ZodPipe } from "../graphql/index.js";
import { profileSchema, type ProfileInput } from "./profiles.schema.js";

/*
 * What a profile is allowed to contain, and what the resolver's pipe does
 * with one that is not. The schema is the API's own answer rather than the
 * browser's: the form mirrors it, and neither is allowed to be the only one
 * checking.
 */

const valid: ProfileInput = {
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

describe("what a profile is allowed to contain", () => {
  it("accepts a filled-in profile", () => {
    expect(profileSchema.parse(valid)).toMatchObject({ FirstName: "Marcus" });
  });

  it("accepts every optional field left empty", () => {
    const empty = profileSchema.parse({
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
    });
    expect(empty.Twitter).toBe("");
  });

  it("trims what it is given, so the database is not asked to", () => {
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
    const result = profileSchema.safeParse({ ...valid, [field]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });

  // "Not given" is a real answer for a date and there is no date that means
  // it, so empty has to be allowed through to the NULL the column holds.
  it("accepts a birth date left blank", () => {
    expect(profileSchema.safeParse({ ...valid, BirthDate: "" }).success).toBe(
      true,
    );
  });

  it("accepts today, which is a day somebody was born on", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(
      profileSchema.safeParse({ ...valid, BirthDate: today }).success,
    ).toBe(true);
  });

  it("refuses a preference that is not a yes or a no", () => {
    expect(
      profileSchema.safeParse({ ...valid, WantsAwardEmails: "yes" }).success,
    ).toBe(false);
  });
});

describe("the pipe the resolver validates through", () => {
  const pipe = new ZodPipe(profileSchema);

  it("hands the service what the schema parsed, not what arrived", () => {
    expect(pipe.transform({ ...valid, LastName: "  Member  " })).toMatchObject({
      LastName: "Member",
    });
  });

  // One round trip per mistake is a form nobody finishes, so every failing
  // field is named at once.
  it("reports every field that failed, each by name", () => {
    expect(() =>
      pipe.transform({ ...valid, Twitter: "nope", Phone: "no" }),
    ).toThrow(BadRequestException);

    try {
      pipe.transform({ ...valid, Twitter: "nope", Phone: "no" });
    } catch (failure) {
      const message = (failure as BadRequestException).message;
      expect(message).toContain("Twitter");
      expect(message).toContain("Phone");
    }
  });
});
