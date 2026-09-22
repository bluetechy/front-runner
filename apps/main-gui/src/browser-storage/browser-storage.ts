/*
 * localStorage and sessionStorage, for browsers that refuse them. Reading
 * either one throws outright when site data is blocked -- Safari's private
 * mode, Chrome's "block third-party cookies" inside an iframe -- and an
 * exception there would take down the whole app on the way to deciding
 * whether anyone is signed in. Refusing to remember a session is survivable;
 * failing to render is not.
 *
 * A vertical of its own rather than `authentication`'s, because it stopped
 * being one vertical's business the moment `language` also had something
 * worth remembering between visits.
 */

type Kind = "local" | "session";

function store(kind: Kind): Storage | null {
  try {
    return kind === "local" ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

export function read(kind: Kind, key: string): string | null {
  try {
    return store(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function write(kind: Kind, key: string, value: string): void {
  try {
    store(kind)?.setItem(key, value);
  } catch {
    /* Out of quota, or refused. The session simply will not be remembered. */
  }
}

export function remove(kind: Kind, key: string): void {
  try {
    store(kind)?.removeItem(key);
  } catch {
    /* Nothing to do: it was never written. */
  }
}
