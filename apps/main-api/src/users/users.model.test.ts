import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { User } from "./users.model.js";

/*
 * What an account is, as the schema exposes it -- and, as much to the point,
 * what it does not. There is no token field on it: Keycloak issues the access
 * token straight to the browser, so this API never hands one back.
 */

const typeOf = (field: string) =>
  Reflect.getMetadata("design:type", User.prototype, field);

describe("the account a caller reads", () => {
  it.each([
    ["UserUUID", String],
    ["Name", String],
    ["LoginName", String],
    ["Email", Object],
    ["IsAdmin", Object],
  ])("exposes %s", (field, type) => {
    expect(typeOf(field)).toBe(type);
  });

  it.each(["Token", "AccessToken", "Password", "SubjectId"])(
    "does not expose %s",
    (field) => {
      expect(typeOf(field)).toBeUndefined();
    },
  );
});
