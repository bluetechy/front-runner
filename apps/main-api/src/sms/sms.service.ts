import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import twilio, { type Twilio } from "twilio";

// Text messages this API sends, and the one place the credentials for sending
// them live.
//
// It is the counterpart of MailService and is arranged the same way: this is
// the transport, and what a message says belongs to whoever has something to
// say. There are two callers, and they are further apart than they look. The
// two-factor vertical sends the code that proves a number belongs to the
// account setting it up. Keycloak sends the code that decides whether a login
// proceeds -- through SmsController, because the authenticator making that
// decision runs inside Keycloak and has no Twilio credentials of its own. See
// apps/keycloak-idp/plugin.
//
// **Unconfigured is a state rather than an error.** With no TWILIO_* settings
// this service reports itself unavailable, the SMS row on the security page
// says so and offers nothing, and no message is ever attempted. That is the
// same degradation a login provider with no credentials already has, and it is
// what lets this whole feature be built, reviewed and merged before anybody
// has bought a phone number.
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly from: string;
  private readonly client: Twilio | null;

  constructor(config: ConfigService) {
    const sid = config.get<string>("TWILIO_ACCOUNT_SID") ?? "";
    const token = config.get<string>("TWILIO_AUTH_TOKEN") ?? "";
    this.from = config.get<string>("TWILIO_FROM_NUMBER") ?? "";

    // All three or none. Two out of three is a deployment half-configured, and
    // the honest reading of it is that there is nowhere to send a message:
    // answering Available and then failing on every send would put a second
    // factor on the card that nobody can finish setting up.
    this.client = sid && token && this.from ? twilio(sid, token) : null;

    if (!this.client)
      this.logger.log(
        "No Twilio credentials: SMS is offered as a second factor but not available",
      );
  }

  // Whether a message could go anywhere at all. Read by the two-factor
  // vertical to draw the SMS row, and by the controller to refuse Keycloak
  // early rather than after a round trip to Twilio.
  get available(): boolean {
    return this.client !== null;
  }

  // Send one, and say whether it went.
  //
  // It answers a boolean rather than throwing, for the reason MailService
  // does: the caller is what knows the consequence. A login code that did not
  // go out has to refuse the login, and an enrollment code that did not go out
  // has to say so beside the box, and neither of those is a decision this
  // file can make.
  //
  // The number is not logged. It is the thing the message is about, and a log
  // line is a copy of it somewhere nobody is watching.
  async send(to: string, text: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.messages.create({ to, from: this.from, body: text });
      return true;
    } catch (failure: unknown) {
      this.logger.error(
        `Could not send a text message: ${failure instanceof Error ? failure.message : "unknown error"}`,
      );
      return false;
    }
  }
}
