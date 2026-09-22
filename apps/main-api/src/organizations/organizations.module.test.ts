import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { DatabaseModule } from "../database/index.js";
import { InvitationsResolver } from "./invitations.resolver.js";
import { InvitationsService } from "./invitations.service.js";
import { OrganizationsModule } from "./organizations.module.js";
import { OrganizationsResolver } from "./organizations.resolver.js";
import { OrganizationsService } from "./organizations.service.js";

/*
 * The one vertical here with two halves in it: an organization, and the
 * invitations that are the only way into one. They share a module because
 * they share a boundary, not because one is part of the other.
 */

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, OrganizationsModule) ?? [];

describe("how the organizations vertical is wired", () => {
  it("brings the database with it, and nothing else", () => {
    expect(wiring("imports")).toEqual([DatabaseModule]);
  });

  it("provides both halves: organizations, and invitations to them", () => {
    expect(wiring("providers")).toEqual([
      OrganizationsResolver,
      OrganizationsService,
      InvitationsResolver,
      InvitationsService,
    ]);
  });

  it("exports nothing: a vertical is reached through the schema", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
