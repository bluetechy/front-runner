import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "../authentication";
import { useGraphql } from "../graphql";

/*
 * The widgets on this account, and the one way to save one.
 *
 * Through TanStack Query and the shared `graphql/` vertical, which is what
 * `notifications/` does: a save has to move the list beside it, and one
 * invalidation is the whole of that.
 */

const NOTHING_CAME_BACK = "The API returned no widgets.";

const WIDGETS = ["widgets"] as const;

const READ = `query Widgets {
  widgets { WidgetId Name Version CreatedAt UpdatedAt }
}`;

const SAVE = `mutation SaveWidget($name: String!, $definition: String!, $widgetId: String) {
  saveWidget(name: $name, definition: $definition, widgetId: $widgetId) {
    WidgetId Name Version UpdatedAt
  }
}`;

/* One widget as the list shows it. The definition is deliberately not in here:
 * the list is a table of names, and a page of definitions would be several
 * hundred kilobytes to draw one. */
export interface WidgetSummary {
  WidgetId: string;
  Name: string;
  /* Which version is being served. It rises by one on every save, and it is
   * what makes a stale cache on a customer's page visible. */
  Version: number;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface SavedWidget {
  WidgetId: string;
  Name: string;
  Version: number;
  UpdatedAt: string;
}

export interface WidgetToSave {
  name: string;
  definition: string;
  /* Absent means "make a new one". The page passes the id when somebody chose
   * a widget out of the list to save over. */
  widgetId?: string;
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

/*
 * Save a definition.
 *
 * The definition goes as the text somebody pasted rather than as a parsed
 * object, which is what the API wants: a JSON syntax error in it is then a
 * sentence about the character it broke at, said by the same validator that
 * decides everything else about the document. The browser does not parse it
 * first, and deliberately does not check it either -- there is one authority
 * for what a valid widget is and it is not in this bundle.
 */
export function useSaveWidget() {
  const call = useGraphql();
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ name, definition, widgetId }: WidgetToSave) =>
      call<SavedWidget>(
        SAVE,
        { name, definition, widgetId: widgetId ?? null },
        NOTHING_CAME_BACK,
      ),
    /* A save either adds a row or moves one to the top, so the list is
     * refetched rather than patched. */
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
