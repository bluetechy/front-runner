import { BadRequestException, Injectable } from "@nestjs/common";
import {
  IdentityAdminService,
  type Principal,
  type Passkey as HeldPasskey,
} from "../authentication/index.js";
import { SecurityEventsService } from "../security-events/index.js";
import { Passkey, PasskeyRegistration } from "./passkeys.model.js";

// Passkeys: what an account can login with instead of typing a password.
//
// **Registering one does not happen here, and cannot.** A passkey is made by
// the authenticator in somebody's hands, in a ceremony the browser runs
// against the origin the identity provider is served from, and the private
// half never leaves the device that made it. No admin API creates one,
// because there is nothing for a server to create. So the security page sends
// the browser to Keycloak with `kc_action=webauthn-register-passwordless`,
// exactly as the two-factor card sends it off to set up an authenticator app,
// and this service is the two ends of that trip: what the card draws before,
// and what is confirmed and recorded after.
//
// Which makes `confirm` the operation worth reading twice, for the reason
// TwoFactorService.confirm and SingleSignOnService.confirm are: the browser
// comes back with a claim on the URL, and a claim on a URL is worth nothing.
// The provider is asked, and an event is written only when the answer is yes.
//
// **Nothing here is a second factor, and the distinction is not pedantry.** A
// second factor is asked for after a password is right; a passkey stands in
// place of the password. They are different cards, different verticals and
// different credentials at the provider, and an account may sensibly have
// both, either or neither. See apps/main-api/src/two-factor for the other one.
@Injectable()
export class PasskeysService {
  constructor(
    private readonly identity: IdentityAdminService,
    private readonly events: SecurityEventsService,
  ) {}

  // Every passkey on the account, newest first.
  //
  // Sorted here rather than at the card, because "newest first" is a claim
  // about what somebody is looking for: the row they are most likely to have
  // come to read is the one they registered last, and the row they are most
  // likely to remove is the one they registered on a laptop they no longer
  // have. A provider that would not date a credential sorts to the bottom,
  // which is where a row nobody can place belongs.
  async list(principal: Principal): Promise<Passkey[]> {
    return draw(await this.identity.passkeys(await this.subject(principal)));
  }

  // The browser is back from the provider's registration page.
  //
  // What it says on the way back is a hint about what to go and look at,
  // nothing more. A ceremony somebody canceled -- a fingerprint reader they
  // did not touch, a key they did not plug in, a dialog they dismissed --
  // comes back to the same route looking exactly like a finished one, and the
  // only difference between them is what the provider says when it is asked.
  //
  // **Whether one is new is answered by its age**, and that is the compromise
  // in this file worth knowing about. There is nothing to compare against:
  // this API keeps no copy of an account's credentials, the page's own list
  // is from before it left, and a count carried on the URL would be a claim
  // like any other. So a passkey registered inside the window the trip itself
  // could have taken is the passkey that trip registered. The window is
  // generous, because the honest failure is a person being congratulated a
  // second time for a key they added ten minutes ago, and the dishonest one
  // is a person told nothing happened when something did.
  //
  // A provider that will not date a credential answers no rather than yes,
  // for the reason every unknown on this page resolves the safe way: "we
  // could not confirm it" sends somebody to look at the card, and "it worked"
  // sends them away.
  async confirm(principal: Principal): Promise<PasskeyRegistration> {
    const held = await this.identity.passkeys(await this.subject(principal));
    const fresh = held.find((passkey) => registeredJustNow(passkey));

    if (fresh)
      await this.events.record(
        principal.loginName,
        "PasskeyAdded",
        `${nameOf(fresh)} was added to your account. It can be used to login without a password.`,
        principal.device ?? undefined,
      );

    return { Registered: fresh !== undefined, Passkeys: draw(held) };
  }

  // Take one off the account.
  //
  // **Removing the last one is not refused**, on the terms disabling a second
  // factor is not: an account is never locked out by losing a passkey -- the
  // password and every connected provider still work -- and what is worth
  // saying about it is a sentence in the dialog rather than a refusal here.
  //
  // A passkey that is not on the account is refused, though, which is the
  // opposite of what the port does with the same request and is deliberate:
  // the port is asked for an end state, and this is asked by a page. A page
  // that has been open a while and reports "removed" about a row that was
  // already gone has told somebody their list is now right when it was right
  // before they pressed anything.
  async remove(principal: Principal, id: string): Promise<Passkey[]> {
    const subjectId = await this.subject(principal);
    const held = await this.identity.passkeys(subjectId);
    const going = held.find((passkey) => passkey.id === id);

    if (!going)
      throw new BadRequestException("That passkey is not on this account.");

    await this.identity.removePasskey(subjectId, going.id);

    await this.events.record(
      principal.loginName,
      "PasskeyRemoved",
      `${nameOf(going)} was removed from your account. It can no longer be used to login.`,
      principal.device ?? undefined,
    );

    return draw(await this.identity.passkeys(subjectId));
  }

  // The account behind the session, which is where every subject id in here
  // comes from. Never off the request: an operation that let a caller name
  // the account whose passkey it was removing would be a way to strip
  // somebody's login off their own account.
  private async subject(principal: Principal): Promise<string> {
    const account = await this.identity.findAccount(principal.loginName);
    if (!account)
      throw new BadRequestException(
        "That account is no longer here. Login again.",
      );
    return account.subjectId;
  }
}

// How recently a passkey has to have been registered for `confirm` to read it
// as the one that trip made.
//
// Ten minutes, which is longer than the trip can plausibly take and shorter
// than anybody's memory of having made one. The bound that actually matters
// is not this number but the fact that the page asks once per trip and takes
// the claim off the URL before it does: see `security.tsx`.
const REGISTRATION_WINDOW = 10 * 60 * 1000;

function registeredJustNow(passkey: HeldPasskey): boolean {
  if (!passkey.createdAt) return false;
  const age = Date.now() - passkey.createdAt.getTime();
  return age >= 0 && age <= REGISTRATION_WINDOW;
}

// The port's passkeys as the card's rows, newest first.
//
// A copy rather than the port's own objects, and the field names change case
// on the way through, because the port is this API's vocabulary and the model
// is the schema's. The two have been the same shape three times now and the
// day they stop is the day this is the only file that changes.
function draw(held: HeldPasskey[]): Passkey[] {
  return [...held]
    .sort((left, right) => when(right) - when(left))
    .map((passkey) => ({
      Id: passkey.id,
      Label: passkey.label,
      CreatedAt: passkey.createdAt,
    }));
}

// An undated passkey sorts to the bottom rather than to the top, which is
// what a zero would do.
function when(passkey: HeldPasskey): number {
  return passkey.createdAt ? passkey.createdAt.getTime() : 0;
}

// What to call a passkey in a sentence somebody will read in their security
// log a month from now. The name they gave it where there is one, because
// that is the only thing that will mean anything to them, and a plain noun
// where there is not: "Passkey MacBook Touch ID" reads like a serial number.
function nameOf(passkey: HeldPasskey): string {
  return passkey.label ? `The passkey "${passkey.label}"` : "A passkey";
}
