import { ParseUUIDPipe } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  CurrentUser,
  logoutDescription,
  type Principal,
} from "../authentication/index.js";
import { SecurityEvent } from "./security-events.model.js";
import { SecurityEventsService } from "./security-events.service.js";

// Your own security log, and nobody else's. Neither of these takes a user: the
// login name comes off the verified token, so there is no way to read another
// account's logins or to answer a question that was asked of somebody else. The
// database checks ownership again regardless, and answers an event that is not
// yours the way it answers one that does not exist.
@Resolver(() => SecurityEvent)
export class SecurityEventsResolver {
  constructor(private readonly service: SecurityEventsService) {}

  @Query(() => [SecurityEvent])
  securityEvents(@CurrentUser() user: Principal) {
    return this.service.list(user.loginName);
  }

  // Answers with the whole list rather than the row that changed, the way the
  // email address writers on the same page do: saying no writes a second event
  // as well as answering the first, so the row that changed is not the only
  // thing that moved.
  @Mutation(() => [SecurityEvent])
  reviewSecurityEvent(
    @CurrentUser() user: Principal,
    @Args("securityEventId", { type: () => String }, new ParseUUIDPipe())
    securityEventId: string,
    @Args("recognized", { type: () => Boolean }) recognized: boolean,
  ) {
    return this.service.review(user.loginName, securityEventId, recognized);
  }

  // Say that this session is over, so the page can show it.
  //
  // The one write on this page that records something the browser knows and the
  // API cannot work out: logging out is a call the browser makes straight to the
  // identity provider, so no request reaches here at the moment it happens. The
  // provider's own event log carries it too and the mirror picks it up within a
  // minute, but this arrives at once and knows the device, and the two collapse
  // into one row because dbo.LogLogoutEvent is idempotent on the session.
  //
  // **It takes no arguments**, which is the whole of its access control. Which
  // session ended is the session on the token and the device is the one on the
  // request, so there is nothing a caller can name: no way to end somebody
  // else's session, and no way to post a logout for a session that was never
  // theirs. A machine's token carries no session and writes nothing.
  //
  // It answers whether a row was written rather than the list, unlike every
  // other write on this page. Nothing is going to read that list: the browser
  // calls this on its way out and drops its tokens immediately afterwards.
  @Mutation(() => Boolean)
  async recordLogout(@CurrentUser() user: Principal) {
    if (!user.sessionId) return false;
    await this.service.recordLogout(
      user.sessionId,
      logoutDescription(user.device),
      user.device ?? undefined,
    );
    return true;
  }
}
