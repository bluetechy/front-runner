import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IdentityAdminService,
  type LoginFailure,
} from "../authentication/index.js";
import { SecurityEventsService } from "./security-events.service.js";

/*
 * Refused logins, copied out of the identity provider's event log and onto the
 * account's security page.
 *
 * **Everything else on that page is written by the thing that did it.** An
 * address added, a password changed, a login that worked: this API performed it
 * or saw the token, so there is a line of code at the moment it happened.
 * A refused password is the one event with no such moment. Keycloak decides it,
 * mints nothing, and the request path never hears about it, so the only way to
 * put a failed login on the page is to ask the provider afterwards what it
 * refused. Hence a timer, which is the one in this API.
 *
 * It resumes from the newest failure already recorded rather than from the
 * moment this process booted, so a restart does not open a hole in somebody's
 * log. That stamp is the provider's own clock, which is the same clock the
 * events are stamped in, so the two never have to agree with each other. A
 * first run on an installation with no failures on record, or one that was down
 * for a week, starts at LOOKBACK rather than at the beginning of the provider's
 * log: a page filling with a year of history the moment this shipped would be
 * worse than one that starts today.
 *
 * Nothing here is deduplicated. Ten attempts are ten rows, because how many
 * there were is the fact worth reading, and that is also what makes this the
 * one event type that can flood a page on its own. **So it has an off switch**
 * and nothing else on the page does: SECURITY_LOG_FAILED_LOGINS false stops the
 * timer before it starts. The provider keeps its own event log either way, so
 * turning this off loses the mirror rather than the record.
 */

// How often to ask. A minute is well inside the interval somebody would notice
// -- the page is read after the fact, not watched -- and it is one admin call
// per minute against a provider this API already talks to.
const INTERVAL_MS = 60_000;

// The most failures written from one sweep. This is the only backstop against a
// realm being scanned: a flood is spread over sweeps rather than let into the
// database all at once, and the off switch is what a real flood calls for.
const BATCH = 100;

// How far back a sweep will reach when there is nothing on record to resume
// from. A first run, or a return from a long outage, starts here.
const LOOKBACK_MS = 24 * 60 * 60 * 1000;

/*
 * The provider's word for why it refused, turned into a sentence for the person
 * whose account it was. Only the reasons that mean something different to a
 * reader are spelled out; the rest are one honest sentence, because "a login
 * attempt failed for reason expired_code" is not English.
 *
 * The sentence is composed here rather than in the database for the reason
 * every other description is: the words the product says live in the product.
 */
const REASONS: Record<string, string> = {
  invalid_user_credentials: "Someone tried to log in with the wrong password.",
  user_temporarily_disabled:
    "Logins were blocked for a while after too many wrong passwords.",
  user_disabled: "Someone tried to log in to an account that is turned off.",
  account_disabled: "Someone tried to log in to an account that is turned off.",
  invalid_user_password: "Someone tried to log in with the wrong password.",
};

export function failureDescription(reason: string | null): string {
  return (reason && REASONS[reason]) || "A login attempt failed.";
}

@Injectable()
export class LoginFailuresService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LoginFailuresService.name);
  private readonly enabled: boolean;
  private timer: NodeJS.Timeout | null = null;
  // The provider's stamp on the newest failure written, in epoch milliseconds.
  // Null until the first sweep reads it back out of the database.
  private watermark: number | null = null;
  // Whether the last sweep already said out loud that it could not do its job.
  // A provider that is down, or a realm that was never configured to keep these
  // events, would otherwise write the same warning every minute for as long as
  // the process lives.
  private complained = false;

  constructor(
    config: ConfigService,
    private readonly identity: IdentityAdminService,
    private readonly events: SecurityEventsService,
  ) {
    // Already a boolean by the time it gets here: validateEnvironment is what
    // turns "off" in a .env file into one, and refuses a word it does not know.
    this.enabled = config.get<boolean>("SECURITY_LOG_FAILED_LOGINS") !== false;
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log(
        "Failed logins are not being recorded: SECURITY_LOG_FAILED_LOGINS is off",
      );
      return;
    }
    // Nothing is swept at boot. A restart is the moment the provider is least
    // likely to answer, and the first sweep one interval later reaches back over
    // the gap anyway.
    this.timer = setInterval(() => void this.sweep(), INTERVAL_MS);
    // So the timer never holds the process open. This is bookkeeping; it must
    // not be the reason a shutdown hangs.
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /*
   * One sweep: ask what was refused, write what is new, remember how far it got.
   *
   * Public because the timer is not the only caller worth having -- a test
   * drives it directly, and something that wanted this on demand would call it
   * rather than reach for the timer.
   *
   * A failure anywhere in here leaves the high-water mark where it got to, so
   * the next sweep picks up from the last row actually written rather than from
   * the last row read. That is the whole reason the write is allowed to throw.
   */
  async sweep(): Promise<void> {
    // The switch is the switch. Nothing starts the timer when it is off, and
    // nothing reaching past the timer gets to write either.
    if (!this.enabled) return;
    try {
      const since = (this.watermark ??= await this.startingPoint());
      const failures = await this.identity.loginFailures(BATCH);

      // Oldest first, so the mark only ever moves over rows that are on the
      // page. The provider answers newest first, which is the wrong order to
      // write in: a sweep that died halfway would leave the mark past rows it
      // had not written.
      const fresh = failures
        .filter((failure) => failure.at.getTime() > since)
        .sort((left, right) => left.at.getTime() - right.at.getTime());

      for (const failure of fresh) {
        await this.record(failure);
        this.watermark = failure.at.getTime();
      }

      this.complained = false;
    } catch {
      if (!this.complained)
        this.logger.warn(
          "Could not read refused logins from the identity provider. Is the realm keeping LOGIN_ERROR events, and does this client hold view-events?",
        );
      this.complained = true;
    }
  }

  private record(failure: LoginFailure) {
    return this.events.recordLoginFailure(
      failure.subjectId,
      failureDescription(failure.reason),
      failure.at,
    );
  }

  // Where to resume: the newest failure on record, but never further back than
  // LOOKBACK. The floor compares the provider's clock against this one, which
  // is the one place the two are mixed and the one place it does not matter --
  // it is a bound on how much history a first run drags in, not a boundary any
  // row is decided by.
  private async startingPoint(): Promise<number> {
    const newest = await this.events.newestLoginFailure();
    return Math.max(newest?.getTime() ?? 0, Date.now() - LOOKBACK_MS);
  }
}
