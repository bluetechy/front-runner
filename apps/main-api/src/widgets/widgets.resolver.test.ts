import { describe, expect, it, jest } from "@jest/globals";
import { BadRequestException } from "@nestjs/common";
import { WidgetsResolver } from "./widgets.resolver.js";
import { LIMITS } from "./widget.schema.js";
import type { WidgetsService } from "./widgets.service.js";

const ID = "w_0123456789abcdef0123456789abcdef";
const DOCUMENT =
  '{"schemaVersion":"1.0","canvas":{"width":600},"root":{"id":"r","type":"container"}}';
const user = { loginName: "member" } as never;

function setup() {
  const save = jest.fn<WidgetsService["save"]>().mockResolvedValue({} as never);
  const list = jest.fn<WidgetsService["list"]>().mockResolvedValue([] as never);
  const publish = jest
    .fn<WidgetsService["publish"]>()
    .mockResolvedValue({} as never);
  const unpublish = jest
    .fn<WidgetsService["unpublish"]>()
    .mockResolvedValue({} as never);
  const definition = jest
    .fn<WidgetsService["definition"]>()
    .mockResolvedValue(null);
  const versions = jest
    .fn<WidgetsService["versions"]>()
    .mockResolvedValue([] as never);
  return {
    save,
    list,
    publish,
    unpublish,
    definition,
    versions,
    resolver: new WidgetsResolver({
      save,
      list,
      publish,
      unpublish,
      definition,
      versions,
    } as unknown as WidgetsService),
  };
}

describe("writing widgets, and listing your own", () => {
  it("lists the signed-in account's widgets, and takes no argument naming one", () => {
    const { resolver, list } = setup();
    void resolver.widgets(user);
    expect(list).toHaveBeenCalledWith("member");
  });

  /* The login name is the token's, never the caller's, so there is no way to
   * write to somebody else's widget by naming an account. The database checks
   * ownership again regardless. */
  it("saves as whoever the token says is calling", async () => {
    const { resolver, save } = setup();
    await resolver.saveWidget(user, "Banner", DOCUMENT);
    expect(save).toHaveBeenCalledWith("member", null, "Banner", DOCUMENT, null);
  });

  /* What the studio read the document at, passed through so the database can
   * refuse a save over work nobody has seen. */
  it("passes on the version the caller opened", async () => {
    const { resolver, save } = setup();
    await resolver.saveWidget(user, "Banner", DOCUMENT, ID, 4);
    expect(save.mock.calls[0]?.[4]).toBe(4);
  });

  it("refuses a version that is not a version number", () => {
    const { resolver, save } = setup();
    expect(() => resolver.saveWidget(user, "Banner", DOCUMENT, ID, 0)).toThrow(
      /not a version number/,
    );
    expect(() =>
      resolver.saveWidget(user, "Banner", DOCUMENT, ID, 1.5),
    ).toThrow(/not a version number/);
    expect(save).not.toHaveBeenCalled();
  });

  it("names the widget being saved to when it was given one", async () => {
    const { resolver, save } = setup();
    await resolver.saveWidget(user, "Banner", DOCUMENT, ID);
    expect(save.mock.calls[0]?.[1]).toBe(ID);
  });

  it("trims the name, so a stray space is not part of it", async () => {
    const { resolver, save } = setup();
    await resolver.saveWidget(user, "  Banner  ", DOCUMENT);
    expect(save.mock.calls[0]?.[2]).toBe("Banner");
  });

  /* Thrown rather than rejected, because these three refusals happen before
   * anything asynchronous starts: the argument is wrong, and there is no
   * reason to open a promise to say so. */
  it("refuses a widget with no name at all", () => {
    const { resolver, save } = setup();
    expect(() => resolver.saveWidget(user, "   ", DOCUMENT)).toThrow(
      BadRequestException,
    );
    expect(save).not.toHaveBeenCalled();
  });

  /* An id from somewhere else is refused on its shape, before a query is made
   * with it and before the refusal could be about ownership. Every operation
   * here does it, which is why the check is one method. */
  it("refuses something that is not a widget id", () => {
    const { resolver, save } = setup();
    expect(() =>
      resolver.saveWidget(user, "Banner", DOCUMENT, "w_not-hex"),
    ).toThrow(/not a widget id/);
    expect(save).not.toHaveBeenCalled();
  });

  /* The body limit already refuses anything enormous, but it refuses it as a
   * 413 with nothing in it about widgets. This is the same bound said in the
   * document's own terms, and said before the JSON is parsed. */
  it("refuses a document longer than the limit without parsing it", () => {
    const { resolver, save } = setup();
    expect(() =>
      resolver.saveWidget(
        user,
        "Banner",
        "x".repeat(LIMITS.definitionBytes + 1),
      ),
    ).toThrow(/bytes/);
    expect(save).not.toHaveBeenCalled();
  });
});

describe("deciding what the world sees", () => {
  /* Publishing and rolling back are the same operation with a different number,
   * which is why there is no rollback mutation to test. */
  it("publishes the version it was told to", async () => {
    const { resolver, publish } = setup();
    await resolver.publishWidget(user, ID, 3);
    expect(publish).toHaveBeenCalledWith("member", ID, 3);
  });

  it("publishes an earlier version just as readily, which is the rollback", async () => {
    const { resolver, publish } = setup();
    await resolver.publishWidget(user, ID, 1);
    expect(publish.mock.calls[0]?.[2]).toBe(1);
  });

  it("refuses to publish something that is not a version", () => {
    const { resolver, publish } = setup();
    expect(() => resolver.publishWidget(user, ID, -1)).toThrow(
      /not a version number/,
    );
    expect(publish).not.toHaveBeenCalled();
  });

  it("refuses to publish an id that is not a widget id", () => {
    const { resolver, publish } = setup();
    expect(() => resolver.publishWidget(user, "w_nope", 1)).toThrow(
      /not a widget id/,
    );
    expect(publish).not.toHaveBeenCalled();
  });

  /* Unpublishing names no version, because there is nothing to name: it points
   * browsers at nothing and deletes nothing. */
  it("unpublishes without a version", async () => {
    const { resolver, unpublish } = setup();
    await resolver.unpublishWidget(user, ID);
    expect(unpublish).toHaveBeenCalledWith("member", ID);
  });
});

describe("reading your own widgets back", () => {
  /* No version means the draft, because that is what opening a widget to work
   * on it means. */
  it("reads the draft when no version is named", async () => {
    const { resolver, definition } = setup();
    await resolver.widgetDefinition(user, ID);
    expect(definition).toHaveBeenCalledWith("member", ID, null);
  });

  it("reads the version that was named, which is how an old one is looked at", async () => {
    const { resolver, definition } = setup();
    await resolver.widgetDefinition(user, ID, 2);
    expect(definition.mock.calls[0]?.[2]).toBe(2);
  });

  it("asks as whoever the token says is calling, never as an argument", async () => {
    const { resolver, definition, versions } = setup();
    await resolver.widgetDefinition(user, ID);
    await resolver.widgetVersions(user, ID);
    expect(definition.mock.calls[0]?.[0]).toBe("member");
    expect(versions.mock.calls[0]?.[0]).toBe("member");
  });

  it("refuses an id that is not a widget id, before asking anybody", () => {
    const { resolver, definition, versions } = setup();
    expect(() => resolver.widgetDefinition(user, "nonsense")).toThrow(
      /not a widget id/,
    );
    expect(() => resolver.widgetVersions(user, "nonsense")).toThrow(
      /not a widget id/,
    );
    expect(definition).not.toHaveBeenCalled();
    expect(versions).not.toHaveBeenCalled();
  });
});
