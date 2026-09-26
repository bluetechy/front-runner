import { describe, expect, it } from "@jest/globals";
import * as sms from "./index.js";
import { enrollmentCode, loginCode } from "./sms.copy.js";
import { SmsModule } from "./sms.module.js";
import { SmsService } from "./sms.service.js";

describe("what the SMS vertical offers the rest of the API", () => {
  // The copy as well as the module and the service: the two-factor vertical
  // writes the enrollment message with it, so that the wording stays in one
  // place even though it is sent from two.
  it("offers its module, the service and the two messages", () => {
    expect(Object.keys(sms).toSorted()).toEqual([
      "SmsModule",
      "SmsService",
      "enrollmentCode",
      "loginCode",
    ]);
  });

  it("offers them themselves rather than copies", () => {
    expect(sms.SmsModule).toBe(SmsModule);
    expect(sms.SmsService).toBe(SmsService);
    expect(sms.enrollmentCode).toBe(enrollmentCode);
    expect(sms.loginCode).toBe(loginCode);
  });
});
