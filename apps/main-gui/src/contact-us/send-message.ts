import type { Message } from "./message-schema";

/*
 * Where a message goes.
 *
 * **Nowhere, today.** main-api has no mailbox behind this form -- no
 * mutation, no SMTP, no ticket -- so this resolves having sent nothing, and
 * the thank-you the form shows afterwards is the one thing on the page that
 * is not true yet. It is said here rather than left for somebody to discover:
 * the email address above the form is what actually reaches anybody.
 *
 * It is a function of its own rather than a `fetch` written into the form so
 * that there is one place for that to stop being true. When main-api grows a
 * `sendMessage` mutation, this file is what changes, the form is not touched,
 * and its tests go on stubbing exactly this.
 *
 * See docs/contact-page.md.
 */
export function sendMessage(_message: Message): Promise<void> {
  return Promise.resolve();
}
