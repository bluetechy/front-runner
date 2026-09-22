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

/* Stored as BCP 47 tags so the value survives the interface being translated;
 * the label is what the select shows. Same four as the API's LANGUAGES. */
export const languages = [
  { tag: "en-US", label: "US English" },
  { tag: "en-GB", label: "British English" },
  { tag: "es-ES", label: "Español" },
  { tag: "fr-FR", label: "Français" },
] as const;

const tags = languages.map((language) => language.tag) as unknown as [
  string,
  ...string[],
];

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

export const profileSchema = z.object({
  FirstName: text(64, "First name"),
  LastName: text(64, "Last name"),
  NickName: text(64, "Nickname"),
  Designation: text(64, "Designation"),
  Biography: text(2000, "Biographical info"),
  Language: z.enum(tags, { message: "Choose one of the languages offered" }),
  Phone: phone,
  Address: text(255, "Address"),
  Website: address("Website"),
  Twitter: address("Twitter address"),
  Facebook: address("Facebook address"),
  LinkedIn: address("LinkedIn address"),
  Github: address("GitHub address"),
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
