import { describe, expect, it, jest } from "@jest/globals";
import { BadRequestException } from "@nestjs/common";
import { DatabaseService } from "../database/index.js";
import { ZodPipe } from "../graphql/index.js";
import { profileSchema, type ProfileInput } from "./profiles.schema.js";
import { ProfilesService } from "./profiles.service.js";

const valid: ProfileInput = {
  FirstName: "Marcus",
  LastName: "Member",
  NickName: "Marc",
  Designation: "Programme manager",
  Biography: "Runs the scoreboard.",
  Language: "en-US",
  Gender: "Male",
  BirthDate: "1990-04-17",
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

function setup(rows: unknown[] = []) {
  const query = jest
    .fn<DatabaseService["query"]>()
    .mockResolvedValue(rows as never);
  return {
    query,
    service: new ProfilesService({ query } as unknown as DatabaseService),
  };
}

describe("the profile a caller may read and write", () => {
  it("asks the database for the signed-in account's profile", async () => {
    const { service, query } = setup([{ UserUUID: "user-id" }]);
    await service.get("marcus");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"GetUserProfile"'),
      ["marcus"],
    );
  });

  it("answers null when the account has no row at all", async () => {
    const { service } = setup([]);
    await expect(service.get("nobody")).resolves.toBeNull();
  });

  // The order of sixteen positional parameters is the kind of thing that is
  // wrong once and then wrong forever, so it is pinned here.
  it("passes the whole profile in the order the function declares", async () => {
    const { service, query } = setup([{ UserUUID: "user-id" }]);
    await service.set("marcus", valid);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"SetUserProfile"'),
      [
        "marcus",
        "Marcus",
        "Member",
        "Marc",
        "Programme manager",
        "Runs the scoreboard.",
        "en-US",
        "Male",
        "1990-04-17",
        "+1 555 0134",
        "San Francisco, CA",
        "marcus.example",
        "twitter.com/marcus",
        "",
        "linkedin.com/in/marcus",
        "github.com/marcus",
        true,
        false,
      ],
    );
  });

  // The login name is the token's, so a caller cannot write somebody else's
  // profile by naming them.
  it("writes the profile of the caller the token names", async () => {
    const { service, query } = setup([{ UserUUID: "user-id" }]);
    await service.set("marcus", { ...valid, FirstName: "Somebody" });
    expect(query.mock.calls[0]?.[1]?.[0]).toBe("marcus");
  });
});

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
      Website: "",
      Twitter: "",
      LinkedIn: "",
      Github: "",
    });
    expect(empty.Website).toBe("");
  });

  it("trims what it is given, so the database is not asked to", () => {
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
      pipe.transform({ ...valid, Website: "nope", Phone: "no" }),
    ).toThrow(BadRequestException);

    try {
      pipe.transform({ ...valid, Website: "nope", Phone: "no" });
    } catch (failure) {
      const message = (failure as BadRequestException).message;
      expect(message).toContain("Website");
      expect(message).toContain("Phone");
    }
  });
});
