// What to call the thing somebody logged in from, read off the request's
// User-Agent.
//
// **Deliberately coarse, and deliberately not a library.** This feeds one
// sentence on the security page, "New login on Mac OS", and the only question
// it has to answer is whether the person reading it recognizes themselves. A
// browser version and a build number would not help them and would make the
// security log a better description of somebody's hardware than it needs to
// be. The order below matters: a User-Agent naming a phone also names the
// system it is built on, so the specific tests come first.
//
// Null when nothing matches, and the caller says "New login" with no "on".
// Guessing is worse than saying nothing here: a name somebody does not
// recognize is what makes them report a login that was theirs.
const DEVICES: [RegExp, string][] = [
  [/\biPhone\b/i, "iPhone"],
  [/\biPad\b/i, "iPad"],
  [/\bAndroid\b/i, "Android"],
  [/\bMac OS X\b|\bMacintosh\b/i, "Mac OS"],
  [/\bWindows\b/i, "Windows"],
  [/\bCrOS\b/i, "ChromeOS"],
  // Last, because the phones above are all built on it or on something that
  // says so, and "Linux" over a login from a phone is a name nobody recognizes.
  [/\bLinux\b|\bX11\b/i, "Linux"],
];

export function deviceName(userAgent: string | undefined): string | null {
  if (!userAgent) return null;
  for (const [pattern, name] of DEVICES)
    if (pattern.test(userAgent)) return name;
  return null;
}

// The sentence that goes in the log. It is written here rather than in the
// database for the reason on dbo.LogSecurityEvent: the sentence knows things
// the event type does not.
export function loginDescription(device: string | null): string {
  return device ? `New login on ${device}.` : "New login.";
}

// And the one for the session ending, where the browser said so itself. The
// second person because it is the one case we know it was them: they pressed the
// button. A session the provider merely reported as finished gets a sentence
// that claims less -- see ProviderEventsService.endedDescription.
export function logoutDescription(device: string | null): string {
  return device ? `You logged out on ${device}.` : "You logged out.";
}
