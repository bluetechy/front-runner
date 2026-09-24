import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { IdentityAdminService, type Account } from "../authentication/index.js";
import { DatabaseService } from "../database/index.js";
import { MailService } from "../mail/index.js";
import { PasswordReset, PasswordResetRequest } from "./password-reset.model.js";

// Forgetting a password and choosing a new one.
//
// Three parties, each doing the one thing it is for. The identity provider
// knows which account somebody named and holds the password at the end. This
// database holds the token in between, because a provider has no way to hand
// out a reset link for a message we wrote: it will mail its own, pointing at
// its own page, which is the page this flow exists to replace. And the mail is
// ours, because the link in it is.
//
// The token is made here rather than in the database, for the reason written
// on dbo.AddUserEmail: a guessable token is a way into somebody else's
// account, and Postgres has no source of randomness worth trusting with a
// secret. randomUUID is cryptographically random.
//
// The row is written before the mail goes out, and that order is deliberate:
// a message cannot carry a token that does not exist yet. A mail that then
// fails to send leaves a link nobody has, which expires in an hour and costs
// nothing; the form says the same sentence either way, because it has to.
@Injectable()
export class PasswordResetService {
  private readonly appBaseUrl: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly mail: MailService,
    private readonly identity: IdentityAdminService,
    config: ConfigService,
  ) {
    this.appBaseUrl = config.getOrThrow<string>("APP_BASE_URL");
  }

  // Ask for a link.
  //
  // An identifier that matches no account, one that matches a disabled
  // account and one that matches a real account all take the same path out of
  // here: nothing is thrown, nothing different is answered, and the only
  // difference is whether a message was sent. Anything else would make this
  // the product's own account lookup -- type a name, watch which ones come
  // back different.
  async request(identifier: string): Promise<PasswordResetRequest> {
    const account = await this.identity.findAccount(identifier);

    if (account) {
      const token = randomUUID();
      await this.db.query('SELECT * FROM dbo."StartPasswordReset"($1, $2)', [
        account.subjectId,
        token,
      ]);
      await this.sendLink(account, token);
    }

    return { Identifier: identifier };
  }

  // Follow it.
  //
  // The token is spent first and the password is set second, so a link works
  // once whatever happens next. The other order would leave a link that failed
  // at the identity provider still live in a mailbox.
  //
  // The account is read back by its subject id rather than trusted from the
  // row, because the row holds an identity and the provider holds the account: a
  // subject that no longer answers is an account that was deleted between the
  // mail and the click, and that is a refusal rather than a password set on
  // nothing.
  async reset(token: string, password: string): Promise<PasswordReset> {
    const [spent] = await this.db.query<{ SubjectId: string }>(
      'SELECT * FROM dbo."SpendPasswordReset"($1)',
      [token],
    );
    // The database raises rather than answering empty for a token it does not
    // know, so this is belt and braces on a row shape rather than a path that
    // is expected to run.
    if (!spent)
      throw new BadRequestException(
        "That password reset link is not valid or has already been used.",
      );

    const account = await this.identity.account(spent.SubjectId);
    if (!account)
      throw new BadRequestException(
        "That account is no longer here. Ask for a new link.",
      );

    await this.identity.setPassword(spent.SubjectId, password);

    return { LoginName: account.username };
  }

  // The message. It goes to the email address the provider has for the account rather
  // than to anything the form said, which is the whole of what makes this
  // safe: the person asking gets nothing, and the person who can read the
  // account's mailbox gets the link.
  //
  // The login name is in it because somebody who has forgotten a password has
  // often forgotten that too, and this message is only readable by the
  // account's owner anyway.
  private sendLink(account: Account, token: string): Promise<boolean> {
    const link = `${this.appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const name = escapeHtml(account.username);
    return this.mail.send({
      to: account.email,
      subject: "Choose a new Front Runner password",
      // Both parts say the same thing, because a reader gets one or the other
      // and neither should be the poor relation. The link is written out in
      // full in the text part: a bare "click here" is useless in a client
      // that shows no markup.
      text: [
        `Somebody asked to reset the password for ${account.username} at Front Runner.`,
        "",
        "Choose a new password here:",
        link,
        "",
        "The link works once and stops working after an hour.",
        "",
        "If this was not you, you can ignore this message. Nothing has",
        "changed, and the password you have now still works.",
      ].join("\n"),
      html: [
        `<p>Somebody asked to reset the password for ${name} at Front Runner.</p>`,
        `<p><a href="${link}">Choose a new password</a></p>`,
        "<p>The link works once and stops working after an hour.</p>",
        "<p>If this was not you, you can ignore this message. Nothing has changed, and the password you have now still works.</p>",
      ].join(""),
    });
  }
}

// The one value in this message that came from somewhere else. A username is
// the identity provider's to hold and it allows characters ours does not, so it is
// escaped rather than trusted: markup in a name would otherwise be markup in
// the mail we sent.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
