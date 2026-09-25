import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "../database/index.js";
import { PasswordResetService } from "../password-reset/index.js";
import { SecurityEvent } from "./security-events.model.js";

// How much of the log "recent" means: the last thirty days of it. This is the
// one place the word is defined, and it is here rather than in the browser
// because the database is where the window is applied.
//
// A window rather than the row cap it replaced, because the page now says the
// number out loud above the table and pages what comes back ten rows at a
// time. "The last twenty things that happened" is not a sentence anybody can
// check against their own week, and on a busy account it hides yesterday behind
// this morning; a month is a length somebody can hold in their head.
//
// It is shorter than the twelve months dbo.trim_security_events keeps, which is
// deliberate: what is kept and what is shown are different questions, and the
// longer answer is the one an investigation needs. An account that wants to
// look further back than this is the argument for a date range on the card,
// which is a control rather than a number and does not belong in this constant.
const WINDOW_DAYS = 30;

@Injectable()
export class SecurityEventsService {
  private readonly logger = new Logger(SecurityEventsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  // The account's own security log for the last thirty days, newest first.
  list(loginName: string) {
    return this.db.query<SecurityEvent>(
      'SELECT * FROM dbo."GetSecurityEvents"($1, $2)',
      [loginName, WINDOW_DAYS],
    );
  }

  // Answer "do you recognize this activity?", and act on a no.
  //
  // Two things happen when the answer is no, and only one of them is a record.
  // The database logs that the alarm was raised; this sends the person a link
  // to choose a new password, because "No, secure account" that only wrote a
  // row would be a button that agrees with you and does nothing. A password is
  // the credential every other way in rests on, and replacing it is the one act
  // that ends a session somebody else is holding.
  //
  // It reuses the forgot-password flow rather than inventing a second one:
  // main-api already mints the token, sends our own message and lands the link
  // on our own page. The person is logged in, so their login name is the
  // identifier that flow takes.
  //
  // The mail is sent after the answer is recorded, and a failure to send does
  // not undo it: the row saying somebody does not recognize a login is the more
  // important of the two, and the page offers the link again through the
  // ordinary forgot-password card.
  async review(
    loginName: string,
    securityEventId: string,
    recognized: boolean,
  ) {
    const events = await this.db.query<SecurityEvent>(
      'SELECT * FROM dbo."ReviewSecurityEvent"($1, $2, $3, $4)',
      [loginName, securityEventId, recognized, WINDOW_DAYS],
    );

    if (!recognized) await this.passwordReset.request(loginName);

    return events;
  }

  // Record something that happened. Called by whatever did it.
  //
  // A failure here is swallowed, which is deliberate and is the one place in
  // this API that swallows one. This is called after the thing it describes has
  // already happened: an address that was added, a login that succeeded. Letting
  // a log write turn that into "the email address was not added" would report
  // the wrong outcome to somebody whose address is on file, and the database
  // answers an unknown login with NULL rather than raising for the same reason.
  // It is logged at warning, because a security log quietly missing rows is
  // worth noticing in the container's output.
  async record(
    loginName: string,
    eventType: string,
    description: string,
    device?: string,
    location?: string,
  ) {
    try {
      await this.db.query('SELECT dbo."LogSecurityEvent"($1, $2, $3, $4, $5)', [
        loginName,
        eventType,
        description,
        device ?? null,
        location ?? null,
      ]);
    } catch {
      this.logger.warn(`Could not record a ${eventType} security event`);
    }
  }

  // Record a login the identity provider refused, named by subject.
  //
  // **This one does not swallow a failure, which is the exception to the rule
  // above.** Everything else here is called just after the thing it describes
  // and has nothing to retry with. This is called by a poll that keeps a
  // high-water mark, so swallowing would move that mark past a row that was
  // never written and the attempt would be lost for good. Letting it throw is
  // what makes the next sweep pick it up again.
  //
  // The subject rather than a login name because that is what the provider
  // hands back, and because what somebody typed at the prompt may well be an
  // email address. dbo.LogLoginFailure resolves it and answers NULL for a
  // subject this installation has never seen.
  async recordLoginFailure(
    subjectId: string,
    description: string,
    occurredAt: Date,
  ) {
    await this.db.query('SELECT dbo."LogLoginFailure"($1, $2, $3)', [
      subjectId,
      description,
      occurredAt,
    ]);
  }

  // Record that a session ended, named by the session and by nothing else.
  //
  // Three callers, none of which knows about the others: the browser saying
  // somebody pressed Logout, and two mirrored out of the provider's event log.
  // They all write the same row and dbo.LogLogoutEvent keeps it one row, so
  // there is nothing here to coordinate -- the first one in wins and the rest
  // answer NULL.
  //
  // It swallows a failure, unlike recordLoginFailure just above. The rule is the
  // same one: swallow where there is nothing to retry with, throw where a
  // high-water mark would otherwise move past an unwritten row. A logout keeps no
  // mark, because being idempotent on the session is what takes the place of one,
  // so a lost write costs at worst a logout missing from a page. Letting it
  // through would fail the mutation, and somebody who pressed Logout is logged
  // out either way.
  //
  // `occurredAt` is when the session ended, which for the two mirrored callers is
  // up to a sweep ago. The browser's caller leaves it out, because a logout it is
  // reporting happened as it asked. Getting this wrong would put a logout above
  // the login it ends on a page sorted by when things happened.
  async recordLogout(
    sessionId: string,
    description: string,
    device?: string,
    occurredAt?: Date,
  ) {
    try {
      await this.db.query('SELECT dbo."LogLogoutEvent"($1, $2, $3, $4)', [
        sessionId,
        description,
        device ?? null,
        occurredAt ?? null,
      ]);
    } catch {
      this.logger.warn("Could not record a logout in the security log");
    }
  }

  // The newest failed login already on record, or null when there is none.
  //
  // Where the mirror resumes from after a restart, and the reason it can resume
  // at all rather than starting from the moment this process booted: in
  // development that would be every few seconds. The stamp compared against is
  // the provider's own, because that is what was written, so the two clocks
  // never have to agree.
  //
  // A read straight off the table rather than through a dbo function, the way
  // AuthenticationGuard reads dbo."Users" on every request. A function would be
  // a second name for one aggregate that nothing else will ever want.
  async newestLoginFailure(): Promise<Date | null> {
    const [row] = await this.db.query<{ OccurredAt: Date | null }>(
      'SELECT max("OccurredAt") AS "OccurredAt" FROM dbo."SecurityEvents" WHERE "EventType" = $1',
      ["LoginFailed"],
    );
    return row?.OccurredAt ?? null;
  }
}
