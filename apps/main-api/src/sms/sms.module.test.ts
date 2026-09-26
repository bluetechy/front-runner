import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { SmsController } from "./sms.controller.js";
import { SmsModule } from "./sms.module.js";
import { SmsService } from "./sms.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, SmsModule) ?? [];

describe("how the SMS vertical is wired", () => {
  it("imports nothing: a transport needs no database and no identity", () => {
    expect(wiring("imports")).toEqual([]);
  });

  it("provides the service and holds the one route into it", () => {
    expect(wiring("providers")).toEqual([SmsService]);
    expect(wiring("controllers")).toEqual([SmsController]);
  });

  // As in the mail vertical: the service is injected by whoever has something
  // to say. The controller is not, because a door is not a dependency.
  it("exports the service and not the controller", () => {
    expect(wiring("exports")).toEqual([SmsService]);
  });
});
