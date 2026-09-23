import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { MailModule } from "./mail.module.js";
import { MailService } from "./mail.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, MailModule) ?? [];

describe("how the mail vertical is wired", () => {
  it("imports nothing: a transport needs no database and no identity", () => {
    expect(wiring("imports")).toEqual([]);
  });

  it("provides the service", () => {
    expect(wiring("providers")).toEqual([MailService]);
  });

  // The exception to the rule the other verticals follow. This one is not
  // reached through the schema; it is injected by whichever vertical has
  // something to say.
  it("exports the service, because other verticals send mail through it", () => {
    expect(wiring("exports")).toEqual([MailService]);
  });
});
