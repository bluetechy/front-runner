import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";
import { Public } from "../authentication/index.js";
import { loginCode } from "./sms.copy.js";
import { SmsService } from "./sms.service.js";

// The one door into this API that Keycloak knocks on.
//
// Everything else in this application is the other way round: main-api asks
// Keycloak about accounts. This exists because the decision and the delivery
// live in different places on purpose. Whether a login proceeds is Keycloak's
// call and is made inside its own authenticator -- the code is generated
// there, held in the authentication session there and compared there -- while
// the Twilio credentials and the wording of the message are this API's, next
// to the mail it already sends. So the authenticator makes a code it never
// tells us the meaning of, and asks for it to be carried to a number.
//
// **It is not GraphQL and it is not behind a token**, and both of those are
// deliberate. The caller is a Java authenticator in a different process with
// no account and no session -- there is nobody for a bearer token to be about
// -- and a GraphQL client inside Keycloak would be a second schema to keep in
// step with this one. What stands in for authentication is a shared secret on
// a header, compared in constant time, on a port that is not published outside
// the Compose network.
//
// What it will not do is take a message. The body is a number and a code, and
// the sentence around them is written here: an endpoint that sent whatever
// text it was handed would be an open relay for anybody who ever learns the
// secret, and the worst thing you can do to somebody with a text message is
// write it yourself.
@Controller("internal/sms")
@Public()
export class SmsController {
  private readonly logger = new Logger(SmsController.name);
  private readonly secret: string;
  private readonly product: string;

  constructor(
    private readonly sms: SmsService,
    config: ConfigService,
  ) {
    this.secret = config.get<string>("SMS_GATEWAY_SECRET") ?? "";
    // The product's name as people see it, which is already configured once
    // for the mail this API sends. A second setting for the same words would
    // be a deployment where the text messages and the email come from
    // apparently different companies.
    this.product = config.get<string>("MAIL_FROM_NAME") ?? "Front Runner";
  }

  @Post("second-factor")
  @HttpCode(200)
  async secondFactor(
    @Headers("x-sms-gateway-secret") presented: string | undefined,
    @Body() body: { phoneNumber?: unknown; code?: unknown },
  ): Promise<{ sent: boolean }> {
    this.admit(presented);

    const phoneNumber = String(body.phoneNumber ?? "").trim();
    const code = String(body.code ?? "").trim();
    // Shapes rather than contents: the code's meaning is Keycloak's, and this
    // checks only that what arrived could be a number and could be a code.
    // Anything looser and a bug at the other end becomes a message to a
    // stranger.
    if (!/^\+[1-9]\d{6,14}$/.test(phoneNumber) || !/^\d{4,8}$/.test(code))
      throw new UnauthorizedException("Refused");

    if (!this.sms.available)
      throw new ServiceUnavailableException("Text messages are not available");

    const sent = await this.sms.send(
      phoneNumber,
      loginCode(this.product, code),
    );
    // Answered rather than thrown, because the authenticator has something to
    // do with it: a code nobody received must fail the login rather than sit
    // on a form waiting for digits that are not coming.
    return { sent };
  }

  // The secret, compared in constant time and never in a log.
  //
  // An API with no secret configured refuses everything rather than admitting
  // everything, which is the only safe direction: the feature not working is a
  // row on a page that says so, and the other way round is a text-message
  // gateway open to whoever finds the port.
  private admit(presented: string | undefined): void {
    if (!this.secret) {
      this.logger.warn(
        "A text message was asked for, but SMS_GATEWAY_SECRET is not set",
      );
      throw new UnauthorizedException("Refused");
    }

    const offered = Buffer.from(presented ?? "");
    const expected = Buffer.from(this.secret);
    // Lengths are compared first because timingSafeEqual throws on a mismatch,
    // and the length of a secret is not the secret.
    if (
      offered.length !== expected.length ||
      !timingSafeEqual(offered, expected)
    )
      throw new UnauthorizedException("Refused");
  }
}
