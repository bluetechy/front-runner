import { checkPassword } from "../authentication";

/*
 * What the change-password card is allowed to send.
 *
 * The rule for the new password is not here: it is `password-rules.ts` in the
 * authentication vertical, which the sign-up dialog and the reset page read
 * too, because a product where the password you may change to and the password
 * you may reset to are different passwords is a product with a bug in it.
 * What is here is what only this card has: three boxes rather than two, and
 * the one of them that is a password the account already has.
 *
 * main-api's `password-change.schema.ts` says the same thing on the way in and
 * is the authority for what the API accepts; the realm behind it is the
 * authority for what a password may be at all.
 */

export interface ChangePasswordForm {
  Current: string;
  Password: string;
  Confirm: string;
}

export const emptyChangePassword: ChangePasswordForm = {
  Current: "",
  Password: "",
  Confirm: "",
};

/* What each box should say when it is wrong, keyed by field; an empty object
 * means the form is good. Every field is reported rather than the first,
 * because a form that has to be submitted once per mistake is a form nobody
 * finishes. The same shape `checkNewPassword` hands back on the reset page. */
export function checkChangePassword(
  form: ChangePasswordForm,
): Partial<Record<keyof ChangePasswordForm, string>> {
  const problems: Partial<Record<keyof ChangePasswordForm, string>> = {};

  /* The current password is checked for being there and for nothing else.
   * **The policy is deliberately not applied to it.** It was chosen under
   * whatever rules were in force at the time, which for every account older
   * than the realm's policy is no rules at all, and telling somebody their
   * current password is invalid when it is the one that gets them in is the
   * worst answer this card could give. Whether it is right is the identity
   * provider's to say, and it is the only thing that can say it. */
  if (!form.Current) problems.Current = "Enter the password you use now";

  const refused = checkPassword(form.Password);
  if (refused) problems.Password = refused;

  /* Said here rather than left to the API, which would refuse it for the same
   * reason and a round trip later. */
  if (!problems.Password && form.Password && form.Password === form.Current)
    problems.Password = "Your new password has to be different from this one";

  /* Reported on the confirmation box rather than on the password, because
   * that is the box somebody is looking at when they get it wrong. */
  if (form.Confirm !== form.Password)
    problems.Confirm = "The two passwords do not match";

  return problems;
}
