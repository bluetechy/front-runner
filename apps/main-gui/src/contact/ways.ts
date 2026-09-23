import type { FC } from "react";
import type IconProps from "@/shared/icons/IconProps";
import LocationIcon from "@/shared/icons/LocationIcon";
import MailIcon from "@/shared/icons/MailIcon";
import PhoneIcon from "@/shared/icons/PhoneIcon";

/*
 * The three ways to reach us: what to ring, where we are, and what to write
 * to. There is one of each -- one number, one office, one mailbox -- so this
 * is a tuple rather than a list somebody is expected to grow. A second number
 * under "Phone" is a second thing that has to be answered.
 *
 * **Every line of it is invented.** The street is a placeholder, the number
 * is in the 555-01xx block reserved for fiction, and the mailbox is on
 * `.example`, a TLD reserved so that nothing typed on this page can arrive in
 * a stranger's inbox. Each is one edit, and all three have to be made before
 * this page is shown to anybody -- see docs/contact-page.md.
 */

export interface Way {
  id: string;
  /* What this way of reaching us is, written over the top of it. */
  heading: string;
  icon: FC<IconProps>;
  /* The thing itself: the number, the address, the mailbox. The first line
   * is the one that carries the link, where there is one. */
  lines: readonly string[];
  /* Where pressing that first line goes -- a dialler, a mail client. An
   * address is a place rather than an action, so it has none and is read
   * rather than pressed. */
  href?: string;
  /* When it is answered. A way of reaching somebody that does not say when
   * is a way of waiting. */
  note: string;
}

/* Ringing is the quickest of the three, so it is the one read first; the
 * mailbox is last because it is the one that waits. */
export const ways: readonly [Way, Way, Way] = [
  {
    id: "phone",
    heading: "Phone",
    icon: PhoneIcon,
    lines: ["+1 (303) 555-0148"],
    href: "tel:+13035550148",
    note: "A person answers, weekdays 9am to 6pm Mountain time.",
  },
  {
    id: "address",
    heading: "Address",
    icon: LocationIcon,
    lines: ["1180 Sherman Street", "Suite 410", "Denver, CO 80203"],
    note: "Open weekdays, 9am to 6pm Mountain time.",
  },
  {
    id: "email",
    heading: "Email",
    icon: MailIcon,
    lines: ["hello@yourlogo.example"],
    href: "mailto:hello@yourlogo.example",
    note: "Every message is answered within one business day.",
  },
] as const;
