// What this API needs from whoever holds the accounts.
//
// Six operations and no more. This application's own truth -- profiles,
// organizations, the email addresses somebody has proved they read -- lives in
// dbo, so the identity provider is only ever asked about the credential half:
// which account somebody named, what address it logs in with, what its
// password is, and which attempts to use that password were refused. That is
// what keeps this list short, and a short list is what keeps the provider
// replaceable.
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
  // and never shown to anybody as it stands -- see LoginFailuresService, which
  // turns the ones worth a sentence into one.
  reason: string | null;
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
}
