// What this API needs from whoever holds the accounts.
//
// Seventeen operations and no more. This application's own truth -- profiles,
// organizations, the email addresses somebody has proved they read -- lives in
// dbo, so the identity provider is only ever asked about the credential half:
// which account somebody named, what address it logs in with, what its
// password is, when that password was last set, whether somebody typing one
// has it right, which other providers it can be logged in from and which of
// those it has already been, which second factors it holds and what number one
// of them texts, which attempts to use it were refused, and which sessions are
// open or have ended. That is what keeps this list short, and a short list is
// what keeps the provider replaceable.
//
// Every one of them is an intent rather than an errand. `endOtherSessions`
// takes the session to keep instead of answering with a list for somebody else
// to loop over, because "which sessions does this account have open" is a
// question only the provider's own vocabulary can answer and the port would be
// handing that vocabulary out.
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

// Somewhere else an account can be logged in from: Google, an employer's SAML,
// whatever the realm has been given.
//
// `name` is what the provider was told to call it on a button, which is not
// the alias: aliases are slugs and "apple" is displayed as "Apple ID". The
// security page shows the name and addresses everything by the alias.
//
// `enabled` is the honest half. Every provider this realm knows about is
// answered, switched on or not, because "we do not offer Google" and "Google
// is configured but turned off this week" are the same row to somebody reading
// the page and a different thing to whoever has to fix it. The card draws the
// switched-off ones and does not offer to connect them.
export interface LoginProvider {
  alias: string;
  name: string;
  enabled: boolean;
}

// One of those providers, already connected to an account.
//
// The alias says which, and `userName` is what the account is called over
// there: the Google address, the Apple relay address. It is shown under the
// provider's name on the security page so that somebody with two Google
// accounts can see which of them they connected, and it is null where the
// provider handed back nothing to show.
export interface LinkedLogin {
  alias: string;
  userName: string | null;
}

// A second factor the provider holds for an account: the authenticator app, a
// phone number to text, and whatever else a provider learns to hold.
//
// `kind` is the port's word rather than the provider's, and the two kinds here
// are not even the same sort of thing at the provider. Keycloak calls the
// first one an "otp" credential and stamps a "subType" of "totp" inside it;
// the second is not a credential at all but an attribute on the account, read
// at login by an authenticator running inside Keycloak. A provider that held a
// passkey would call that something else again. The security page draws rows
// rather than credential types, so implementations map their own vocabulary
// onto this one, and a factor an implementation has no word for is left out
// rather than guessed at.
//
// `id` is the provider's handle for it, and the one field here that is not for
// reading: removeSecondFactor is addressed by it. `createdAt` is when it was
// set up, which is the line the card shows, and null where the provider will
// not say.
export interface SecondFactor {
  kind: "authenticator-app" | "sms";
  id: string;
  // What it was labeled where it was set up ("iPhone"), which is the provider's
  // to have asked for and is null wherever nobody did. For a phone number it
  // is the number with all but the last digits taken out, because the card
  // shows it and a security page is exactly the wrong place to print somebody's
  // phone number in full.
  label: string | null;
  createdAt: Date | null;
}

// A passkey the provider holds for an account.
//
// Not a `SecondFactor`, and the difference is what it is for rather than how
// it is stored. A second factor is asked for *after* a password is right; a
// passkey stands in place of the password entirely, which is why it has its
// own port operations, its own vertical and its own card. Keycloak keeps the
// two apart as well: an authenticator app is an "otp" credential and a
// passkey is a "webauthn-passwordless" one, and its "webauthn" credential --
// the second-factor flavor of the same ceremony -- is deliberately not read
// here. This product does not offer that flavor, and a row claiming a passkey
// for one would promise a passwordless login the account cannot do.
//
// `id` is the provider's handle for it, and the one field here that is not
// for reading: removePasskey is addressed by it. `label` is what the person
// named it when they registered it, which is the only thing telling two rows
// apart, and null wherever the provider did not ask. `createdAt` is when it
// was registered, and null where the provider will not say.
export interface Passkey {
  id: string;
  label: string | null;
  createdAt: Date | null;
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

  // Set an account's password, which is the end of a reset and the end of a
  // change. Permanent rather than temporary: somebody who has just typed a new
  // password twice has chosen one, and a provider's own "update your password"
  // page at the next login is the page this whole flow exists to avoid.
  //
  // The provider's own password policy is checked here and nowhere else in
  // this API, which is the arrangement that matters: implementations throw
  // BadRequestException carrying the provider's sentence when it refuses one.
  // Our schemas say the same rules in front of this, so an ordinary mistake is
  // answered beside the box that caused it, but the realm is what enforces
  // them -- see apps/keycloak-idp/realm/front-runner-realm.json.
  abstract setPassword(subjectId: string, password: string): Promise<void>;

  // Whether this is the password the account has now.
  //
  // Here for one caller: the change-password card, which must not let somebody
  // who sat down at an unlocked browser replace a password they do not know.
  // It answers a boolean and nothing else -- not a session, not a token --
  // because the answer is the whole of what the question was for.
  //
  // It takes the login name rather than a subject id, because the only way any
  // provider can answer this is by being asked to authenticate, and
  // authenticating is done by name. Implementations throw
  // ServiceUnavailableException when the provider cannot be reached: a
  // provider that will not answer is not the same as a password that is wrong,
  // and telling somebody their own password is wrong when the truth is an
  // outage is the worse of the two mistakes.
  abstract verifyPassword(
    loginName: string,
    password: string,
  ): Promise<boolean>;

  // When the account's password was last set, or null where the provider will
  // not say.
  //
  // The security page shows this, and the provider is the only place it can
  // come from: our own log holds the changes made through this application,
  // which is not the same set as the times the password was set. An account
  // that has never changed one still has an answer here, which is when it was
  // created, and that is the honest thing to show rather than "never".
  abstract passwordChangedAt(subjectId: string): Promise<Date | null>;

  // End every session this account has open except one.
  //
  // A password that has been changed is worth nothing while a session somebody
  // else is holding outlives it, so changing one ends the rest. The session to
  // keep is the one the request came in on: logging somebody out of the browser
  // they are typing in would be punishing them for doing the right thing.
  //
  // It answers how many were ended, which is the sentence the page shows and
  // the only thing a caller does with it. Implementations swallow nothing and
  // throw ServiceUnavailableException, but callers are expected to record the
  // password change first: a session that outlived a change is worth reporting,
  // and losing the record of the change itself over it is not.
  abstract endOtherSessions(
    subjectId: string,
    keepSessionId: string | null,
  ): Promise<number>;

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

  // Every other provider this realm will let an account login from.
  //
  // The realm's list rather than ours: the three buttons on the login card are
  // aliases the browser sends as a hint, and which aliases actually exist is
  // the provider's answer to give. A realm with a fourth provider gets a
  // fourth row on the security page without this application being rebuilt.
  //
  // Implementations throw ServiceUnavailableException when the provider cannot
  // be reached. An empty list means it answered and there are none, which is
  // what an installation that has not been given any Google credentials says.
  abstract loginProviders(): Promise<LoginProvider[]>;

  // Which of them this account has already connected.
  //
  // A subset of the above by alias, and never more than one row per provider:
  // an account is one account at Google. The security page joins the two lists
  // rather than asking for a joined one, because what a provider can tell you
  // about a realm and what it can tell you about an account are two different
  // reads wherever they are made.
  abstract linkedLogins(subjectId: string): Promise<LinkedLogin[]>;

  // Disconnect one of them.
  //
  // It does not decide whether disconnecting is safe. That is a question about
  // the account's other ways in -- a password, another provider -- and the
  // caller is what knows the answer, because it has just read both lists to
  // draw the page. A port that refused on its own would be answering a product
  // question in provider vocabulary.
  //
  // Disconnecting a provider that is not connected is not an error. The page
  // it is asked from is a moment old by the time somebody presses the button,
  // and the end state is the one that was asked for either way.
  abstract unlinkLogin(subjectId: string, alias: string): Promise<void>;

  // Whether the account can still login with a password.
  //
  // Here for one caller and one decision: whether disconnecting the last
  // connected provider would lock somebody out of their own account. An
  // account made through our sign-up form always has one; an account that
  // arrived through Google may never have had one at all.
  //
  // False is also what an implementation answers when the provider will not
  // say, which is the safe direction: the page offers no Disconnect, and
  // somebody is inconvenienced rather than locked out.
  abstract hasPassword(subjectId: string): Promise<boolean>;

  // Which second factors the account has, if any.
  //
  // **Setting one up is not here, and cannot be.** A second factor is a secret
  // the provider mints and shows to a person once, as a QR code on a page, and
  // no admin API hands that out -- Keycloak's has no operation that creates an
  // OTP credential at all. So enrollment is a browser being sent to the
  // provider, the same shape connecting a login provider takes, and what this
  // API does is read what came of it. See apps/main-api/src/two-factor.
  //
  // Implementations throw ServiceUnavailableException when the provider will
  // not answer. Not an empty list: "this account has no second factor" is what
  // the page offers to turn one on from, and an outage must not be drawn as
  // an account left unprotected.
  abstract secondFactors(subjectId: string): Promise<SecondFactor[]>;

  // Take one away, by the id the read above gave it.
  //
  // Removing a factor that is not there is not an error, on the terms
  // unlinkLogin is refused nothing: the page it was pressed on is a moment
  // old, and the end state is the one that was asked for either way.
  //
  // It does not decide whether removing it is safe, for the reason unlinkLogin
  // does not: an account is never locked out by losing a second factor -- that
  // is the direction this makes login easier -- and what is worth saying about
  // it is a sentence on a page rather than a refusal here.
  abstract removeSecondFactor(subjectId: string, id: string): Promise<void>;

  // Put a phone number on the account as a second factor, and take the SMS
  // row's word for it that the number has been proved.
  //
  // **The exception to "setting one up is not here".** An authenticator app
  // cannot be created through an admin API because its secret is minted and
  // shown once at the provider; a phone number is not a secret and has nothing
  // to mint, so the only question about it is whether the person setting it up
  // can answer it. That question is settled before this is called -- a code
  // was sent to the number and typed back -- and this writes the answer.
  //
  // Which makes the rule about the caller absolute: **nothing may call this
  // with a number that has not just been proved.** A number written here is a
  // number the provider will text a login code to, so an unproved one is a
  // second factor pointed at somebody else's phone. The only caller is
  // TwoFactorService.confirmSmsEnrollment, and the number it passes comes out
  // of dbo.SpendPhoneVerification rather than out of the request.
  //
  // Implementations throw ServiceUnavailableException when the provider will
  // not take it. Replacing a number that is already there is not an error: it
  // is what somebody who changed phones does.
  abstract setSecondFactorPhone(
    subjectId: string,
    phoneNumber: string,
  ): Promise<void>;

  // Which passkeys the account has registered.
  //
  // **Registering one is not here, and cannot be, for a sharper reason than
  // an authenticator app.** A passkey is minted by the authenticator sitting
  // in the person's hands -- a laptop's fingerprint reader, a phone, a key on
  // a keyring -- in a ceremony the browser runs against the origin the
  // provider is served from. Nothing on this side of the network is in it. So
  // registration is a browser sent to the provider, the same shape connecting
  // a login provider takes, and what this API does is read what came of it.
  // See apps/main-api/src/passkeys.
  //
  // Implementations throw ServiceUnavailableException when the provider will
  // not answer, on the terms secondFactors throws: an empty list is what the
  // page draws "no passkeys yet" from, and an outage must not be drawn as an
  // account that has never registered one.
  abstract passkeys(subjectId: string): Promise<Passkey[]>;

  // Take one away, by the id the read above gave it.
  //
  // Removing a passkey that is not there is not an error, on the terms
  // unlinkLogin and removeSecondFactor are refused nothing: the page it was
  // pressed on is a moment old, and the end state is the one that was asked
  // for either way.
  //
  // It does not decide whether removing the last one is safe, and the caller
  // does: PasskeysService is where that sentence is, because what is worth
  // saying about it belongs on a page rather than in a refusal here.
  abstract removePasskey(subjectId: string, id: string): Promise<void>;
}
