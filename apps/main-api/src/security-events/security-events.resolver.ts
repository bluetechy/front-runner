import { ParseUUIDPipe } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CurrentUser, type Principal } from "../authentication/index.js";
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
}
