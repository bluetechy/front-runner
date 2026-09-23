import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { KeycloakAdminService } from "../authentication/index.js";
import { DatabaseService } from "../database/index.js";
import { MailService } from "../mail/index.js";
import { EmailSettings, UserEmail, VerifiedEmail } from "./emails.model.js";

// A row of dbo.VerifyUserEmail, which answers with the account rather than
// the list: the caller has a token and no session to show a list to.
interface VerifiedRow {
  UserEmailUUID: string;
  LoginName: string;
  Email: string;
  IsPrimary: boolean;
}

@Injectable()
export class EmailsService {
  private readonly appBaseUrl: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly mail: MailService,
    private readonly keycloak: KeycloakAdminService,
    config: ConfigService,
  ) {
    this.appBaseUrl = config.getOrThrow<string>("APP_BASE_URL");
  }

  // The list and the privacy switch together, because they are one screen.
  // Two queries rather than one function returning both: they are facts about
  // two different tables, and a single function joining them would answer
  // "what addresses are on this account" and "what did they tick" in one row
  // shape that suits nothing but this page.
  async settings(loginName: string): Promise<EmailSettings> {
    const [addresses, profile] = await Promise.all([
      this.db.query<UserEmail>('SELECT * FROM dbo."GetUserEmails"($1)', [
        loginName,
      ]),
      this.db.query<{ EmailIsPrivate: boolean }>(
        'SELECT "EmailIsPrivate" FROM dbo."GetUserProfile"($1)',
        [loginName],
      ),
    ]);
    return {
      Addresses: addresses,
      EmailIsPrivate: profile[0]?.EmailIsPrivate ?? false,
    };
  }

  // Add an address and mail it a link.
  //
  // The token is made here rather than in the database, which has no source
  // of randomness it should be trusted with for a secret. randomUUID is
  // cryptographically random; a guessable token would be a way to attach an
  // address somebody does not own. See dbo.AddUserEmail.
  //
  // The row is written first and the mail is sent after, and that order is
  // deliberate: a message cannot go out before there is a token to put in it,
  // and a mail server that is down should not lose the address. If the send
  // fails the address is on file, unverified, with "Send another link" beside
  // it.
  async add(loginName: string, email: string) {
    const token = randomUUID();
    const addresses = await this.db.query<UserEmail>(
      'SELECT * FROM dbo."AddUserEmail"($1, $2, $3)',
      [loginName, email, token],
    );
    const sent = await this.sendVerification(email, token);
    return { addresses, sent };
  }

  async resend(loginName: string, userEmailId: string) {
    const token = randomUUID();
    const addresses = await this.db.query<UserEmail>(
      'SELECT * FROM dbo."ResendUserEmailVerification"($1, $2, $3)',
      [loginName, userEmailId, token],
    );
    // The row the token was written to, so the message goes to the address it
    // actually verifies rather than to one the caller named.
    const address = addresses.find(
      (candidate) => candidate.UserEmailUUID === userEmailId,
    );
    const sent = address
      ? await this.sendVerification(address.Email, token)
      : false;
    return { addresses, sent };
  }

  remove(loginName: string, userEmailId: string) {
    return this.db.query<UserEmail>(
      'SELECT * FROM dbo."RemoveUserEmail"($1, $2)',
      [loginName, userEmailId],
    );
  }

  // Change the address somebody signs in with. Two writes that have to agree:
  // this application's copy and the identity provider's.
  //
  // The database goes first, because it is the one that refuses: it will not
  // promote an unverified address, and it will not touch an address belonging
  // to somebody else. Only once it has agreed is there anything to tell
  // Keycloak.
  //
  // If Keycloak then refuses, this throws and the transaction is already
  // committed, so the two disagree until the next sign-in -- at which point
  // dbo.ProvisionUser refreshes the column from the token and the database
  // quietly loses. That is the right way round: Keycloak holds the
  // credential, so Keycloak wins, and what somebody signs in with never
  // becomes an address the identity provider does not know.
  async setPrimary(loginName: string, userEmailId: string) {
    const addresses = await this.db.query<UserEmail>(
      'SELECT * FROM dbo."SetPrimaryUserEmail"($1, $2)',
      [loginName, userEmailId],
    );
    const chosen = addresses.find(
      (candidate) => candidate.UserEmailUUID === userEmailId,
    );

    const [account] = await this.db.query<{ SubjectId: string | null }>(
      'SELECT "SubjectId" FROM dbo."Users" WHERE "LoginName" = $1',
      [loginName],
    );

    // An account with no subject has never signed in through Keycloak, so
    // there is nothing there to change: dbo.ProvisionUser will claim the row
    // on its first sign-in and take the token's address then. Seeded and
    // imported rows are the case.
    if (chosen && account?.SubjectId)
      await this.keycloak.setEmail(account.SubjectId, chosen.Email);

    return addresses;
  }

  async setPrivacy(loginName: string, isPrivate: boolean) {
    await this.db.query('SELECT * FROM dbo."SetUserEmailPrivacy"($1, $2)', [
      loginName,
      isPrivate,
    ]);
    return this.settings(loginName);
  }

  // Spend a token. There is no login name here on purpose: the link is
  // followed by whoever opens the mailbox, which is the thing being proved.
  async verify(token: string): Promise<VerifiedEmail> {
    const [verified] = await this.db.query<VerifiedRow>(
      'SELECT * FROM dbo."VerifyUserEmail"($1)',
      [token],
    );
    // The database raises rather than answering empty for a token it does not
    // know, so this is belt and braces on a row shape rather than a path that
    // is expected to run.
    if (!verified) throw new Error("That verification link is not valid.");
    return { Email: verified.Email };
  }

  private sendVerification(email: string, token: string): Promise<boolean> {
    const link = `${this.appBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;
    return this.mail.send({
      to: email,
      subject: "Confirm your email address",
      // Both parts say the same thing, because a reader gets one or the other
      // and neither should be the poor relation. The link is written out in
      // full in the text part: a bare "click here" is useless in a client
      // that shows no markup.
      text: [
        "Somebody added this address to a Front Runner account.",
        "",
        "Confirm it by opening this link:",
        link,
        "",
        "The link works once and stops working after 24 hours.",
        "",
        "If this was not you, you can ignore this message. The address will",
        "not be used until somebody confirms it.",
      ].join("\n"),
      html: [
        "<p>Somebody added this address to a Front Runner account.</p>",
        `<p><a href="${link}">Confirm this email address</a></p>`,
        "<p>The link works once and stops working after 24 hours.</p>",
        "<p>If this was not you, you can ignore this message. The address will not be used until somebody confirms it.</p>",
      ].join(""),
    });
  }
}
