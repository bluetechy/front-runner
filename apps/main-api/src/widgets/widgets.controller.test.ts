import { describe, expect, it, jest } from "@jest/globals";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Response } from "express";
import { WidgetsController } from "./widgets.controller.js";
import type { WidgetsService } from "./widgets.service.js";

/*
 * The one public endpoint in this API, and the only one a stranger's browser
 * ever calls. Nearly everything worth asserting here is about the origin
 * check, because that is the whole of what a browser is allowed to render and
 * it is the thing an SDK cannot be given later: an SDK shipped open and closed
 * afterwards is an SDK whose customers all break on the day it is closed.
 */

const ID = "w_0123456789abcdef0123456789abcdef";

const definition = (allowedOrigins?: string[]) => ({
  schemaVersion: "1.0",
  canvas: { width: 1200 },
  ...(allowedOrigins ? { delivery: { allowedOrigins } } : {}),
  root: { id: "root", type: "container" },
});

function setup(
  stored: unknown = {
    WidgetId: ID,
    Version: 4,
    Definition: definition(["https://shop.northwind.test"]),
  },
) {
  const read = jest
    .fn<WidgetsService["read"]>()
    .mockResolvedValue(stored as never);
  const headers: Record<string, string> = {};
  const response = {
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
  } as unknown as Response;
  return {
    read,
    headers,
    response,
    controller: new WidgetsController({ read } as unknown as WidgetsService),
  };
}

describe("serving a definition to somebody else's page", () => {
  it("answers the definition and the version it is", async () => {
    const { controller, response } = setup();
    const answer = await controller.widget(
      ID,
      "https://shop.northwind.test",
      response,
    );
    expect(answer).toMatchObject({ widgetId: ID, version: 4 });
    expect(answer.definition).toMatchObject({ schemaVersion: "1.0" });
  });

  it("echoes back an origin the document lists", async () => {
    const { controller, response, headers } = setup();
    await controller.widget(ID, "https://shop.northwind.test", response);
    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "https://shop.northwind.test",
    );
  });

  /* Never a star, and never an origin that was not checked: an echo with no
   * check is a star written the long way. */
  it("never answers a star", async () => {
    const { controller, response, headers } = setup();
    await controller.widget(ID, "https://shop.northwind.test", response);
    expect(headers["Access-Control-Allow-Origin"]).not.toBe("*");
  });

  /*
   * The single most important header on this route and the easiest to leave
   * off: without it a shared cache can serve the copy it stored for one origin
   * to a page on another, which either leaks a widget past its allowlist or
   * denies one that was on it. On the refusals too, for the same reason.
   */
  it("names Origin as what the answer varies by, on every answer", async () => {
    const allowed = setup();
    await allowed.controller.widget(
      ID,
      "https://shop.northwind.test",
      allowed.response,
    );
    expect(allowed.headers["Vary"]).toBe("Origin");

    const refused = setup();
    await refused.controller
      .widget(ID, "https://evil.test", refused.response)
      .catch(() => undefined);
    expect(refused.headers["Vary"]).toBe("Origin");

    const missing = setup(null);
    await missing.controller
      .widget(ID, "https://shop.northwind.test", missing.response)
      .catch(() => undefined);
    expect(missing.headers["Vary"]).toBe("Origin");
  });

  it("refuses an origin the document does not list, and says why", async () => {
    const { controller, response, headers } = setup();
    await expect(
      controller.widget(ID, "https://evil.test", response),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  /* `evil-northwind.test` ends with the same characters as `northwind.test`.
   * There is no suffix matching here, which is what makes that harmless. */
  it("refuses an origin that merely ends with an allowed one", async () => {
    const { controller, response } = setup();
    await expect(
      controller.widget(ID, "https://evil-shop.northwind.test", response),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuses a widget whose document lists no origins at all", async () => {
    const { controller, response } = setup({
      WidgetId: ID,
      Version: 1,
      Definition: definition(),
    });
    await expect(
      controller.widget(ID, "https://shop.northwind.test", response),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  /* A file:// page, a sandboxed iframe and some redirects all send the literal
   * string "null". It must never match an entry. */
  it("refuses the null origin", async () => {
    const { controller, response } = setup({
      WidgetId: ID,
      Version: 1,
      Definition: definition(["null"]),
    });
    await expect(
      controller.widget(ID, "null", response),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  /*
   * A request with no browser in front of it was never subject to CORS, so
   * refusing it would break every CDN and server-side render while stopping
   * nobody. What protects a definition from curl is that it is published
   * content reached by an unguessable id.
   */
  it("serves a request with no origin at all, and puts no CORS header on it", async () => {
    const { controller, response, headers } = setup();
    const answer = await controller.widget(ID, undefined, response);
    expect(answer.version).toBe(4);
    expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });

  it("lets a browser cache it briefly", async () => {
    const { controller, response, headers } = setup();
    await controller.widget(ID, "https://shop.northwind.test", response);
    expect(headers["Cache-Control"]).toContain("max-age=60");
  });
});

describe("what the endpoint will not tell a stranger", () => {
  /* One answer for "no such id" and for "saved but never published": a
   * different one for each would tell somebody which ids are real, and the id
   * is the only thing protecting a definition from being enumerated. */
  it("answers the same way for an id that does not exist and one with no version", async () => {
    const { controller, response } = setup(null);
    await expect(
      controller.widget(ID, undefined, response),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  /* Refused on its shape, before the database is asked anything at all. */
  it("does not ask the database about something that is not an id", async () => {
    const { controller, response, read } = setup();
    await expect(
      controller.widget("../../etc/passwd", undefined, response),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(read).not.toHaveBeenCalled();
  });

  it("refuses an id of the right shape but the wrong alphabet", async () => {
    const { controller, response, read } = setup();
    await expect(
      controller.widget(`w_${"g".repeat(32)}`, undefined, response),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(read).not.toHaveBeenCalled();
  });
});

describe("the language, served as the contract", () => {
  /* Public and cached hard: a customer writing a document by hand wants it, an
   * editor wants it for autocompletion, and the model that will eventually
   * write these documents wants it as its structured-output schema. Serving it
   * from the process that validates against it is what stops those three from
   * reading three different copies. */
  it("answers the schema itself", () => {
    const { controller } = setup();
    expect(controller.schema().$id).toContain("/widget/v1");
  });
});
