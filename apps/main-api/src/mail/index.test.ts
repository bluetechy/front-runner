import { describe, expect, it } from "@jest/globals";
import * as mail from "./index.js";
import { MailModule } from "./mail.module.js";
import { MailService } from "./mail.service.js";

describe("what the mail vertical offers the rest of the API", () => {
  // The service as well as the module, unlike most verticals: this one is
  // infrastructure that another vertical injects rather than a piece of the
  // schema reached through GraphQL.
  it("offers its module and the service other verticals inject", () => {
    expect(Object.keys(mail).toSorted()).toEqual(["MailModule", "MailService"]);
  });

  it("offers them themselves rather than copies", () => {
    expect(mail.MailModule).toBe(MailModule);
    expect(mail.MailService).toBe(MailService);
  });
});
