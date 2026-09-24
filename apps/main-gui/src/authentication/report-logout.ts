/*
 * Tell main-api that this session is over.
 *
 * Logging out is a call the browser makes straight to the identity provider, so
 * **no request reaches our own API at the moment it happens** and the security
 * page would otherwise show a login with nothing under it. This is the one thing
 * in this vertical that exists to put a row on that page.
 *
 * It is not the only way that row gets written. main-api also mirrors the
 * provider's event log once a minute, which catches a logout from the provider's
 * own pages, a session that ran out, and a browser that was closed before this
 * call could land. That mirror is the floor; this is the fast path, and the only
 * one of the two that knows which device it happened on. Both write the same row
 * and the database keeps it one row, so neither has to know about the other.
 *
 * The mutation takes no arguments. Which session ended is the session on the
 * token, which is why this has to be sent while the token is still in hand: it
 * is called on the way out, before the tokens are dropped.
 */

const RECORD_LOGOUT = `mutation RecordLogout {
  recordLogout
}`;

/*
 * Sent with the token the session is about to throw away.
 *
 * **Nothing here throws and nothing here is worth waiting on for its answer.**
 * This is bookkeeping about an act that has already happened: the person pressed
 * Logout, and a network that did not carry this must not leave them looking
 * logged in. The caller has already cleared the session before this is reached.
 */
export async function reportLogout(accessToken: string): Promise<void> {
  try {
    await fetch(import.meta.env.VITE_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query: RECORD_LOGOUT, variables: {} }),
      /* Survives the page being navigated or closed while this is in flight,
       * which is exactly when a logout is sent. Without it a browser is free to
       * drop the request and the row would wait on the mirror instead. */
      keepalive: true,
    });
  } catch {
    /* An API that could not be reached, or a token it refused. The provider's
     * event log still carries the logout and the mirror will pick it up within
     * the minute, so there is nothing to retry and nothing to tell anybody. */
  }
}
