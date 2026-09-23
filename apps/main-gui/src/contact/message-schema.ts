import { z } from "zod";

/*
 * What a message has to contain before it is worth sending.
 *
 * Unlike `profile/profile-schema.ts`, this is not a copy of something the API
 * also enforces: there is no endpoint behind this form yet -- see
 * `send-message.ts` -- so this is the only check there is. That is the
 * argument for writing it strictly rather than leniently. The day a mailbox
 * exists, this file is what it is written against.
 *
 * A last name is optional, because plenty of people have one name and a form
 * that insists on two is asking them to invent one. A first name and an
 * address to reply to are not optional: without them there is a message and
 * nobody to answer.
 */

const line = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} cannot be longer than ${max} characters`);

export const messageSchema = z.object({
  firstName: line(64, "First name").min(1, "Tell us what to call you"),
  lastName: line(64, "Last name"),
  email: z.email("Enter an address we can reply to").max(160),
  /* Long enough for somebody to explain a programme they already run, which
   * is the message this page is most likely to be sent. */
  comments: line(4000, "Message").min(1, "Tell us what you are after"),
});

export type Message = z.infer<typeof messageSchema>;

/* Which field said what, keyed the way the form holds them, so a message can
 * be shown under the control that caused it. */
export type FieldErrors = Partial<Record<keyof Message, string>>;

export function errorsOf(input: unknown): FieldErrors {
  const result = messageSchema.safeParse(input);
  if (result.success) return {};

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof Message | undefined;
    /* The first message per field: a second one about the same field is
     * usually the same mistake said differently. */
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
