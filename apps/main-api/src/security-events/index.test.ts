import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as securityEvents from "./index.js";
import { SecurityEventsModule } from "./security-events.module.js";
import { SecurityEventsService } from "./security-events.service.js";

describe("what the security events vertical offers the rest of the API", () => {
  /* The service as well as the module, which is not what the other verticals
   * do. A security log is written by whatever it is a log of, so the slices
   * that change how somebody gets into their account reach it directly. */
  it("offers its module and the service that records into it", () => {
    expect(Object.keys(securityEvents).toSorted()).toEqual([
      "SecurityEventsModule",
      "SecurityEventsService",
    ]);
  });

  it("offers them themselves rather than copies of them", () => {
    expect(securityEvents.SecurityEventsModule).toBe(SecurityEventsModule);
    expect(securityEvents.SecurityEventsService).toBe(SecurityEventsService);
  });
});
