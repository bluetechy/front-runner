import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ConfigurationModule } from "./configuration.module.js";
import { validateEnvironment } from "./environment.js";

/*
 * Configuration is read once, checked once, and then available everywhere.
 *
 * The three options are each load-bearing: global, so nothing has to import
 * this module to read a setting; no env file, because the environment is the
 * environment and a file beside the code that quietly changes it is how
 * production ends up configured like a laptop; and a validator, so a missing
 * setting stops the process at boot rather than at the first request that
 * needed it.
 *
 * `ConfigModule.forRoot` validates as it is called -- which is at the moment
 * this module is imported, before anything has been wired -- and hands back a
 * promise, so the wiring is awaited here rather than read straight back.
 */

const imported = async () => {
  const [dynamic] = (Reflect.getMetadata("imports", ConfigurationModule) ??
    []) as Promise<{
    module?: unknown;
    global?: boolean;
    exports?: unknown[];
  }>[];
  if (!dynamic) throw new Error("the configuration module imports nothing");
  return dynamic;
};

describe("how configuration is wired", () => {
  it("imports the configuration module and nothing else", async () => {
    expect(Reflect.getMetadata("imports", ConfigurationModule)).toHaveLength(1);
    expect((await imported()).module).toBe(ConfigModule);
  });

  // Global, so a vertical that wants a setting injects ConfigService and does
  // not have to import anything to be allowed to.
  it("makes the settings readable from anywhere without being imported", async () => {
    const dynamic = await imported();

    expect(dynamic.global).toBe(true);
    expect(dynamic.exports).toContain(ConfigService);
  });

  // The validator ran when this file imported the module. That it ran at all
  // is the point: an environment this application cannot work in is a
  // process that does not start, rather than a 500 at the first request that
  // needed the missing setting.
  it("has already checked the environment by the time anything is wired", () => {
    expect(() => validateEnvironment(process.env)).not.toThrow();
  });
});
