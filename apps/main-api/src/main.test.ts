import "reflect-metadata";
import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

/*
 * The first thing this process does.
 *
 * Importing this module *is* starting the API, which is why the factory is
 * replaced before the import rather than after it: what is under test is the
 * handful of decisions bootstrap makes on the way up, and every one of them
 * is a decision no request can change afterwards.
 *
 * It runs once, because a module cannot be imported a second time -- so the
 * whole of the boot is recorded here and then asserted on below.
 */

const started = {
  module: undefined as unknown,
  options: undefined as Record<string, unknown> | undefined,
  bodyParser: [] as unknown[][],
  cors: undefined as Record<string, unknown> | undefined,
  shutdownHooks: 0,
  listen: [] as unknown[],
};

const configuration: Record<string, unknown> = {
  CORS_ORIGINS: ["https://front-runner.test"],
  API_PORT: 3456,
};

beforeAll(async () => {
  let listening: () => void;
  const listened = new Promise<void>((resolve) => (listening = resolve));

  jest.spyOn(NestFactory, "create").mockImplementation((async (
    module: unknown,
    options: unknown,
  ) => {
    started.module = module;
    started.options = options as Record<string, unknown>;
    return {
      get: () => new ConfigService(configuration),
      useBodyParser: (...call: unknown[]) => started.bodyParser.push(call),
      enableCors: (allowed: Record<string, unknown>) => {
        started.cors = allowed;
      },
      enableShutdownHooks: () => {
        started.shutdownHooks += 1;
      },
      listen: async (...call: unknown[]) => {
        started.listen = call;
        listening();
      },
    };
  }) as never);

  await import("./main.js");
  await listened;
});

describe("starting the API", () => {
  it("stands the whole application up", async () => {
    const { AppModule } = await import("./app.module.js");

    expect(started.module).toBe(AppModule);
  });

  // Express parses a body before any of this application sees it, and its
  // default has no size on it. The parser is turned off at the factory and
  // installed again with a limit, so there is no window in which a request
  // of any size is read.
  it("reads no request body until it has said how large one may be", () => {
    expect(started.options).toMatchObject({ bodyParser: false });
    expect(started.bodyParser).toEqual([["json", { limit: "64kb" }]]);
  });

  // A list, from the environment, and `getOrThrow` -- so an installation with
  // no origins configured fails to start rather than serving to nobody, or
  // to everybody.
  it("allows only the origins it was configured with", () => {
    expect(started.cors).toEqual({
      origin: ["https://front-runner.test"],
      credentials: false,
    });
  });

  // Without this, a container being stopped takes its PostgreSQL pool with
  // it mid-query rather than draining it.
  it("closes down when it is asked to, rather than when it is killed", () => {
    expect(started.shutdownHooks).toBe(1);
  });

  // Every address in the container, not just the loopback one: nothing
  // outside it can reach a process listening on 127.0.0.1.
  it("listens on the configured port, on every address", () => {
    expect(started.listen).toEqual([3456, "0.0.0.0"]);
  });
});
