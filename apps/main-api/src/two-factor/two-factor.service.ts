import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { createHash, randomInt } from "node:crypto";
import {
  IdentityAdminService,
  type Principal,
  type SecondFactor,
} from "../authentication/index.js";
import { DatabaseService } from "../database/index.js";
import { SecurityEventsService } from "../security-events/index.js";
import {
  GeneratedRecoveryCodes,
  RecoveryCodeStatus,
  RecoveryCodeUse,
  TwoFactorMethod,
} from "./two-factor.model.js";

// Two-factor authentication: what an account has in front of its password,
// and what gets somebody back in when that thing is gone.
//
// **Turning one on does not happen here, and cannot.** The secret behind an
// authenticator app is minted by the identity provider and shown to a person
// once, as a QR code on a page, and no admin API hands one out -- Keycloak's
// has no operation that creates an OTP credential at all. So the security page
// sends the browser to Keycloak with `kc_action=CONFIGURE_TOTP`, exactly as the
// SSO card sends it off to Google, and this service is the two ends of that
// trip: what the card draws before, and what is confirmed and recorded after.
//
// Which makes `confirm` the operation worth reading twice, for the reason
// SingleSignOnService.confirm is: the browser comes back with a claim on the
// URL, and a claim on a URL is worth nothing. It names something to go and ask
// the provider about, the provider is asked, and an event is written only if
// the answer is yes.
//
// **Recovery codes are ours, and they are the one credential here that is.**
// Everything else in this vertical is Keycloak's, read and removed through the
// port. Codes are not, because the situation they exist for is the one where
// Keycloak cannot help: its token endpoint will accept nothing but a valid
// code from the app that is in the lake, so there is no way through it. What a
// code buys is the factor coming off the account, after which the ordinary
// password login works again. It does not log anybody in and it never will:
// see `useRecoveryCode`.
@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly identity: IdentityAdminService,
    private readonly events: SecurityEventsService,
  ) {}

  // Every kind this product offers, marked up with what this account has done
  // about each.
  //
  // Both rows are always answered, including the one this installation cannot
  // use. A card that dropped SMS when there was nowhere to send a message
  // would be hiding the reason it is missing from the one page whose job is
  // saying what protects an account.
  async methods(principal: Principal): Promise<TwoFactorMethod[]> {
    const subjectId = await this.subject(principal);
    return draw(await this.identity.secondFactors(subjectId));
  }

  // The browser is back from the provider's setup page.
  //
  // What it says on the way back is a hint about what to go and look at,
  // nothing more: the provider is asked what the account actually holds, and
  // an event is written only when something is there that the page can see.
  // A trip somebody abandoned halfway comes back looking exactly like a
  // finished one, and the only difference between them is Keycloak's answer.
  async confirm(
    principal: Principal,
    kind: string,
  ): Promise<TwoFactorMethod[]> {
    const subjectId = await this.subject(principal);
    const factors = await this.identity.secondFactors(subjectId);
    const rows = draw(factors);
    const row = rows.find((method) => method.Kind === kind);

    if (row?.Configured)
      await this.events.record(
        principal.loginName,
        "TwoFactorEnabled",
        `${row.Name} was turned on for your account.`,
        principal.device ?? undefined,
      );

    return rows;
  }

  // Take one off the account.
  //
  // Nothing is refused here on the grounds of leaving the account unprotected,
  // and nothing should be: a password is still a password, and an account that
  // could not turn a factor off would be an account somebody is locked into
  // rather than out of. What this owes somebody is the record, which is why the
  // event is written whatever else happens next.
  async disable(
    principal: Principal,
    kind: string,
  ): Promise<TwoFactorMethod[]> {
    const subjectId = await this.subject(principal);
    const factors = await this.identity.secondFactors(subjectId);
    const held = factors.filter((factor) => KINDS[factor.kind] === kind);

    // Not configured, which is what a page that has been open a while looks
    // like. Said rather than shrugged off: a mutation that answered "done" to
    // this would have the card report a change that never happened.
    if (held.length === 0)
      throw new BadRequestException(
        `${nameOf(kind)} is not turned on for this account.`,
      );

    for (const factor of held)
      await this.identity.removeSecondFactor(subjectId, factor.id);

    await this.events.record(
      principal.loginName,
      "TwoFactorDisabled",
      `${nameOf(kind)} was turned off for your account.`,
      principal.device ?? undefined,
    );

    return draw(await this.identity.secondFactors(subjectId));
  }

  // How many codes are left, and when the set was made.
  async recoveryCodes(principal: Principal): Promise<RecoveryCodeStatus> {
    return this.readRecoveryCodes(await this.subject(principal));
  }

  // A new set, shown once.
  //
  // The codes are made here rather than in the database, for the reason
  // written on dbo.AddUserEmail and repeated on every secret in this API:
  // Postgres has no source of randomness worth trusting with one. What is
  // stored is the hash, so this answer is the only time these strings exist
  // anywhere they can be read, and the card says so beside them.
  //
  // Making a set retires the one before it, which dbo.ReplaceRecoveryCodes
  // does in the same statement. A sheet of codes lives in a drawer forever,
  // and somebody who asks for new ones because they cannot find the old ones
  // must not be leaving ten working keys behind them.
  async generateRecoveryCodes(
    principal: Principal,
  ): Promise<GeneratedRecoveryCodes> {
    const subjectId = await this.subject(principal);
    const codes = Array.from({ length: CODE_COUNT }, () => newCode());

    await this.db.query('SELECT * FROM dbo."ReplaceRecoveryCodes"($1, $2)', [
      subjectId,
      codes.map(hashOf),
    ]);

    await this.events.record(
      principal.loginName,
      "RecoveryCodesGenerated",
      `A new set of ${CODE_COUNT} recovery codes was made for your account. Any earlier codes have stopped working.`,
      principal.device ?? undefined,
    );

    return {
      // Printed with a hyphen in the middle, which is how they are read off a
      // screen and typed back. The schema on the way in takes it out again,
      // because the hyphen is a reading aid rather than part of the secret.
      Codes: codes.map((code) => `${code.slice(0, 5)}-${code.slice(5)}`),
      Status: await this.readRecoveryCodes(subjectId),
    };
  }

  // Spend one, from the login card, and take the second factors off.
  //
  // **This does not log anybody in, and that is the shape of the whole thing.**
  // It cannot: Keycloak mints the tokens and its token endpoint will accept
  // nothing but a valid code from an account that has an authenticator app on
  // it. So what a recovery code buys is the factor coming off, and the
  // ordinary login with the ordinary password then works. The card says as
  // much, because somebody who is not told their second factor is gone will
  // believe they are still protected by it.
  //
  // Three things are proved before anything changes: which account, the
  // password, and an unspent code. The password matters as much as the code --
  // a sheet found in a drawer must not be enough on its own to strip the
  // protection off somebody's account.
  //
  // One sentence for every way this can fail. A wrong password, a wrong code,
  // an account that is not here and an account with no codes are answered
  // identically, for the reason the forgot-password card answers identically:
  // this form is reachable without a session, and anything that varied would
  // make it the product's own account lookup.
  async useRecoveryCode(
    identifier: string,
    password: string,
    code: string,
  ): Promise<RecoveryCodeUse> {
    const account = await this.identity.findAccount(identifier);
    if (!account) throw refused();

    // Checked against the provider, on the client whose direct grant has no
    // second factor in it -- see KeycloakAdminService.verifyPassword. The
    // built-in flow would refuse this account by definition: needing a code
    // is why somebody is here.
    if (!(await this.identity.verifyPassword(account.username, password)))
      throw refused();

    const [spent] = await this.db.query<{ RemainingCount: number }>(
      'SELECT * FROM dbo."SpendRecoveryCode"($1, $2)',
      [account.subjectId, hashOf(code)],
    );
    // The database answers no rows for a code that is not there, one already
    // spent, and one belonging to somebody else. All three are the same
    // sentence.
    if (!spent) throw refused();

    const factors = await this.identity.secondFactors(account.subjectId);
    for (const factor of factors)
      await this.identity.removeSecondFactor(account.subjectId, factor.id);

    await this.events.record(
      account.username,
      "RecoveryCodeUsed",
      factors.length
        ? "A recovery code was used, and two-factor authentication was turned off for your account."
        : "A recovery code was used on your account.",
    );

    return {
      TwoFactorRemoved: factors.length > 0,
      Remaining: spent.RemainingCount,
    };
  }

  private async readRecoveryCodes(
    subjectId: string,
  ): Promise<RecoveryCodeStatus> {
    const [state] = await this.db.query<{
      RemainingCount: number;
      CodeCount: number;
      CreatedAt: Date | null;
    }>('SELECT * FROM dbo."GetRecoveryCodes"($1)', [subjectId]);

    // The function answers a row of zeros for an account that has never made a
    // set, so an empty result is a read that went wrong rather than an account
    // with no codes. Drawn as "none yet" either way: this is a line on a card,
    // and a card that refused to draw because a count was missing would be
    // worse than one that says there is nothing there.
    if (!state) {
      this.logger.warn("Could not read an account's recovery codes");
      return { Remaining: 0, Total: 0, GeneratedAt: null };
    }

    return {
      Remaining: state.RemainingCount,
      Total: state.CodeCount,
      GeneratedAt: state.CreatedAt,
    };
  }

  // The account behind the session, which is where every subject id in here
  // comes from. Never off the request: an operation that let a caller name the
  // account whose second factor it was turning off would be a way to strip the
  // protection from anybody's account.
  private async subject(principal: Principal): Promise<string> {
    const account = await this.identity.findAccount(principal.loginName);
    if (!account)
      throw new BadRequestException(
        "That account is no longer here. Login again.",
      );
    return account.subjectId;
  }
}

// Ten codes to a set, which is what every product that does this settles on:
// enough that losing a phone and then losing a laptop is survivable, few
// enough to print on something somebody will keep.
const CODE_COUNT = 10;

// Ten characters from an alphabet with no 0/o, 1/l/i or u/v in it. A code is
// read off a screen and typed back in somewhere else, often from a photograph,
// and every pair of characters that look alike is a code somebody will swear
// they typed correctly.
//
// 31 characters to the 10th is about 2^49, which is far past guessing at a
// login form and is the reason the stored hash is a plain SHA-256 rather than
// a slow one: there is no dictionary to walk here. See
// apps/main-db/sql/Tables/RecoveryCodes.sql.
const ALPHABET = "abcdefghjkmnpqrstwxyz23456789";

function newCode(): string {
  // randomInt rather than Math.random, for the reason every secret in this
  // API is: one is cryptographically random and the other is a pattern.
  return Array.from(
    { length: 10 },
    () => ALPHABET[randomInt(ALPHABET.length)],
  ).join("");
}

function hashOf(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

// The provider's factors, as the card's rows.
//
// Every kind is a row whether or not the account has it and whether or not
// this installation can offer it. SMS is drawn and cannot be turned on until
// the Keycloak authenticator and the messages behind it exist -- see
// apps/keycloak-idp and the SMS notes in docs -- and until then it says so
// rather than being quietly missing.
function draw(factors: SecondFactor[]): TwoFactorMethod[] {
  const app = factors.find((factor) => factor.kind === "authenticator-app");

  return [
    {
      Kind: "authenticator-app",
      Name: "Authenticator app",
      Available: true,
      Configured: app !== undefined,
      ConfiguredAt: app?.createdAt ?? null,
      Label: app?.label ?? null,
      Recommended: true,
    },
    {
      Kind: "sms",
      Name: "SMS/Text message",
      Available: false,
      Configured: false,
      ConfiguredAt: null,
      Label: null,
      // Answered false even where it is not on offer, because the judgment is
      // about the method rather than about this installation: the day it is
      // switched on, it is still the weaker of the two.
      Recommended: false,
    },
  ];
}

// The port's word for a factor, as this vertical's kind. One entry today; the
// map rather than a comparison so that a second kind is a line here instead of
// a branch in three places.
const KINDS: Record<SecondFactor["kind"], string> = {
  "authenticator-app": "authenticator-app",
};

// What to call a kind in a sentence.
function nameOf(kind: string): string {
  return kind === "sms" ? "SMS/Text message" : "Authenticator app";
}

// The one sentence every failure of useRecoveryCode gets. Written once so
// that no branch can accidentally say something more specific.
function refused(): BadRequestException {
  return new BadRequestException(
    "That email address, password and recovery code do not match an account.",
  );
}
