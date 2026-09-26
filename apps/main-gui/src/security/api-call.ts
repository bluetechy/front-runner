import { useCallback } from "react";
import { useSession } from "../authentication";

/*
 * One GraphQL call, with the signed-in person's token on it.
 *
 * This was written inside `email-api.tsx` and moved out when the activity list
 * wanted the same twenty lines. It is deliberately not a vertical of its own
 * yet: `profile/`, `wallet/` and `notifications/` each still have a copy of
 * this, and the plan written down in
 * [codebase structure](../../docs/codebase-structure.md) is that the three
 * become one `graphql/` vertical when the second of them moves onto TanStack
 * Query. Until then this is the rule about shared code applied at the size it
 * has actually come up at: twice, inside one folder.
 *
 * `whenEmpty` is what to say when the API answers with neither data nor an
 * error, which is a shape rather than a message: the sentence belongs to
 * whoever asked, because "The API returned no email addresses" is only true on
 * one of these calls.
 *
 * A call answers the one field it asked for, unwrapped, because all but one
 * of them asks for exactly one. The exception is the two-factor card, which
 * reads its factors and its recovery codes in a single round trip -- they are
 * drawn together, and two calls would let the page show a factor before it
 * knew whether there were codes behind it. That one passes "document" and
 * gets the whole `data` object back.
 */
export function useApiCall(whenEmpty: string) {
  const { getAccessToken } = useSession();

  return useCallback(
    async <T>(
      query: string,
      variables: Record<string, unknown>,
      shape: "field" | "document" = "field",
    ): Promise<T> => {
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
      const body = (await response.json()) as {
        data?: Record<string, T | null>;
        errors?: { message: string }[];
      };
      /* The API answers 200 with an errors array, so the status says nothing;
       * the first message is the one worth showing. */
      if (body.errors?.length) throw new Error(body.errors[0]!.message);
      if (shape === "document") {
        const document = body.data;
        if (!document || Object.values(document).some((field) => field == null))
          throw new Error(whenEmpty);
        return document as T;
      }
      const [result] = Object.values(body.data ?? {});
      if (result === undefined || result === null) throw new Error(whenEmpty);
      return result;
    },
    [getAccessToken, whenEmpty],
  );
}
