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
  return {
    save,
    list,
    resolver: new WidgetsResolver({ save, list } as unknown as WidgetsService),
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
    expect(save).toHaveBeenCalledWith("member", null, "Banner", DOCUMENT);
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
   * with it and before the refusal could be about ownership. */
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
