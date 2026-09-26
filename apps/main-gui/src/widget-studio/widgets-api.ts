import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useSession } from "../authentication";
import { useGraphql } from "../graphql";

/*
 * The widgets on this account: listing them, reading one back, saving a draft,
 * and deciding which version the world sees.
 *
 * Through TanStack Query and the shared `graphql/` vertical, which is what
 * `notifications/` does: a save or a publish has to move the list beside it, and
 * one invalidation is the whole of that.
 *
 * **Saving and publishing are separate calls on purpose**, because they are
 * separate acts: a save writes a version nobody is being served, and a publish
 * points browsers at one. Rolling back is publishing an earlier version, so
 * there is no third mutation for it.
 */

const NOTHING_CAME_BACK = "The API returned no widgets.";

const WIDGETS = ["widgets"] as const;

const READ = `query Widgets {
  widgets { WidgetId Name DraftVersion PublishedVersion CreatedAt UpdatedAt }
}`;

const DEFINITION = `query WidgetDefinition($widgetId: String!, $version: Int) {
  widgetDefinition(widgetId: $widgetId, version: $version) {
    WidgetId Name Version SchemaVersion Definition IsPublished CreatedAt
  }
}`;

const VERSIONS = `query WidgetVersions($widgetId: String!) {
  widgetVersions(widgetId: $widgetId) {
    Version SchemaVersion IsPublished IsDraft CreatedAt CreatedBy
  }
}`;

const SAVED_FIELDS = "WidgetId Name DraftVersion PublishedVersion UpdatedAt";

const SAVE = `mutation SaveWidget($name: String!, $definition: String!, $widgetId: String, $expectedDraftVersion: Int) {
  saveWidget(name: $name, definition: $definition, widgetId: $widgetId, expectedDraftVersion: $expectedDraftVersion) {
    ${SAVED_FIELDS}
  }
}`;

const PUBLISH = `mutation PublishWidget($widgetId: String!, $version: Int!) {
  publishWidget(widgetId: $widgetId, version: $version) { ${SAVED_FIELDS} }
}`;

const UNPUBLISH = `mutation UnpublishWidget($widgetId: String!) {
  unpublishWidget(widgetId: $widgetId) { ${SAVED_FIELDS} }
}`;

/*
 * One widget as the list shows it. The definition is deliberately not in here:
 * the list is a table of names, and a page of definitions would be several
 * hundred kilobytes to draw one.
 *
 * The two version numbers are the whole lifecycle. Equal means everything saved
 * is live; different means there is a draft nobody is being served; null means
 * the widget is on nobody's site at all.
 */
export interface WidgetSummary {
  WidgetId: string;
  Name: string;
  DraftVersion: number;
  PublishedVersion: number | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface SavedWidget {
  WidgetId: string;
  Name: string;
  DraftVersion: number;
  PublishedVersion: number | null;
  UpdatedAt: string;
}

/* One version's document, as read back. `Definition` is JSON text, which is
 * what the API stores and what the box holds. */
export interface WidgetDocument {
  WidgetId: string;
  Name: string;
  Version: number;
  SchemaVersion: string;
  Definition: string;
  IsPublished: boolean;
  CreatedAt: string;
}

export interface WidgetVersion {
  Version: number;
  SchemaVersion: string;
  IsPublished: boolean;
  IsDraft: boolean;
  CreatedAt: string;
  CreatedBy: string;
}

export interface WidgetToSave {
  name: string;
  definition: string;
  /* Absent means "make a new one". The page passes the id when it is saving
   * over a widget it opened or chose. */
  widgetId?: string;
  /* The draft version the page read the document at. The API refuses the save
   * if the draft has moved since, rather than writing over work nobody has
   * seen. Absent for a widget that was never opened. */
  expectedDraftVersion?: number;
}

export function useWidgets() {
  const call = useGraphql();
  const { status } = useSession();

  return useQuery({
    queryKey: [...WIDGETS, "list"],
    queryFn: () => call<WidgetSummary[]>(READ, {}, NOTHING_CAME_BACK),
    /* Nothing to ask for until there is a token to ask with. The `_app` route
     * sends a signed-out visitor back to the landing page, so this is the
     * moment before the session has settled rather than a state the page sits
     * in. */
    enabled: status === "signed-in",
  });
}

/* A widget's history, asked for only while one is open: a page that is making a
 * new widget has nothing to show a history of. */
export function useWidgetVersions(widgetId: string) {
  const call = useGraphql();
  const { status } = useSession();

  return useQuery({
    queryKey: [...WIDGETS, "versions", widgetId],
    queryFn: () =>
      call<WidgetVersion[]>(VERSIONS, { widgetId }, NOTHING_CAME_BACK),
    enabled: status === "signed-in" && widgetId !== "",
  });
}

/*
 * Read one definition back, when somebody asks for it.
 *
 * A function rather than a hook with a key, because opening a widget is an act
 * with a moment: it replaces what is in the box, and a query that re-ran on its
 * own would take an edit away from whoever was making it. `fetchQuery` still
 * puts the answer in the cache, so opening the same version twice costs one
 * request.
 *
 * `version` left out means the draft, which is what opening a widget to work on
 * it means.
 */
export function useOpenWidget() {
  const call = useGraphql();
  const client = useQueryClient();

  return useCallback(
    (widgetId: string, version?: number) =>
      client.fetchQuery({
        queryKey: [...WIDGETS, "definition", widgetId, version ?? "draft"],
        queryFn: () =>
          call<WidgetDocument>(
            DEFINITION,
            { widgetId, version: version ?? null },
            "That widget has no such version.",
          ),
        /*
         * **A numbered version never changes.** Versions are appended and never
         * overwritten, so version 3 of a widget is the same document forever:
         * once it has been read there is no reason to ask again, and opening an
         * old version twice while comparing it with another should not cost two
         * requests.
         *
         * The draft is the opposite. It moves every time anybody saves, this
         * tab included, so it is fetched afresh every time somebody opens it --
         * which is also what makes the stale-draft refusal meaningful rather
         * than something a cache could cause.
         */
        staleTime: version === undefined ? 0 : Infinity,
      }),
    [call, client],
  );
}

/*
 * Save a definition.
 *
 * The definition goes as the text somebody pasted rather than as a parsed
 * object, which is what the API wants: a JSON syntax error in it is then a
 * sentence about the character it broke at, said by the same validator that
 * decides everything else about the document. The browser does not parse it
 * first, and deliberately does not check it either: there is one authority for
 * what a valid widget is and it is not in this bundle.
 */
export function useSaveWidget() {
  const call = useGraphql();
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      definition,
      widgetId,
      expectedDraftVersion,
    }: WidgetToSave) =>
      call<SavedWidget>(
        SAVE,
        {
          name,
          definition,
          widgetId: widgetId ?? null,
          expectedDraftVersion: expectedDraftVersion ?? null,
        },
        NOTHING_CAME_BACK,
      ),
    /* A save adds a row, moves one to the top, or adds a version to the history
     * on screen. All three are refetches rather than patches: getting a handful
     * of names again costs less than a cache that is subtly wrong. */
    onSuccess: () => client.invalidateQueries({ queryKey: WIDGETS }),
  });
}

/*
 * Publish a version, which is also how a widget is rolled back.
 *
 * The version is always named. "Publish the latest" would mean something
 * different depending on when the request landed, and the page always knows
 * which version it means: the one on the row somebody pressed.
 */
export function usePublishWidget() {
  const call = useGraphql();
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({
      widgetId,
      version,
    }: {
      widgetId: string;
      version: number;
    }) => call<SavedWidget>(PUBLISH, { widgetId, version }, NOTHING_CAME_BACK),
    onSuccess: () => client.invalidateQueries({ queryKey: WIDGETS }),
  });
}

/* Take a widget off the sites it is on. Nothing is deleted: the id, the draft
 * and every version stay, and publishing again puts it back. */
export function useUnpublishWidget() {
  const call = useGraphql();
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ widgetId }: { widgetId: string }) =>
      call<SavedWidget>(UNPUBLISH, { widgetId }, NOTHING_CAME_BACK),
    onSuccess: () => client.invalidateQueries({ queryKey: WIDGETS }),
  });
}

/*
 * The problems in a refused document, one per line.
 *
 * The API reports every failing field in one message, joined with "; ", the
 * way `ZodPipe` reports the profile form. That separator is part of the
 * contract rather than a formatting accident -- see
 * apps/main-api/docs/widgets.md -- and this is the other end of it: the toast
 * says the first thing that is wrong, and the panel under the box lists all of
 * them.
 */
export function problemsIn(message: string): string[] {
  return message
    .split(";")
    .map((problem) => problem.trim())
    .filter(Boolean);
}
