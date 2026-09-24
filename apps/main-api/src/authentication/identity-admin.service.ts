// What this API needs from whoever holds the accounts.
//
// Seven operations and no more. This application's own truth -- profiles,
// organizations, the email addresses somebody has proved they read -- lives in
// dbo, so the identity provider is only ever asked about the credential half:
// which account somebody named, what address it logs in with, what its
// password is, which attempts to use that password were refused, and which
// sessions have ended. That is what keeps this list short, and a short list is
// what keeps the provider replaceable.
//
// An abstract class rather than an interface, because Nest resolves a provider
// by something that survives to runtime and an interface does not. Nothing
// outside this folder names an implementation: AuthenticationModule binds one
// to this class, so changing provider is that one line plus a new file beside
// keycloak-admin.service.ts, and no vertical is edited at all.

// What the sign-up form asks for. The password is here for the length of one
// request and is never stored, logged or answered back.
export interface NewAccount {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

// An account, cut down to what anything here does with one: who to mail, what
// to call them, and the subject id everything else is addressed by. No
// credential of any kind is in it, because no provider hands one out.
export interface Account {
  subjectId: string;
  username: string;
  email: string;
  firstName: string;
}

// A login the provider refused, read back out of its event log.
//
// The account is named by its subject id and by nothing else, which is not a
// simplification: the provider knows what somebody typed at the prompt, and it
// is frequently an email address rather than a login name. An attempt aimed at
// no account at all is not one of these, because there is nobody it happened
// to.
export interface LoginFailure {
  subjectId: string;
  // When the provider refused it, which is minutes before anything here hears
  // about it.
  at: Date;
  // The provider's own word for why, where it says one: Keycloak writes
  // "invalid_user_credentials" and its neighbors. Null when it says nothing,
  // and never shown to anybody as it stands -- see ProviderEventsService, which
  // turns the ones worth a sentence into one.
  reason: string | null;
}

// A session the provider says is over, read back out of its event log.
//
// **It is named by the session and by nothing else**, and unlike a refused
// login there is no subject here to fall back on: the provider does not know
// whose session it was by the time it refuses a token refresh for one, because
// the session it would have looked the answer up in is the thing that is gone.
// (Verified against Keycloak, whose REFRESH_TOKEN_ERROR carries a session id and
// no user id at all.) Whoever records one of these resolves the account from the
// login it already wrote for that session, which is also what stops anything
// here having to trust a subject a provider handed back.
export interface EndedSession {
  sessionId: string;
  // When it ended, which is up to a sweep before anything here hears about it.
  at: Date;
  // Whether somebody ended it on purpose, as against it running out or being
  // taken away. True where the provider recorded a logout; false where all it
  // recorded was refusing to refresh a token for a session already gone, which
  // is what an idle session, a session past its maximum lifespan, and a session
  // somebody revoked all look like from outside. It picks which sentence the
  // page shows and nothing else.
  deliberate: boolean;
}

export abstract class IdentityAdminService {
  // Point an account's login address at a new one, already verified: this is
  // only reached for an address dbo.SetPrimaryUserEmail has refused to promote
  // until a link sent to it was followed, so asking the provider to ask again
  // would be asking twice.
  //
  // The subject is dbo.Users."SubjectId". It is never taken from a request:
  // the caller reads it from the row the verified token resolved to.
  abstract setEmail(subjectId: string, email: string): Promise<void>;

  // Make an account and give it its password in the same call, enabled and
  // ready to log in with, because the sign-up dialog logs in with it the
  // moment this returns.
  //
  // Implementations throw BadRequestException for details a person can fix --
  // a name already taken, a password a policy refused -- and
  // ServiceUnavailableException for anything else, because the difference is
  // whether the form should show a sentence or the site should say come back.
  abstract createUser(account: NewAccount): Promise<void>;

  // Which account somebody named on the forgot-password form, by username or
  // by email address.
  //
  // Null covers every way this can come to nothing: no such account, an
  // account with no address to mail, a disabled account. Deliberately: the
  // caller must not be able to tell them apart, and neither must the form.
  abstract findAccount(identifier: string): Promise<Account | null>;

  // The account a spent reset token belongs to. The subject id comes from our
  // own table, never from a request.
  abstract account(subjectId: string): Promise<Account | null>;

  // Set an account's password, which is the end of a reset. Permanent rather
  // than temporary: somebody who has just typed a new password twice has
  // chosen one, and a provider's own "update your password" page at the next
  // login is the page this whole flow exists to avoid.
  abstract setPassword(subjectId: string, password: string): Promise<void>;

  // The most recently refused logins on this realm, newest first, at most
  // `limit` of them.
  //
  // The only read here that is not about one named account, and the only one
  // that exists because the provider sees something this application cannot: a
  // password it refused mints no token, so a failed login never reaches the
  // request path at all. Whoever calls this is mirroring, and where to resume
  // from is the caller's business rather than an argument here -- a window
  // argument would be six spellings of a date across six providers.
  //
  // Implementations throw ServiceUnavailableException when the provider cannot
  // be reached or will not answer, including when it has not been configured to
  // keep these events. An empty list means it answered and there were none.
  abstract loginFailures(limit: number): Promise<LoginFailure[]>;

  // The sessions most recently ended on this realm, newest first, at most
  // `limit` of them.
  //
  // Here for the same reason as the read above it and not quite: a logout is
  // something this application can sometimes see and often cannot. The browser
  // reports the one somebody pressed a button for, while a session that ran out,
  // was revoked, or was ended from the provider's own pages ends without a
  // request ever reaching here. This is the read that covers the rest.
  //
  // No resume argument, for the reason loginFailures has none, and it needs one
  // even less: recording one of these is idempotent on the session, so offering
  // the same ended session twice costs a refused insert rather than a second row
  // on somebody's page.
  //
  // Implementations throw ServiceUnavailableException on the same terms as
  // loginFailures. An empty list means it answered and there were none.
  abstract endedSessions(limit: number): Promise<EndedSession[]>;
}
