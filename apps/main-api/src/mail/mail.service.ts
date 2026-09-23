import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, type Transporter } from "nodemailer";

// Mail this API sends itself.
//
// There is one message today, the address-verification link on the security
// page, and it lives in the emails vertical rather than here: this is the
// transport, and what a message says is the business of whichever vertical
// has something to say. A second kind of mail adds a method there, not here.
//
// Keycloak sends its own mail, for password resets, and this does not go
// through it: Keycloak's mail is about credentials it holds, and it has no
// concept of an address on file that is not the one somebody signs in with,
// which is exactly the address this has to write to.
//
// The server is the same one the realm is pointed at. In development that is
// Mailpit, which accepts everything and delivers none of it to the outside.

export interface Message {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;
  private readonly transport: Transporter;

  constructor(config: ConfigService) {
    const address = config.getOrThrow<string>("MAIL_FROM_ADDRESS");
    const name = config.getOrThrow<string>("MAIL_FROM_NAME");
    this.from = `"${name.replace(/"/g, "")}" <${address}>`;

    this.transport = createTransport({
      host: config.getOrThrow<string>("MAIL_ADDRESS"),
      port: config.getOrThrow<number>("MAIL_SMTP_PORT"),
      // Development is Mailpit on a Compose network: no certificate to
      // verify and no credentials to present. A deployment pointing this at a
      // real server on 587 gets STARTTLS from this same setting, because
      // nodemailer upgrades when the server offers it. What it will not do is
      // authenticate, so a server that requires it needs an "auth" here and a
      // pair of environment variables to fill it.
      secure: false,
    });
  }

  // Sending is awaited rather than left running, because the caller has
  // something to say about it: dbo.AddUserEmail has already written the row
  // and the token, so a message that does not go out leaves an address
  // nobody can verify, and the page should say so rather than claim a link
  // is on its way.
  //
  // What it does not do is fail the whole mutation. The address is on file
  // either way, "Send another link" is on the row, and losing the address
  // because a mail server hiccuped would be the worse outcome. So this
  // answers whether the message went, and the caller decides what to tell
  // somebody.
  async send(message: Message): Promise<boolean> {
    try {
      await this.transport.sendMail({ from: this.from, ...message });
      return true;
    } catch (failure: unknown) {
      // The address is not logged. It is the thing the message is about, and
      // a log line is a copy of it in a place nobody is watching.
      this.logger.error(
        `Could not send "${message.subject}": ${failure instanceof Error ? failure.message : "unknown error"}`,
      );
      return false;
    }
  }
}
