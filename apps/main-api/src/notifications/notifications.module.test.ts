import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { DatabaseModule } from "../database/index.js";
import { NotificationsModule } from "./notifications.module.js";
import { NotificationsResolver } from "./notifications.resolver.js";
import { NotificationsService } from "./notifications.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, NotificationsModule) ?? [];

describe("how the notifications vertical is wired", () => {
  it("brings the database with it, and nothing else", () => {
    expect(wiring("imports")).toEqual([DatabaseModule]);
  });

  it("provides the resolver and the service behind it", () => {
    expect(wiring("providers")).toEqual([
      NotificationsResolver,
      NotificationsService,
    ]);
  });

  it("exports nothing: a vertical is reached through the schema", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
