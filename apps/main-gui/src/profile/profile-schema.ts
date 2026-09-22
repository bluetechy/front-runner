import { z } from "zod";

/*
 * What a profile is allowed to contain, in the browser.
 *
 * This is a copy of main-api's `profiles.schema.ts`, deliberately: the two
 * apps are built and shipped separately -- each image installs only its own
 * workspace -- so there is nowhere a single schema could live today without a
 * shared package and the build and Compose changes that would come with it.
 *
 * The copy is for the person filling the form in, so it can say which field
 * is wrong while they are still looking at it. **The API's copy is the
 * authority**, and the form shows what the API says when the two disagree, so
 * the failure mode of this file drifting is a message arriving a moment later
 * rather than a bad profile being saved.
 */

/* Stored as they are shown -- the column's check constraint holds these four
 * and no others -- so the value and the label are the same string. "Not
 * specified" is an answer rather than the absence of one, which is why the
 * field has no empty case and every profile has a gender. */
export const genders = [
  "Male",
  "Female",
  "Transgender",
  "Not specified",
] as const;

const optional = (schema: z.ZodType<string>) =>
  z.union([z.literal(""), schema]);

const text = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} cannot be longer than ${max} characters`);

const phone = optional(
  z
    .string()
    .trim()
    .max(32, "Phone cannot be longer than 32 characters")
    .regex(/^[0-9+().\-\s]{4,}$/, "Enter a phone number"),
);

const address = (label: string, max = 255) =>
  optional(
    z
      .string()
      .trim()
      .max(max, `${label} cannot be longer than ${max} characters`)
      .regex(
        /^(https?:\/\/)?[^\s/?#@]+\.[^\s/?#@]{2,}(\/\S*)?$/i,
        `Enter a valid ${label.toLowerCase()}`,
      ),
  );

/* A day, written the way the API returns it. Empty is "not given"; a date is
 * checked for being real -- the 31st of February parses as a string and is
 * not a day -- and for having happened. The floor is there because a year
 * typed as 19 or 199 is a slip rather than an answer. */
const birthDate = optional(
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Write the date as YYYY-MM-DD")
    .refine((value) => {
      const [year, month, day] = value.split("-").map(Number) as [
        number,
        number,
        number,
      ];
      const date = new Date(Date.UTC(year, month - 1, day));
      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      );
    }, "That is not a real date")
    .refine(
      (value) => value <= new Date().toISOString().slice(0, 10),
      "A birth date cannot be in the future",
    )
    .refine(
      (value) => value >= "1900-01-01",
      "Check the year — that is before 1900",
    ),
);

export const profileSchema = z.object({
  FirstName: text(64, "First name"),
  LastName: text(64, "Last name"),
  NickName: text(64, "Nickname"),
  Designation: text(64, "Designation"),
  Biography: text(2000, "Biographical info"),
  Gender: z.enum(genders, { message: "Choose one of the options offered" }),
  BirthDate: birthDate,
  Phone: phone,
  Address: text(255, "Address"),
  /* Alphabetical, and the same order everywhere these five are listed --
   * the column list, the GraphQL objects, the form, the profile card. There
   * is no ranking to express between them, so a new one has exactly one
   * place to go. */
  Facebook: address("Facebook address"),
  Github: address("GitHub address"),
  LinkedIn: address("LinkedIn address"),
  TikTok: address("TikTok address"),
  Twitter: address("Twitter address"),
  WantsAwardEmails: z.boolean(),
  WantsDigestEmails: z.boolean(),
});

export type Profile = z.infer<typeof profileSchema>;

/* Which field said what, keyed the way the form holds them, so a message can
 * be shown under the control that caused it. */
export type FieldErrors = Partial<Record<keyof Profile, string>>;

export function errorsOf(input: unknown): FieldErrors {
  const result = profileSchema.safeParse(input);
  if (result.success) return {};

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof Profile | undefined;
    /* The first message per field: a second one about the same field is
     * usually the same mistake said differently. */
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
