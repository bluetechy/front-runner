import { describe, expect, it, jest } from "@jest/globals";
import { DatabaseService } from "../database/index.js";
import type { ProfileInput } from "./profiles.schema.js";
import { ProfilesService } from "./profiles.service.js";

/*
 * The two calls behind the profile page: read the signed-in account's own
 * profile, and write it back. Both name the caller the token named, which is
 * the whole of the authorization on them -- there is no argument for whose
 * profile this is.
 */

const valid: ProfileInput = {
  FirstName: "Marcus",
  LastName: "Member",
  NickName: "Marc",
  Designation: "Program manager",
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

  // The order of seventeen positional parameters is the kind of thing that is
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
        "Program manager",
        "Runs the scoreboard.",
        "Male",
        "1990-04-17",
        "+1 555 0134",
        "San Francisco, CA",
        "",
        "github.com/marcus",
        "linkedin.com/in/marcus",
        "tiktok.com/@marcus",
        "twitter.com/marcus",
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
