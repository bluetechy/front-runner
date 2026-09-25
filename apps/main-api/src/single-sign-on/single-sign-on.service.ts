import { BadRequestException, Injectable } from "@nestjs/common";
import {
  IdentityAdminService,
  type LinkedLogin,
  type LoginProvider,
  type Principal,
} from "../authentication/index.js";
import { SecurityEventsService } from "../security-events/index.js";
import { SignInMethod } from "./single-sign-on.model.js";

// The other ways into an account: Google, Apple, whatever else the realm has
// been given, and which of them this account has connected.
//
// **Connecting one does not happen here, and cannot.** It ends at the
// provider, in a browser, because the only way to prove somebody holds a
// Google account is to send them to Google and have Google say so. Keycloak
// runs that flow itself at /broker/{alias}/link and the security page hands
// the browser to it; this service is the two ends of it -- what the page draws
// before, and what is confirmed and recorded after.
//
// Which makes `confirm` the operation worth reading twice. The browser comes
// back from the provider with a claim on the URL, and a claim on a URL is
// worth nothing: anybody can type one. So it is not believed. It names a
// provider to go and ask about, the provider is asked, and a security event is
// written only if the answer is yes.
@Injectable()
export class SingleSignOnService {
  constructor(
    private readonly identity: IdentityAdminService,
    private readonly events: SecurityEventsService,
  ) {}

  // Every provider the realm has, marked up with what this account has done
  // about each, in the order the realm holds them. Nothing here sorts: the
  // card that draws these puts them in alphabetical order, which is a decision
  // about reading rather than about accounts.
  async methods(principal: Principal): Promise<SignInMethod[]> {
    const subjectId = await this.subject(principal);
    const [providers, linked] = await Promise.all([
      this.identity.loginProviders(),
      this.identity.linkedLogins(subjectId),
    ]);
    return this.draw(providers, linked, subjectId);
  }

  // Take one away, and say what the card should now look like.
  //
  // The list is answered rather than nothing, for the reason every write on
  // this page answers one: the page redraws from what the API says instead of
  // editing its own copy and hoping the two agree.
  async disconnect(
    principal: Principal,
    alias: string,
  ): Promise<SignInMethod[]> {
    const subjectId = await this.subject(principal);
    const [providers, linked] = await Promise.all([
      this.identity.loginProviders(),
      this.identity.linkedLogins(subjectId),
    ]);

    const name = nameOf(providers, alias);

    // Not connected, which is what a page that has been open a while looks
    // like. Said rather than shrugged off: a mutation that answered "done" to
    // this would have the card report a disconnection that never happened.
    if (!linked.some((login) => login.alias === alias))
      throw new BadRequestException(
        `${name} is not connected to this account.`,
      );

    // The guard the whole card is arranged around. An account whose only way
    // in is Google, with no password to fall back on, is locked out by this
    // button, and it is the last moment anybody can say so.
    //
    // Checked here as well as drawn on the page, because the page is a moment
    // old: the password could have been the thing that changed.
    if (linked.length === 1 && !(await this.identity.hasPassword(subjectId)))
      throw new BadRequestException(
        `${name} is the only way into this account. Add a password before disconnecting it: log out, and use Forgot Password on the login card.`,
      );

    await this.identity.unlinkLogin(subjectId, alias);

    await this.events.record(
      principal.loginName,
      "SignInMethodDisconnected",
      `${name} was disconnected from your account.`,
      principal.device ?? undefined,
    );

    const after = await this.identity.linkedLogins(subjectId);
    return this.draw(providers, after, subjectId);
  }

  // The browser is back from the provider and says it connected one.
  //
  // The saying is a hint about which provider to go and ask about, and nothing
  // more than that: what is recorded is what the provider says. A URL claiming
  // a connection that did not happen produces a card that says it did not
  // happen and no event at all.
  async confirm(principal: Principal, alias: string): Promise<SignInMethod[]> {
    const subjectId = await this.subject(principal);
    const [providers, linked] = await Promise.all([
      this.identity.loginProviders(),
      this.identity.linkedLogins(subjectId),
    ]);

    if (linked.some((login) => login.alias === alias))
      await this.events.record(
        principal.loginName,
        "SignInMethodConnected",
        `${nameOf(providers, alias)} was connected to your account.`,
        principal.device ?? undefined,
      );

    return this.draw(providers, linked, subjectId);
  }

  // The realm's list and the account's list, joined into the rows the card
  // draws.
  //
  // The password is only asked about when something is connected, which is the
  // common case saved a round trip: with nothing connected there is nothing to
  // disconnect and the answer could not change a single row.
  private async draw(
    providers: LoginProvider[],
    linked: LinkedLogin[],
    subjectId: string,
  ): Promise<SignInMethod[]> {
    const hasPassword = linked.length
      ? await this.identity.hasPassword(subjectId)
      : false;
    // One connected provider and no password means that provider is the
    // account, so nothing may be disconnected. Two means either can go,
    // because the other is still a way in.
    const removable = hasPassword || linked.length > 1;

    return providers.map((provider) => {
      const login = linked.find((one) => one.alias === provider.alias);
      return {
        Alias: provider.alias,
        Name: provider.name,
        Available: provider.enabled,
        Connected: login !== undefined,
        ConnectedAs: login?.userName ?? null,
        CanDisconnect: login !== undefined && removable,
      };
    });
  }

  // The account behind the session, which is where every subject id in here
  // comes from. Never off the request: an operation that let a caller name the
  // account whose logins it was disconnecting would be a way to lock anybody
  // out of anything.
  private async subject(principal: Principal): Promise<string> {
    const account = await this.identity.findAccount(principal.loginName);
    if (!account)
      throw new BadRequestException(
        "That account is no longer here. Login again.",
      );
    return account.subjectId;
  }
}

// What to call a provider in a sentence. The realm's display name, or the
// alias when the realm never gave it one, which is the same fallback the card
// draws with.
function nameOf(providers: LoginProvider[], alias: string): string {
  return providers.find((provider) => provider.alias === alias)?.name ?? alias;
}
