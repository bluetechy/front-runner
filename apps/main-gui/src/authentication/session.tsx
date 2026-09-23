import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { read, remove, write } from "../browser-storage";
import {
  endSession,
  readIdentity,
  refreshTokens,
  signInWithPassword,
  type Identity,
  type TokenSet,
} from "./keycloak";

/*
 * Who is signed in, for the whole app. One provider in main.tsx owns the
 * tokens; everything else reads them through useSession().
 *
 * Access tokens live in memory only. The refresh token is the one thing that
 * outlives the page, and where it is kept is what the dialog's "Remember me"
 * decides: local storage survives closing the browser, session storage lasts
 * as long as the tab. Neither is proof against a script running on this
 * origin -- the honest place for a browser session is an HttpOnly cookie set
 * by a server of our own, which this installation does not have.
 */

const STORAGE_KEY = "front-runner.refresh-token";

/* Refresh this far before expiry, so a call is never made with a token that
 * dies in flight. Keycloak's access tokens last five minutes. */
const REFRESH_MARGIN_MS = 30_000;

export type SessionStatus = "loading" | "signed-out" | "signed-in";

interface Session {
  status: SessionStatus;
  identity: Identity | null;
  /* A valid access token, refreshed first if it is about to expire. Null when
   * nobody is signed in. */
  getAccessToken: () => Promise<string | null>;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  /* Used by the redirect callback, which has already done the exchange. */
  adoptTokens: (tokens: TokenSet, remember: boolean) => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

function store(refreshToken: string | null, remember: boolean) {
  /* Cleared from both, so that changing "Remember me" cannot leave a second
   * copy behind in the store it used to be in. */
  remove("local", STORAGE_KEY);
  remove("session", STORAGE_KEY);
  if (!refreshToken) return;
  write(remember ? "local" : "session", STORAGE_KEY, refreshToken);
}

function stored(): { token: string; remember: boolean } | null {
  const remembered = read("local", STORAGE_KEY);
  if (remembered) return { token: remembered, remember: true };
  const current = read("session", STORAGE_KEY);
  return current ? { token: current, remember: false } : null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  /* A refresh token on disk means there is a session to restore, so the app
   * waits rather than painting a signed-out header it is about to take back.
   * Derived at mount rather than assigned from the effect, so no render ever
   * claims the wrong thing. */
  const [status, setStatus] = useState<SessionStatus>(() =>
    stored() ? "loading" : "signed-out",
  );
  const [identity, setIdentity] = useState<Identity | null>(null);

  /* The tokens are a ref as well as state: getAccessToken is called from
   * event handlers that captured an older render, and they must not refresh
   * against a stale token. */
  const tokens = useRef<TokenSet | null>(null);
  const remembered = useRef(false);
  /* One refresh at a time, however many callers ask at once. */
  const inFlight = useRef<Promise<string | null> | null>(null);

  const apply = useCallback((next: TokenSet, remember: boolean) => {
    tokens.current = next;
    remembered.current = remember;
    store(next.refreshToken, remember);
    setIdentity(readIdentity(next.accessToken));
    setStatus("signed-in");
  }, []);

  const clear = useCallback(() => {
    tokens.current = null;
    store(null, false);
    setIdentity(null);
    setStatus("signed-out");
  }, []);

  /* Restore a session from the refresh token left behind by a previous visit.
   * Runs once; an expired or revoked token just means signed out. */
  useEffect(() => {
    const saved = stored();
    if (!saved) return;

    let canceled = false;
    void (async () => {
      try {
        const next = await refreshTokens(saved.token);
        if (!canceled) apply(next, saved.remember);
      } catch {
        /* Expired, revoked, or Keycloak is down. Either way: signed out. */
        if (!canceled) clear();
      }
    })();

    return () => {
      canceled = true;
    };
  }, [apply, clear]);

  const getAccessToken = useCallback(async () => {
    const current = tokens.current;
    if (!current) return null;
    if (Date.now() < current.expiresAt - REFRESH_MARGIN_MS)
      return current.accessToken;

    inFlight.current ??= (async () => {
      try {
        const next = await refreshTokens(current.refreshToken);
        apply(next, remembered.current);
        return next.accessToken;
      } catch {
        clear();
        return null;
      } finally {
        inFlight.current = null;
      }
    })();
    return inFlight.current;
  }, [apply, clear]);

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      apply(await signInWithPassword(email, password), remember);
    },
    [apply],
  );

  const logout = useCallback(async () => {
    const current = tokens.current;
    /* Cleared first, so the UI is signed out even if Keycloak is slow. */
    clear();
    if (current) await endSession(current);
  }, [clear]);

  const value = useMemo<Session>(
    () => ({
      status,
      identity,
      getAccessToken,
      login,
      adoptTokens: apply,
      logout,
    }),
    [status, identity, getAccessToken, login, apply, logout],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): Session {
  const session = use(SessionContext);
  if (!session)
    throw new Error("useSession was called outside a <SessionProvider>");
  return session;
}
