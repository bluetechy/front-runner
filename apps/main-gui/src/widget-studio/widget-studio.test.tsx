import { ThemeProvider } from "@mui/material/styles";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
/* Importing this starts i18next, which is what `main.tsx` does. Without it
 * `t()` answers the key and every sentence with a name or a version in it
 * would be asserted as "{{name}}". */
import "../language/i18n";
import type {
  SavedWidget,
  WidgetDocument,
  WidgetSummary,
  WidgetVersion,
} from "./widgets-api";

/*
 * The studio page.
 *
 * The API is stubbed -- it has a test of its own -- so what is under test here
 * is the page's own work, and that is two things.
 *
 * The first is the refusal loop: a pasted document is wrong the first few times,
 * and what the page does with the list of problems is the whole experience of
 * using it.
 *
 * The second, and the reason this file grew, is that the page has to keep the
 * box, the draft and the published version apart. Saving must never publish;
 * publishing must name a version; opening must replace what is in the box and
 * remember which version it came from, because that number is what stops a save
 * from writing over work nobody has seen.
 */

const ID = "w_0123456789abcdef0123456789abcdef";

const mutateAsync = vi.fn<(input: unknown) => Promise<SavedWidget>>();
const publishAsync = vi.fn<(input: unknown) => Promise<SavedWidget>>();
const unpublishAsync = vi.fn<(input: unknown) => Promise<SavedWidget>>();
const openWidget =
  vi.fn<(id: string, version?: number) => Promise<WidgetDocument>>();
const widgets = vi.fn<() => unknown>();
const versions = vi.fn<() => unknown>();

vi.mock("./widgets-api", async () => {
  const actual =
    await vi.importActual<typeof import("./widgets-api")>("./widgets-api");
  return {
    problemsIn: actual.problemsIn,
    useWidgets: () => widgets(),
    useWidgetVersions: () => versions(),
    useOpenWidget: () => openWidget,
    useSaveWidget: () => ({ mutateAsync, isPending: false }),
    usePublishWidget: () => ({ mutateAsync: publishAsync, isPending: false }),
    useUnpublishWidget: () => ({
      mutateAsync: unpublishAsync,
      isPending: false,
    }),
  };
});

/* The preview renders the SDK, which is tested in the SDK. Here it would only
 * add a debounce and a canvas to every assertion below. */
vi.mock("./widget-preview", () => ({
  WidgetPreview: ({ definition }: { definition: string }) => (
    <div data-testid="preview">{definition.length}</div>
  ),
}));

const saved = (extra: Partial<SavedWidget> = {}): SavedWidget => ({
  WidgetId: ID,
  Name: "Black Friday banner",
  DraftVersion: 1,
  PublishedVersion: null,
  UpdatedAt: "2026-02-01T00:00:00.000Z",
  ...extra,
});

const summary = (extra: Partial<WidgetSummary> = {}): WidgetSummary => ({
  WidgetId: ID,
  Name: "Black Friday banner",
  DraftVersion: 2,
  PublishedVersion: 1,
  CreatedAt: "2026-01-01T00:00:00.000Z",
  UpdatedAt: "2026-02-01T00:00:00.000Z",
  ...extra,
});

const document = (extra: Partial<WidgetDocument> = {}): WidgetDocument => ({
  WidgetId: ID,
  Name: "Spring sale",
  Version: 2,
  SchemaVersion: "1.0",
  Definition: '{"schemaVersion":"1.0","canvas":{"width":600}}',
  IsPublished: false,
  CreatedAt: "2026-02-01T00:00:00.000Z",
  ...extra,
});

const version = (extra: Partial<WidgetVersion> = {}): WidgetVersion => ({
  Version: 1,
  SchemaVersion: "1.0",
  IsPublished: true,
  IsDraft: false,
  CreatedAt: "2026-01-01T00:00:00.000Z",
  CreatedBy: "member",
  ...extra,
});

const { WidgetStudio } = await import("./widget-studio");

const draw = () =>
  render(
    <ThemeProvider theme={theme}>
      <WidgetStudio />
    </ThemeProvider>,
  );

const press = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));

const save = () => press("Save draft");

const definitionBox = () =>
  screen.getByRole("textbox", { name: "Definition" }) as HTMLTextAreaElement;

const idField = () => screen.getByRole("textbox", { name: "Widget id" });

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue(saved());
  publishAsync.mockReset().mockResolvedValue(saved({ PublishedVersion: 1 }));
  unpublishAsync.mockReset().mockResolvedValue(saved());
  openWidget.mockReset().mockResolvedValue(document());
  widgets.mockReturnValue({ data: [], isPending: false, error: null });
  versions.mockReturnValue({ data: [], isPending: false, error: null });
});

describe("pasting a definition in", () => {
  /* A page whose one control is an empty text area does not say what it wants.
   * The example is also a working document: saving and publishing it without
   * touching it puts a real widget on a real id. */
  it("starts with a working example in the box", () => {
    draw();
    expect(definitionBox().value).toContain('"schemaVersion": "1.0"');
  });

  it("sends what is in the box, with no id, for a new widget", async () => {
    draw();
    fireEvent.change(definitionBox(), { target: { value: '{"a": 1}' } });
    save();

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync).toHaveBeenCalledWith({
      name: "Black Friday banner",
      definition: '{"a": 1}',
      widgetId: undefined,
      expectedDraftVersion: undefined,
    });
  });

  /*
   * The sentence that keeps the lifecycle honest. Somebody who saves and is
   * told "saved" will believe their change is live; what they are told instead
   * is which version is actually being served, which is either nothing or an
   * older one.
   */
  it("says that nothing is serving a first draft", async () => {
    draw();
    save();
    expect(
      await screen.findByText(/Nothing is serving it/),
    ).toBeInTheDocument();
  });

  it("says which version is still live when there is one", async () => {
    mutateAsync.mockResolvedValue(
      saved({ DraftVersion: 5, PublishedVersion: 3 }),
    );
    draw();
    save();
    expect(
      await screen.findByText(/Version 3 is still live/),
    ).toBeInTheDocument();
  });

  /* The id goes into the field, so the next save is a second version of the
   * same widget rather than a second widget. */
  it("keeps saving to the same widget afterwards", async () => {
    draw();
    save();
    await waitFor(() => expect(idField()).toHaveValue(ID));

    mutateAsync.mockResolvedValue(saved({ DraftVersion: 2 }));
    save();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    expect(mutateAsync.mock.calls[1]?.[0]).toMatchObject({ widgetId: ID });
  });

  /* And the version it was just saved at goes with the next save, which is what
   * lets the API refuse one tab writing over another. */
  it("saves against the version it last wrote", async () => {
    mutateAsync.mockResolvedValue(saved({ DraftVersion: 4 }));
    draw();
    save();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

    save();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    expect(mutateAsync.mock.calls[1]?.[0]).toMatchObject({
      expectedDraftVersion: 4,
    });
  });

  /* An id somebody typed is not a version anybody opened: claiming to have seen
   * one would make the API's guard refuse a save that is perfectly fine, or
   * worse, let one through. */
  it("claims no version when the id was typed by hand", async () => {
    draw();
    fireEvent.change(idField(), { target: { value: ID } });
    save();

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0]?.[0]).toMatchObject({
      widgetId: ID,
      expectedDraftVersion: undefined,
    });
  });

  it("will not save with no name", () => {
    draw();
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "  " },
    });
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  });
});

describe("publishing, and taking it back down", () => {
  /* Saving is not publishing, and the page has to be the thing that never
   * blurs that: one button writes a version, the other one names a version and
   * puts it in front of browsers. */
  it("does not publish anything when it saves", async () => {
    draw();
    save();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(publishAsync).not.toHaveBeenCalled();
  });

  it("publishes the draft when asked, by number", async () => {
    widgets.mockReturnValue({
      data: [summary({ DraftVersion: 4, PublishedVersion: 1 })],
      isPending: false,
      error: null,
    });
    draw();
    fireEvent.change(idField(), { target: { value: ID } });

    press("Publish the draft");
    await waitFor(() =>
      expect(publishAsync).toHaveBeenCalledWith({ widgetId: ID, version: 4 }),
    );
    expect(await screen.findByText(/Version 4 is live/)).toBeInTheDocument();
  });

  /* Nothing to publish when the draft is already the live one, and a button
   * that did nothing would look like it had done something. */
  it("offers no publish when everything saved is already live", () => {
    widgets.mockReturnValue({
      data: [summary({ DraftVersion: 2, PublishedVersion: 2 })],
      isPending: false,
      error: null,
    });
    draw();
    fireEvent.change(idField(), { target: { value: ID } });
    expect(
      screen.getByRole("button", { name: "Publish the draft" }),
    ).toBeDisabled();
  });

  it("offers nothing to publish before there is a widget at all", () => {
    draw();
    expect(
      screen.getByRole("button", { name: "Publish the draft" }),
    ).toBeDisabled();
  });

  /* Taking a widget down is not a delete, and the sentence says so: somebody
   * pressing it needs to know their versions are still there. */
  it("takes a published widget down, and says nothing was deleted", async () => {
    widgets.mockReturnValue({
      data: [summary()],
      isPending: false,
      error: null,
    });
    draw();
    fireEvent.change(idField(), { target: { value: ID } });

    press("Take it down");
    await waitFor(() =>
      expect(unpublishAsync).toHaveBeenCalledWith({ widgetId: ID }),
    );
    expect(await screen.findByText(/Nothing was deleted/)).toBeInTheDocument();
  });

  it("offers no taking down of a widget nobody is being served", () => {
    widgets.mockReturnValue({
      data: [summary({ PublishedVersion: null })],
      isPending: false,
      error: null,
    });
    draw();
    fireEvent.change(idField(), { target: { value: ID } });
    expect(screen.queryByRole("button", { name: "Take it down" })).toBeNull();
  });
});

describe("opening a widget that was saved earlier", () => {
  /* The whole of read-back: the box holds what is stored rather than whatever
   * happened to be on the screen, and the page remembers which version that
   * was. */
  it("puts the stored definition, the name and the id into the page", async () => {
    widgets.mockReturnValue({
      data: [summary()],
      isPending: false,
      error: null,
    });
    draw();

    press("Open");
    await waitFor(() => expect(openWidget).toHaveBeenCalledWith(ID, undefined));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
        "Spring sale",
      ),
    );
    expect(idField()).toHaveValue(ID);
    expect(definitionBox().value).toContain('"schemaVersion": "1.0"');
  });

  /* Laid out here rather than stored that way: how JSON is arranged in a text
   * area is a question about a text area. */
  it("lays the stored document out to be read", async () => {
    widgets.mockReturnValue({
      data: [summary()],
      isPending: false,
      error: null,
    });
    draw();

    press("Open");
    await waitFor(() => expect(definitionBox().value).toContain("\n"));
  });

  /* Opened at a version means the next save is checked against that version. */
  it("saves against the version it opened", async () => {
    widgets.mockReturnValue({
      data: [summary()],
      isPending: false,
      error: null,
    });
    draw();

    press("Open");
    await waitFor(() => expect(idField()).toHaveValue(ID));

    save();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0]?.[0]).toMatchObject({
      expectedDraftVersion: 2,
    });
  });

  it("says whether what it opened is the version being served", async () => {
    widgets.mockReturnValue({
      data: [summary()],
      isPending: false,
      error: null,
    });
    openWidget.mockResolvedValue(document({ IsPublished: true }));
    draw();

    press("Open");
    expect(
      await screen.findByText(/which is the one being served/),
    ).toBeInTheDocument();
  });

  it("goes back to making a new widget when asked", async () => {
    draw();
    save();
    await waitFor(() => expect(idField()).toHaveValue(ID));

    press("Start a new widget");
    expect(idField()).toHaveValue("");
    expect(definitionBox().value).toContain('"schemaVersion": "1.0"');
  });
});

describe("the history", () => {
  /* Only while a widget is open: a page making a new one has no history, and a
   * panel saying "no versions" would be noise on every first visit. */
  it("is not on the page until a widget is open", () => {
    draw();
    expect(screen.queryByText("History")).toBeNull();
  });

  it("lists the versions once one is", async () => {
    widgets.mockReturnValue({
      data: [summary()],
      isPending: false,
      error: null,
    });
    versions.mockReturnValue({
      data: [
        version({ Version: 2, IsPublished: false, IsDraft: true }),
        version(),
      ],
      isPending: false,
      error: null,
    });
    draw();

    press("Open");
    await waitFor(() =>
      expect(screen.getByText("History")).toBeInTheDocument(),
    );
    expect(screen.getByText("Version 2")).toBeInTheDocument();
    expect(screen.getByText("Version 1")).toBeInTheDocument();
  });

  /* Rollback, and the thing this whole feature is for: publishing an earlier
   * version from the history is the same call as publishing the draft. */
  it("rolls back by publishing an earlier version", async () => {
    widgets.mockReturnValue({
      data: [summary({ DraftVersion: 2, PublishedVersion: 2 })],
      isPending: false,
      error: null,
    });
    versions.mockReturnValue({
      data: [
        version({ Version: 2, IsPublished: true, IsDraft: true }),
        version({ Version: 1, IsPublished: false }),
      ],
      isPending: false,
      error: null,
    });
    draw();
    fireEvent.change(idField(), { target: { value: ID } });

    const history = screen.getByText("Version 1").closest("li") as HTMLElement;
    fireEvent.click(within(history).getByRole("button", { name: "Publish" }));

    await waitFor(() =>
      expect(publishAsync).toHaveBeenCalledWith({ widgetId: ID, version: 1 }),
    );
  });

  it("opens an old version into the box to be read first", async () => {
    widgets.mockReturnValue({
      data: [summary()],
      isPending: false,
      error: null,
    });
    versions.mockReturnValue({
      data: [version({ Version: 1 })],
      isPending: false,
      error: null,
    });
    draw();
    fireEvent.change(idField(), { target: { value: ID } });

    const history = screen.getByText("Version 1").closest("li") as HTMLElement;
    fireEvent.click(within(history).getByRole("button", { name: "Open" }));

    await waitFor(() => expect(openWidget).toHaveBeenCalledWith(ID, 1));
  });
});

describe("when the API refuses the document", () => {
  const refuse = (message: string) =>
    mutateAsync.mockRejectedValue(new Error(message));

  /* Every problem the API named, listed under the box and still there in a
   * minute. A toast holding eight sentences is a toast nobody can read to the
   * end of before it goes. */
  it("lists every problem under the box", async () => {
    refuse("root.children[0].value: must be string; canvas.width: is required");
    draw();
    save();

    const panel = within(
      (await screen.findByText("canvas.width: is required")).closest(
        "#widget-problems",
      ) as HTMLElement,
    );
    expect(
      panel.getByText("root.children[0].value: must be string"),
    ).toBeInTheDocument();
    expect(panel.getByText("canvas.width: is required")).toBeInTheDocument();
  });

  it("says the first of them in the toast", async () => {
    refuse("the document: is not valid JSON (Unexpected token })");
    draw();
    save();

    const alerts = await screen.findAllByRole("alert");
    expect(
      alerts.some((alert) => alert.textContent?.includes("is not valid JSON")),
    ).toBe(true);
  });

  /* The refusal that only exists because two things can now edit the same
   * widget. It is a sentence rather than a silent overwrite. */
  it("shows the refusal when the draft moved under it", async () => {
    refuse(
      "That widget has been saved since you opened it (draft 2 is now draft 3).",
    );
    draw();
    save();

    expect(
      (await screen.findAllByText(/has been saved since you opened it/)).length,
    ).toBeGreaterThan(0);
  });

  it("clears the old problems when it tries again", async () => {
    refuse("canvas.width: is required");
    draw();
    save();
    await screen.findAllByText("canvas.width: is required");

    mutateAsync.mockResolvedValue(saved());
    save();
    await waitFor(() =>
      expect(screen.queryAllByText("canvas.width: is required")).toEqual([]),
    );
  });

  it("says something even when the failure has no message of its own", async () => {
    mutateAsync.mockRejectedValue("something happened");
    draw();
    save();
    expect(
      (await screen.findAllByText("The widget could not be saved.")).length,
    ).toBeGreaterThan(0);
  });
});
