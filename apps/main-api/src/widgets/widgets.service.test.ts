import { describe, expect, it, jest } from "@jest/globals";
import { BadRequestException } from "@nestjs/common";
import { DatabaseService } from "../database/index.js";
import { WidgetsService } from "./widgets.service.js";

const banner = JSON.stringify({
  schemaVersion: "1.0",
  canvas: { width: 1200 },
  root: {
    id: "root",
    type: "container",
    children: [{ id: "t", type: "text", value: "BLACK FRIDAY" }],
  },
});

const ID = "w_0123456789abcdef0123456789abcdef";

function setup(
  rows: unknown[] = [{ WidgetId: ID, Name: "Banner", Version: 1 }],
) {
  const query = jest
    .fn<DatabaseService["query"]>()
    .mockResolvedValue(rows as never);
  return {
    query,
    service: new WidgetsService({ query } as unknown as DatabaseService),
  };
}

const sqlOf = (query: jest.Mock<DatabaseService["query"]>, call = 0) =>
  String(query.mock.calls[call]?.[0]).replace(/\s+/g, " ");

describe("saving a widget", () => {
  it("passes the document to the database once it is valid", async () => {
    const { service, query } = setup();
    await service.save("member", null, "Banner", banner);
    expect(sqlOf(query)).toContain('"SaveWidget"');
    expect(query.mock.calls[0]?.[1]?.slice(0, 3)).toEqual([
      "member",
      null,
      "Banner",
    ]);
  });

  /*
   * The invariant this vertical exists to keep. Every caller -- the resolver,
   * the studio page, whatever writes these next -- goes through this method,
   * so there is no path to the database that skips the guardrails.
   */
  it("does not reach the database at all when the document is invalid", async () => {
    const { service, query } = setup();
    await expect(
      service.save("member", null, "Banner", '{"schemaVersion": "9.9"}'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it("does not reach the database for something that is not JSON", async () => {
    const { service, query } = setup();
    await expect(
      service.save("member", null, "Banner", "not json at all"),
    ).rejects.toThrow(/not valid JSON/);
    expect(query).not.toHaveBeenCalled();
  });

  /* Every problem in one message, joined with "; ". The separator is part of
   * the contract rather than a formatting choice: the studio page splits on it
   * to list the problems under the field. */
  it("reports every problem at once, joined", async () => {
    const { service } = setup();
    const failure = await service
      .save(
        "member",
        null,
        "Banner",
        JSON.stringify({
          schemaVersion: "1.0",
          canvas: { width: 600 },
          root: {
            id: "root",
            type: "container",
            children: [
              { id: "a", type: "text" },
              { id: "b", type: "image", src: "https://x.test/a.png" },
            ],
          },
        }),
      )
      .catch((error: Error) => error);
    expect(String(failure)).toContain("; ");
  });

  /* Stored as the parsed document rather than as the author's text, so what a
   * browser is served is JSON the database has normalized rather than
   * whatever whitespace somebody pasted. */
  it("stores the document rather than the typing", async () => {
    const { service, query } = setup();
    await service.save("member", null, "Banner", `  ${banner}  `);
    expect(JSON.parse(String(query.mock.calls[0]?.[1]?.[3]))).toEqual(
      JSON.parse(banner),
    );
  });

  it("names the widget it is saving to, when there is one", async () => {
    const { service, query } = setup();
    await service.save("member", ID, "Banner", banner);
    expect(query.mock.calls[0]?.[1]?.[1]).toBe(ID);
  });
});

describe("listing and reading widgets", () => {
  it("lists the caller's own", async () => {
    const { service, query } = setup([]);
    await service.list("member");
    expect(sqlOf(query)).toContain('"GetWidgets"');
    expect(query.mock.calls[0]?.[1]).toEqual(["member"]);
  });

  /* The public read names no caller, because there is nobody to name: it
   * answers a page anybody can open. */
  it("reads one by its public id and nothing else", async () => {
    const { service, query } = setup([
      { WidgetId: ID, Version: 2, Definition: {} },
    ]);
    await service.read(ID);
    expect(sqlOf(query)).toContain('"GetWidget"');
    expect(query.mock.calls[0]?.[1]).toEqual([ID]);
  });

  it("answers nothing for an id the database does not know", async () => {
    const { service } = setup([]);
    await expect(service.read(ID)).resolves.toBeNull();
  });
});
