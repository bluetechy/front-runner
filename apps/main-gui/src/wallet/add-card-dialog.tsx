import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useSession } from "../authentication";
import { useProfile } from "../profile";
import { DialogField, MethodDialog } from "./method-dialog";
import {
  creditCardSchema,
  errorsOf,
  readExpiry,
  type CreditCardFields,
  type FieldErrors,
} from "./wallet-schema";

/*
 * Adding a card, from the supplied mock-up: the number, the expiry as MM/YY,
 * the security code, and the address the card is billed at.
 *
 * The expiry is **one field here and two everywhere else**. A card prints
 * MM/YY and that is how it is read aloud, so that is how it is typed; turning
 * those two digits into a year happens once, here, rather than being guessed
 * at again in the API and a third time in the database. See `readExpiry`.
 *
 * The security code is collected because a card cannot be authorized without
 * one, and it is **never stored** -- there is no column for it, and storing it
 * is forbidden rather than merely unwise. Today the API checks its shape and
 * drops it; when a payment processor is wired up it is what gets handed over.
 * The line under the heading says so, because a person typing their CVV into a
 * form is owed an answer about where it goes.
 */

const EMPTY = {
  NameOnCard: "",
  Number: "",
  Expiry: "",
  SecurityCode: "",
  BillingLine1: "",
  BillingCity: "",
  BillingState: "",
  BillingPostalCode: "",
  BillingCountry: "United States",
};

export function AddCardDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (card: CreditCardFields) => Promise<unknown>;
}) {
  const { identity } = useSession();
  const { profile } = useProfile();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /*
   * Opening the dialog starts it fresh, with two fields already filled in: the
   * name on the account and the address on the profile. Both are starting
   * points rather than records -- a card is billed wherever its statement
   * goes, which is frequently not where the person lives -- and both are the
   * same courtesy the profile form pays when it seeds a first and last name
   * from the token.
   *
   * Seeded during render rather than in an effect. An effect would render the
   * empty form, then immediately render it again with the seed in it -- a
   * cascading render that is visible as a flash on a slow device -- where
   * adjusting state while `open` changes re-renders before anything is shown.
   * This is React's "adjusting state when a prop changes"; the dialog stays
   * mounted through its own closing transition, which resetting it with a key
   * would cut short.
   */
  const [seeded, setSeeded] = useState(false);
  if (open && !seeded) {
    setSeeded(true);
    setForm({
      ...EMPTY,
      NameOnCard: identity?.name ?? "",
      BillingLine1: profile?.Address ?? "",
    });
    setErrors({});
    setFailure(null);
  }
  if (!open && seeded) setSeeded(false);

  function set(field: keyof typeof EMPTY, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    /* A field stops complaining as soon as it is touched; it is checked again
     * on submit. The expiry answers to two names, so it clears both. */
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      ...(field === "Expiry"
        ? { ExpirationMonth: undefined, ExpirationYear: undefined }
        : {}),
    }));
  }

  async function submit() {
    const { month, year } = readExpiry(form.Expiry);
    const card = {
      ...form,
      /* NaN rather than null when the field is unreadable, so the schema
       * reports it as the number it is not rather than as a missing value. */
      ExpirationMonth: month ?? Number.NaN,
      ExpirationYear: year ?? Number.NaN,
    };

    const found = errorsOf(creditCardSchema, card);
    if (Object.keys(found).length > 0) {
      /* The schema knows two expiry fields and the form has one, so whatever
       * either of them said is shown under the field that was typed into. */
      setErrors({
        ...found,
        Expiry: found.ExpirationMonth ?? found.ExpirationYear,
      });
      return;
    }

    setBusy(true);
    setFailure(null);
    try {
      await onSave(creditCardSchema.parse(card));
      onClose();
    } catch (refused: unknown) {
      /* The API is the authority. If it refused something this form let
       * through, its message is the one worth showing. */
      setFailure(
        refused instanceof Error ? refused.message : "The card was not saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <MethodDialog
      open={open}
      onClose={onClose}
      title="Add a card"
      note="All fields are required. The security code is used to authorize the card and is never stored."
      error={failure}
      busy={busy}
      submitLabel="Save card"
      onSubmit={() => void submit()}
    >
      <DialogField
        label="Card number"
        value={form.Number}
        onChange={(value) => set("Number", value)}
        error={errors.Number}
        placeholder="1234 5678 9012 3456"
        autoComplete="cc-number"
        inputMode="numeric"
        maxLength={23}
        hint="The brand is read from the number — there is nothing to choose."
      />

      <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 2 }}>
        <DialogField
          label="Expires"
          value={form.Expiry}
          onChange={(value) => set("Expiry", value)}
          error={errors.Expiry}
          placeholder="MM/YY"
          autoComplete="cc-exp"
          inputMode="numeric"
          maxLength={7}
        />
        <DialogField
          label="Security code"
          value={form.SecurityCode}
          onChange={(value) => set("SecurityCode", value)}
          error={errors.SecurityCode}
          placeholder="123"
          autoComplete="cc-csc"
          inputMode="numeric"
          maxLength={4}
        />
      </Stack>

      <DialogField
        label="Name on card"
        value={form.NameOnCard}
        onChange={(value) => set("NameOnCard", value)}
        error={errors.NameOnCard}
        autoComplete="cc-name"
        maxLength={64}
      />

      <Typography
        sx={{
          mt: 0.5,
          fontSize: "0.78rem",
          fontWeight: 600,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: "text.secondary",
        }}
      >
        Billing address
      </Typography>

      <DialogField
        label="Street address"
        value={form.BillingLine1}
        onChange={(value) => set("BillingLine1", value)}
        error={errors.BillingLine1}
        autoComplete="billing address-line1"
        maxLength={255}
        hint="Started from your profile address — change it if the card is billed elsewhere."
      />

      <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 2 }}>
        <DialogField
          label="City"
          value={form.BillingCity}
          onChange={(value) => set("BillingCity", value)}
          error={errors.BillingCity}
          autoComplete="billing address-level2"
          maxLength={64}
        />
        <DialogField
          label="State or region"
          value={form.BillingState}
          onChange={(value) => set("BillingState", value)}
          error={errors.BillingState}
          autoComplete="billing address-level1"
          maxLength={64}
          hint="Leave it empty where an address has none."
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 2 }}>
        <DialogField
          label="Postal code"
          value={form.BillingPostalCode}
          onChange={(value) => set("BillingPostalCode", value)}
          error={errors.BillingPostalCode}
          autoComplete="billing postal-code"
          maxLength={16}
        />
        <DialogField
          label="Country"
          value={form.BillingCountry}
          onChange={(value) => set("BillingCountry", value)}
          error={errors.BillingCountry}
          autoComplete="billing country-name"
          maxLength={64}
        />
      </Stack>
    </MethodDialog>
  );
}
