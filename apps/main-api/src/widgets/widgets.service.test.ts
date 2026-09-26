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

  /* Saving is not publishing: the guard against overwriting somebody else's
   * work is passed through, and nothing here decides what browsers get. */
  it("passes the version the caller read the document at", async () => {
    const { service, query } = setup();
    await service.save("member", ID, "Banner", banner, 4);
    expect(query.mock.calls[0]?.[1]?.[4]).toBe(4);
  });

  it("passes nothing where the caller never opened anything", async () => {
    const { service, query } = setup();
    await service.save("member", null, "Banner", banner);
    expect(query.mock.calls[0]?.[1]?.[4]).toBeNull();
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

describe("publishing and unpublishing", () => {
  /* The version is named rather than assumed, because "publish the latest"
   * would make the call mean something different depending on when it landed --
   * which is exactly what somebody rolling back at speed cannot afford. */
  it("publishes the version it was given", async () => {
    const { service, query } = setup([
      { WidgetId: ID, Name: "Banner", DraftVersion: 3, PublishedVersion: 2 },
    ]);
    await service.publish("member", ID, 2);
    expect(sqlOf(query)).toContain('"PublishWidget"');
    expect(query.mock.calls[0]?.[1]).toEqual(["member", ID, 2]);
  });

  /* There is no rollback call, and this is why: the same function with an
   * earlier number is the rollback. */
  it("is how a rollback is done, with an earlier number", async () => {
    const { service, query } = setup([
      { WidgetId: ID, Name: "Banner", DraftVersion: 3, PublishedVersion: 1 },
    ]);
    const published = await service.publish("member", ID, 1);
    expect(query.mock.calls[0]?.[1]?.[2]).toBe(1);
    expect(published.PublishedVersion).toBe(1);
    expect(published.DraftVersion).toBe(3);
  });

  it("unpublishes without naming a version, because there is nothing to name", async () => {
    const { service, query } = setup([
      { WidgetId: ID, Name: "Banner", DraftVersion: 3, PublishedVersion: null },
    ]);
    const unpublished = await service.unpublish("member", ID);
    expect(sqlOf(query)).toContain('"UnpublishWidget"');
    expect(query.mock.calls[0]?.[1]).toEqual(["member", ID]);
    expect(unpublished.PublishedVersion).toBeNull();
  });
});

describe("reading a definition back", () => {
  const stored = {
    WidgetId: ID,
    Name: "Banner",
    Version: 2,
    SchemaVersion: "1.0",
    Definition: { schemaVersion: "1.0", canvas: { width: 600 } },
    IsPublished: false,
    CreatedAt: new Date("2026-02-01T00:00:00.000Z"),
  };

  it("asks for the draft when no version is named", async () => {
    const { service, query } = setup([stored]);
    await service.definition("member", ID);
    expect(sqlOf(query)).toContain('"GetWidgetDefinition"');
    expect(query.mock.calls[0]?.[1]).toEqual(["member", ID, null]);
  });

  it("asks for the version that was named", async () => {
    const { service, query } = setup([stored]);
    await service.definition("member", ID, 1);
    expect(query.mock.calls[0]?.[1]?.[2]).toBe(1);
  });

  /* The driver parses jsonb into an object; the field is a string. Converting
   * here is what keeps the widget language out of this API's schema. */
  it("hands the document back as text, the way it arrived", async () => {
    const { service } = setup([stored]);
    const read = await service.definition("member", ID);
    expect(typeof read?.Definition).toBe("string");
    expect(JSON.parse(String(read?.Definition))).toEqual(stored.Definition);
  });

  /* An ordinary answer rather than an error: a version number from a stale page
   * is a page asking for something that is no longer there. */
  it("answers nothing for a version that is not there", async () => {
    const { service } = setup([]);
    await expect(service.definition("member", ID, 9)).resolves.toBeNull();
  });

  it("asks for a widget's history without its definitions", async () => {
    const { service, query } = setup([]);
    await service.versions("member", ID);
    expect(sqlOf(query)).toContain('"GetWidgetVersions"');
    expect(query.mock.calls[0]?.[1]).toEqual(["member", ID]);
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
   * answers a page anybody can open. It is also a different function from the
   * owner's read, which is the point -- this one will not hand back a draft. */
  it("reads one by its public id and nothing else", async () => {
    const { service, query } = setup([
      { WidgetId: ID, Version: 2, Definition: {} },
    ]);
    await service.read(ID);
    expect(sqlOf(query)).toBe('SELECT * FROM dbo."GetWidget"($1)');
    expect(query.mock.calls[0]?.[1]).toEqual([ID]);
  });

  it("answers nothing for an id the database does not know", async () => {
    const { service } = setup([]);
    await expect(service.read(ID)).resolves.toBeNull();
  });
});
