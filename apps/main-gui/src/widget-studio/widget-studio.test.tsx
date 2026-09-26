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
import type { SavedWidget, WidgetSummary } from "./widgets-api";

/*
 * The studio page: a name, an id, a box of JSON and a Save button.
 *
 * The API is stubbed -- it has a test of its own -- so what is under test here
 * is the page's own work, and almost all of that is the refusal: a pasted
 * document is wrong the first few times, and what the page does with the list
 * of problems the API sends back is the whole quality of the page.
 */

const ID = "w_0123456789abcdef0123456789abcdef";

const mutateAsync = vi.fn<(input: unknown) => Promise<SavedWidget>>();
const widgets = vi.fn<() => unknown>();

vi.mock("./widgets-api", async () => {
  const actual =
    await vi.importActual<typeof import("./widgets-api")>("./widgets-api");
  return {
    problemsIn: actual.problemsIn,
    useWidgets: () => widgets(),
    useSaveWidget: () => ({ mutateAsync, isPending: false }),
  };
});

const saved = (extra: Partial<SavedWidget> = {}): SavedWidget => ({
  WidgetId: ID,
  Name: "Black Friday banner",
  Version: 1,
  UpdatedAt: "2026-02-01T00:00:00.000Z",
  ...extra,
});

const summary = (extra: Partial<WidgetSummary> = {}): WidgetSummary => ({
  WidgetId: ID,
  Name: "Black Friday banner",
  Version: 2,
  CreatedAt: "2026-01-01T00:00:00.000Z",
  UpdatedAt: "2026-02-01T00:00:00.000Z",
  ...extra,
});

const { WidgetStudio } = await import("./widget-studio");

const draw = () =>
  render(
    <ThemeProvider theme={theme}>
      <WidgetStudio />
    </ThemeProvider>,
  );

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Save widget" }));

const definitionBox = () => screen.getByRole("textbox", { name: "Definition" });

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue(saved());
  widgets.mockReturnValue({ data: [], isPending: false, error: null });
});

describe("pasting a definition in", () => {
  /* A page whose one control is an empty text area does not say what it wants.
   * The example is also a working document: pressing Save without touching it
   * publishes a real banner, which is the fastest way to see the whole path. */
  it("starts with a working example in the box", () => {
    draw();
    expect(String((definitionBox() as HTMLTextAreaElement).value)).toContain(
      '"schemaVersion": "1.0"',
    );
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
    });
  });

  /* The id is the thing somebody came to this page for, so it is in the
   * sentence rather than only in the table underneath. */
  it("says the id it got back", async () => {
    draw();
    save();
    expect(await screen.findByText(new RegExp(ID))).toBeInTheDocument();
  });

  /* And it goes into the id field, so the next Save is a second version of the
   * same widget rather than a second widget. */
  it("keeps saving to the same widget afterwards", async () => {
    draw();
    save();
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Widget id" })).toHaveValue(
        ID,
      ),
    );

    mutateAsync.mockResolvedValue(saved({ Version: 2 }));
    save();
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    expect(mutateAsync.mock.calls[1]?.[0]).toMatchObject({ widgetId: ID });
  });

  it("will not save with no name", () => {
    draw();
    fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
      target: { value: "  " },
    });
    expect(screen.getByRole("button", { name: "Save widget" })).toBeDisabled();
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

  /* The problems from a previous attempt are not the problems with this one. */
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

describe("choosing a widget out of the list", () => {
  /*
   * The name and the id, not the definition. Reading a definition back would
   * mean a second answer to "what is on the screen": the box would hold version
   * 4 while the list said 5, and a save would quietly write whichever the page
   * happened to be holding.
   */
  it("takes its id and its name, and leaves the box alone", async () => {
    widgets.mockReturnValue({
      data: [summary({ Name: "Spring sale" })],
      isPending: false,
      error: null,
    });
    draw();
    const before = (definitionBox() as HTMLTextAreaElement).value;

    fireEvent.click(screen.getByRole("button", { name: "Save over" }));

    expect(screen.getByRole("textbox", { name: "Widget id" })).toHaveValue(ID);
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
      "Spring sale",
    );
    expect((definitionBox() as HTMLTextAreaElement).value).toBe(before);
    const alerts = await screen.findAllByRole("alert");
    expect(
      alerts.some((alert) =>
        alert.textContent?.includes(
          "Saving will add a version to Spring sale.",
        ),
      ),
    ).toBe(true);
  });

  it("goes back to making a new widget when asked", async () => {
    draw();
    save();
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Widget id" })).toHaveValue(
        ID,
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Start a new widget" }));
    expect(screen.getByRole("textbox", { name: "Widget id" })).toHaveValue("");
  });
});
