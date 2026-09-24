import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
  IdentityAdminService,
  type Principal,
} from "../authentication/index.js";
import { SecurityEventsService } from "../security-events/index.js";
import { PasswordChange, PasswordStatus } from "./password-change.model.js";

// Changing a password from inside the account.
//
// Four things happen and their order is the whole of the design, because each
// one is only safe once the one before it has answered.
//
//   1. Prove it is them. The session says who the account is; it does not say
//      who is at the keyboard. A browser somebody walked away from is the case
//      this step exists for, and it is why the current password is asked for
//      at all when the request already carries a token.
//   2. Set the new one, which the identity provider refuses if its own policy
//      says no. Our schema says the same rules first so the ordinary mistakes
//      are answered beside the box; this is the line that enforces them.
//   3. Record it, because a password changing is the single most important
//      thing that can happen to an account and the security page above this
//      card is where its owner looks.
//   4. End every other session. A changed password is worth nothing while a
//      session somebody else is holding outlives it.
//
// Three and four are in that order for a reason worth keeping: a session that
// outlived the change is worth reporting, but losing the record of the change
// itself over a provider that would not list sessions is a worse outcome than
// a count the card leaves out.
@Injectable()
export class PasswordChangeService {
  private readonly logger = new Logger(PasswordChangeService.name);

  constructor(
    private readonly identity: IdentityAdminService,
    private readonly events: SecurityEventsService,
  ) {}

  // When the password was last set. The card's stamp, and nothing else.
  async status(principal: Principal): Promise<PasswordStatus> {
    const account = await this.identity.findAccount(principal.loginName);
    if (!account) return { ChangedAt: null };
    return {
      ChangedAt: await this.identity.passwordChangedAt(account.subjectId),
    };
  }

  async change(
    principal: Principal,
    currentPassword: string,
    newPassword: string,
  ): Promise<PasswordChange> {
    // The account is read from the provider rather than assumed, because
    // everything below needs its subject id and the provider is where that
    // lives. A session whose account is no longer there is a refusal rather
    // than a password set on nothing -- the same rule the reset flow keeps.
    const account = await this.identity.findAccount(principal.loginName);
    if (!account)
      throw new BadRequestException(
        "That account is no longer here. Login again.",
      );

    // Said before the provider is asked anything, because it is the one
    // refusal here that needs nobody's permission to work out, and because
    // sending it on to be verified would put a right password through the
    // check and then refuse it anyway.
    if (currentPassword === newPassword)
      throw new BadRequestException(
        "Your new password has to be different from the one you use now.",
      );

    // The whole reason this card asks for two passwords instead of one. It is
    // checked by the identity provider, because a password is the provider's
    // to hold and nothing here has ever seen it.
    const proved = await this.identity.verifyPassword(
      account.username,
      currentPassword,
    );
    if (!proved)
      throw new BadRequestException("That is not the password you use now.");

    // Keycloak's own policy refuses here, in its own words, and those words
    // reach the card: our schema has already said the same rules in ours, so
    // anything that gets this far is a rule the realm has and we do not.
    await this.identity.setPassword(account.subjectId, newPassword);

    // From here on the password has already changed. Nothing below may throw
    // and report otherwise to somebody whose password is now different from
    // the one they arrived with.
    await this.events.record(
      principal.loginName,
      "PasswordChanged",
      principal.device
        ? `Your password was changed on ${principal.device}.`
        : "Your password was changed.",
      principal.device ?? undefined,
    );

    return {
      ChangedAt: await this.changedAt(account.subjectId),
      OtherSessionsEnded: await this.endOtherSessions(
        account.subjectId,
        principal.sessionId,
      ),
    };
  }

  // The new stamp, read back rather than taken as "now". The provider is what
  // the card's line is read out of on every later visit, so the moment it
  // shows now should be the one it will show then.
  private async changedAt(subjectId: string): Promise<Date | null> {
    try {
      return await this.identity.passwordChangedAt(subjectId);
    } catch {
      return null;
    }
  }

  // Every session but the one this request came in on.
  //
  // Null rather than zero when it could not be done, because the card says
  // different things about the two and only one of them is reassuring. The
  // failure is swallowed and logged: the password changed, which is what was
  // asked, and a mutation that threw here would report a change that happened
  // as one that did not.
  private async endOtherSessions(
    subjectId: string,
    keepSessionId: string | null,
  ): Promise<number | null> {
    try {
      return await this.identity.endOtherSessions(subjectId, keepSessionId);
    } catch {
      this.logger.warn(
        "A password was changed and the account's other sessions could not be ended",
      );
      return null;
    }
  }
}
