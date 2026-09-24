import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IdentityAdminService,
  type LoginFailure,
} from "../authentication/index.js";
import { SecurityEventsService } from "./security-events.service.js";

/*
 * The security page's other half: what the identity provider knows and this
 * application never sees.
 *
 * The request path can only ever record what somebody did *through* us. Two
 * things on that page are not like that. A refused login mints no token, so
 * there is no request at which it could be noticed. A session that ran out, was
 * revoked, or was ended from the provider's own pages ends without a request
 * either. So both are **pulled rather than pushed**: this is the only timer in
 * this API, it asks the provider's event log once a minute what has happened,
 * and it writes what is new.
 *
 * The two halves resume differently, and the difference is the whole design:
 *
 *   * **A refused login is not deduplicated.** Ten attempts are ten rows,
 *     because how many there were is the fact worth reading. So it needs a
 *     high-water mark, that mark has to survive a restart, and it only ever
 *     moves over a row that was really written.
 *   * **A finished session is deduplicated, on the session.** One session can be
 *     reported over three times and the database keeps it one row, so there is no
 *     mark to keep at all: offering the same session twice costs a refused insert.
 *     The set below is only there to keep even that off the wire.
 *
 * That is also why only the first has a switch. Failures can fill a page on
 * their own; a session can cost the page one login row and one logout row and
 * never a third.
 */

/* Once a minute. The page is read by somebody looking back over days, so a
 * minute of lag is invisible there, and it is the interval at which a realm
 * being scanned still produces batches this can keep up with. */
const INTERVAL_MS = 60_000;

/* The most events to take from one answer, per kind. A bound on the work of a
 * single sweep rather than a guess at the volume: whatever is missed is still
 * there on the next one, because the mark did not move past it. */
const BATCH = 100;

/* How far back a first run with nothing on record will reach. A page filling
 * with a year of the provider's history the moment this shipped would be worse
 * than one that starts today. */
const LOOKBACK_MS = 24 * 60 * 60 * 1000;

/* The sessions this process has already written a logout for, so a sweep does
 * not re-offer one every minute for as long as it stays in the provider's log.
 *
 * A cache and not the rule, exactly as AuthenticationGuard.recordedLogins is a
 * cache and not the rule: dbo.LogLogoutEvent is what actually deduplicates, so a
 * restart or an eviction costs one refused insert rather than a second row on
 * somebody's page. */
const REMEMBERED = 10_000;

/*
 * Keycloak's word for why a login was refused, turned into a sentence.
 *
 * Only the reasons somebody would act on differently are here. Everything else
 * collapses into one honest sentence, because "a login attempt failed for reason
 * expired_code" is not English and a security page is read by whoever owns the
 * account rather than by whoever runs the realm.
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

/*
 * What a finished session says on the page.
 *
 * Two sentences and no more, because two is all the provider can tell apart. A
 * logout is a logout wherever the button was. Everything else looks identical
 * from outside: the provider refused to refresh a token for a session that was
 * no longer there, and whether it timed out, ran past its maximum lifespan or
 * was taken away is not in the event. Saying which of those it was would be
 * guessing, so the sentence says the part that is certain and leaves the reader
 * the part that is theirs: they know whether they logged out.
 */
export function endedDescription(deliberate: boolean): string {
  return deliberate
    ? "You logged out."
    : "This session ended without a logout.";
}

@Injectable()
export class ProviderEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProviderEventsService.name);
  private readonly failuresEnabled: boolean;
  private timer: NodeJS.Timeout | null = null;
  private watermark: number | null = null;
  private readonly recordedLogouts = new Set<string>();
  private complained = false;

  constructor(
    config: ConfigService,
    private readonly identity: IdentityAdminService,
    private readonly events: SecurityEventsService,
  ) {
    /* Anything but an explicit false leaves it on, so a deployment that has
     * never heard of the setting keeps recording them. */
    this.failuresEnabled =
      config.get<boolean>("SECURITY_LOG_FAILED_LOGINS") !== false;
  }

  onModuleInit() {
    if (!this.failuresEnabled)
      this.logger.log(
        "Failed logins are not being recorded: SECURITY_LOG_FAILED_LOGINS is off",
      );
    /* The timer starts either way. The switch is about one of the two things
     * this mirrors, and finished sessions are not the noisy one. */
    this.timer = setInterval(() => void this.sweep(), INTERVAL_MS);
    /* Unreferenced, so a process that is shutting down is not held open by a
     * timer whose work nothing is waiting for. */
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /*
   * One pass over the provider's log. Public because it is the whole of what
   * this class does, and a test that had to wait a minute for it would be a test
   * nobody runs.
   *
   * A provider that cannot be reached is a warning and never a throw: this is
   * bookkeeping on a timer, nothing is waiting on it, and an unhandled rejection
   * from a setInterval would take the process down over a log row. The two halves
   * are swept separately so that a failure in one still lets the other run.
   */
  async sweep(): Promise<void> {
    const failures = await this.attempt(() => this.sweepFailures());
    const sessions = await this.attempt(() => this.sweepEndedSessions());

    if (failures && sessions) {
      this.complained = false;
      return;
    }

    /* Said once rather than once a minute. A realm that was never configured to
     * keep these events fails forever, and a warning a minute for the life of a
     * process is how a log stops being read at all. */
    if (!this.complained)
      this.logger.warn(
        "Could not read the identity provider's event log. Is the realm keeping LOGIN_ERROR, LOGOUT and REFRESH_TOKEN_ERROR events, and does this client hold view-events?",
      );
    this.complained = true;
  }

  private async attempt(work: () => Promise<void>): Promise<boolean> {
    try {
      await work();
      return true;
    } catch {
      return false;
    }
  }

  /*
   * The refused logins newer than the mark, written oldest first.
   *
   * The provider answers newest first, which is the wrong order to write in: the
   * mark moves one row at a time and only after the row is written, so a sweep
   * that dies halfway leaves it beyond nothing it did not write. That is also the
   * one reason SecurityEventsService.recordLoginFailure is allowed to throw where
   * every other record in that class swallows.
   */
  private async sweepFailures(): Promise<void> {
    if (!this.failuresEnabled) return;

    const since = (this.watermark ??= await this.startingPoint());
    const failures = await this.identity.loginFailures(BATCH);

    const fresh = failures
      .filter((failure) => failure.at.getTime() > since)
      .toSorted((left, right) => left.at.getTime() - right.at.getTime());

    for (const failure of fresh) {
      await this.record(failure);
      this.watermark = failure.at.getTime();
    }
  }

  /*
   * The sessions the provider says have finished.
   *
   * No mark, for the reason at the top of this file: the write is idempotent on
   * the session. **Oldest first still matters**, and for a different reason than
   * above: our own logout produces a LOGOUT and then, from any other tab still
   * holding a token, a refused refresh moments later. Both describe the same
   * session and only the first to arrive writes its sentence, so writing in the
   * order things happened is what makes a page say "You logged out." rather than
   * "This session ended without a logout." after somebody pressed the button.
   */
  private async sweepEndedSessions(): Promise<void> {
    const ended = await this.identity.endedSessions(BATCH);
    const fresh = ended
      .filter((session) => !this.recordedLogouts.has(session.sessionId))
      .toSorted((left, right) => left.at.getTime() - right.at.getTime());

    for (const session of fresh) {
      await this.events.recordLogout(
        session.sessionId,
        endedDescription(session.deliberate),
        /* No device. The provider's event log does not carry a user agent, so
         * only the browser's own report of a logout knows one, and guessing is
         * worse than leaving the line out -- see device-name.ts. */
        undefined,
        session.at,
      );
      this.remember(session.sessionId);
    }
  }

  /* Capped, because the alternative is a set that grows with every session this
   * process has ever seen end. Dropping the oldest half costs a refused insert
   * apiece. */
  private remember(sessionId: string) {
    if (this.recordedLogouts.size >= REMEMBERED)
      for (const key of [...this.recordedLogouts].slice(0, REMEMBERED / 2))
        this.recordedLogouts.delete(key);
    this.recordedLogouts.add(sessionId);
  }

  private record(failure: LoginFailure) {
    return this.events.recordLoginFailure(
      failure.subjectId,
      failureDescription(failure.reason),
      failure.at,
    );
  }

  /*
   * Where to resume the failure mirror from.
   *
   * The newest one already on record, floored at a day ago. Reading it back out
   * of the database rather than starting from boot is what makes a restart free:
   * in development this process restarts on every file change, and after a real
   * outage everything refused during it would otherwise be lost. The stamp
   * compared against is the provider's own, because the provider's stamp is what
   * was written, so the two clocks never have to agree.
   */
  private async startingPoint(): Promise<number> {
    const newest = await this.events.newestLoginFailure();
    return Math.max(newest?.getTime() ?? 0, Date.now() - LOOKBACK_MS);
  }
}
