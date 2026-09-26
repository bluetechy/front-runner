import { useCallback } from "react";
import { useSession } from "../authentication";

/*
 * One GraphQL call, with the signed-in person's token on it.
 *
 * This vertical is the rule in
 * [codebase structure](../../docs/codebase-structure.md) finally being
 * applied. The same twenty lines were written out inside `profile/`,
 * `wallet/` and `notifications/`, and the plan written down there was that the
 * copies become one vertical when a second slice moved onto TanStack Query.
 * The widget studio is that second slice, so here it is.
 *
 * `notifications/` and `widget-studio/` call it. `profile/` and `wallet/`
 * still hold their own copies and fetch in a `useEffect` rather than through
 * Query: moving them is a rewrite of how those two pages load rather than a
 * change of import, so it is written down in docs/TODO.md instead of being
 * done in a change about widgets. `security/` has `api-call.ts`, which is the
 * same thing with a second shape for the one call that reads two fields at
 * once.
 *
 * What it is not is a client. There is no cache here, no normalization and no
 * generated types: TanStack Query owns the caching, and what the API answers
 * is described where it is used. This is the `fetch` and the token.
 */

/* What the API answers: a `data` object, an `errors` array, or both. It always
 * answers 200, including for a refusal, so the status says nothing. */
interface GraphqlResponse<T> {
  data?: Record<string, T | null>;
  errors?: { message: string }[];
}

export function useGraphql() {
  const { getAccessToken } = useSession();

  return useCallback(
    async <Result>(
      query: string,
      variables: Record<string, unknown> = {},
      /* What to say when the API answers with neither data nor an error, which
       * is a shape rather than a message: the sentence belongs to whoever
       * asked, because "The API returned no widgets" is only true on one call. */
      whenEmpty = "The API returned nothing.",
    ): Promise<Result> => {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session has expired. Login again.");

      const response = await fetch(import.meta.env.VITE_GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
      });
      const body = (await response.json()) as GraphqlResponse<Result>;
      /* The first message is the one worth showing. The API joins a document's
       * validation failures into one of these with "; " between them, which is
       * what the studio page pulls apart to list them. */
      if (body.errors?.length) throw new Error(body.errors[0]!.message);
      const [result] = Object.values(body.data ?? {});
      if (result === undefined || result === null) throw new Error(whenEmpty);
      return result;
    },
    [getAccessToken],
  );
}
