import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { DatabaseModule, DatabaseService } from "../database/index.js";
import { HealthModule } from "./health.module.js";

/*
 * The two probes whatever is running this process watches.
 *
 * They answer different questions and must be able to disagree: liveness is
 * "is this process still working?", readiness is "can it serve a request?".
 * A liveness probe that checks the database restarts the API every time
 * PostgreSQL hiccups, which is the one thing guaranteed not to help.
 *
 * The controller is not exported from its file, so it is taken off the
 * module the way Nest takes it.
 */

const controllers = (Reflect.getMetadata("controllers", HealthModule) ??
  []) as (new (db: DatabaseService) => {
  live: () => unknown;
  ready: () => Promise<unknown>;
})[];

function probe(answer: () => Promise<unknown[]>) {
  const Controller = controllers[0];
  if (!Controller) throw new Error("the health module has no controller");
  const query = jest
    .fn<DatabaseService["query"]>()
    .mockImplementation(answer as never);
  return {
    query,
    controller: new Controller({ query } as unknown as DatabaseService),
  };
}

describe("how the health probes are wired", () => {
  it("brings the database with it, because readiness asks it a question", () => {
    expect(Reflect.getMetadata("imports", HealthModule)).toEqual([
      DatabaseModule,
    ]);
  });

  it("mounts one controller and provides nothing", () => {
    expect(controllers).toHaveLength(1);
    expect(Reflect.getMetadata("providers", HealthModule) ?? []).toEqual([]);
  });

  // Every other operation in this application needs a token. These two are
  // asked by a process that has none and could not get one.
  it("is public: nothing signs in to say hello", () => {
    expect(
      Reflect.getMetadata("publicOperation", controllers[0] as object),
    ).toBe(true);
  });
});

describe("what the probes answer", () => {
  it("says it is alive without asking the database anything", () => {
    const { controller, query } = probe(async () => []);

    expect(controller.live()).toEqual({ status: "ok" });
    expect(query).not.toHaveBeenCalled();
  });

  it("says it is ready when the database answers", async () => {
    const { controller, query } = probe(async () => [{ "?column?": 1 }]);

    await expect(controller.ready()).resolves.toEqual({ status: "ok" });
    expect(query).toHaveBeenCalledWith("SELECT 1");
  });

  // Not ready is not the same as not alive: the process is fine and will
  // serve again the moment the database does.
  it("says it is not ready when the database does not answer", async () => {
    const { controller } = probe(async () => {
      throw new Error("Database operation failed");
    });

    await expect(controller.ready()).rejects.toThrow("Database unavailable");
  });

  it("says nothing about why the database is unavailable", async () => {
    const { controller } = probe(async () => {
      throw new Error('password authentication failed for user "test"');
    });

    await expect(controller.ready()).rejects.not.toThrow(/password/);
  });
});
