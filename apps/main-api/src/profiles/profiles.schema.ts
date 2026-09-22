import { z } from "zod";

/*
 * What a profile is allowed to contain.
 *
 * The rules are here rather than spread through the resolver because there
 * are sixteen of them and because the browser has to enforce the same ones --
 * main-gui carries its own copy of this schema, and the two are meant to say
 * the same thing. This one is the authority: a request that reaches the
 * mutation is checked here whatever the form did or did not do.
 *
 * Lengths are the columns' lengths in apps/main-db/sql/Tables/UserProfiles.sql.
 * A field over its limit is rejected here rather than truncated by Postgres,
 * which would otherwise raise a driver error the caller cannot read.
 */

/* The languages the interface offers, as BCP 47 tags. Stored rather than the
 * name of the language, so the value survives the interface being
 * translated; main-gui writes the names beside these. */
export const LANGUAGES = ["en-US", "en-GB", "es-ES", "fr-FR"] as const;

/* Empty is a valid answer to every optional field, so each of these accepts
 * "" as well as something that looks right. */
const optional = (schema: z.ZodType<string>) =>
  z.union([z.literal(""), schema]);

const text = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} cannot be longer than ${max} characters`);

/* Deliberately loose: a phone number's shape is a matter of where it is, and
 * the only thing worth refusing is something that cannot be one at all. */
const phone = optional(
  z
    .string()
    .trim()
    .max(32, "Phone cannot be longer than 32 characters")
    .regex(/^[0-9+().\-\s]{4,}$/, "Enter a phone number"),
);

/* A host, with or without a scheme or a path: "example.com",
 * "https://example.com/me". What is refused is a space, and a string with no
 * dot in it, which is the typo this catches. */
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
  Language: z.enum(LANGUAGES, {
    message: "Choose one of the languages offered",
  }),
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

export type ProfileInput = z.infer<typeof profileSchema>;
