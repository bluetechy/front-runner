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

/* Stored as they are shown, the way dbo.OrganizationInvitations."Status" is,
 * and the same four the column's check constraint allows. "Not specified" is
 * an answer rather than the absence of one, which is why there is no empty
 * case here. */
export const GENDERS = [
  "Male",
  "Female",
  "Transgender",
  "Not specified",
] as const;

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

/* A day, written the way the database returns it. Empty is "not given"; a
 * date is checked for being real -- the 31st of February parses as a string
 * and is not a day -- and for having happened. The floor is there because a
 * year typed as 19 or 199 is a slip rather than an answer. */
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
  Language: z.enum(LANGUAGES, {
    message: "Choose one of the languages offered",
  }),
  Gender: z.enum(GENDERS, { message: "Choose one of the options offered" }),
  BirthDate: birthDate,
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
