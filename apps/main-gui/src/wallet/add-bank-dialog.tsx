import { useState } from "react";
import { useSession } from "../authentication";
import { DialogField, MethodDialog } from "./method-dialog";
import {
  accountTypes,
  bankAccountSchema,
  errorsOf,
  type BankAccountFields,
  type FieldErrors,
} from "./wallet-schema";

/*
 * Adding a bank account, from the supplied mock-up: the name on it, whether it
 * is checking or savings, the routing number and the account number.
 *
 * The mock-up promises a test deposit of under a dollar within three business
 * days. **Nothing here does that**, because there is no payment processor yet,
 * so the dialog does not make the promise: a saved account means somebody
 * typed these details and nothing more, and the line under the heading says
 * that rather than a reassurance this product cannot keep.
 *
 * The routing number is stored as typed and the account number is not -- one
 * names a bank and is published in a directory, the other names an account.
 * Both are checked here against their check digits, which is what catches a
 * typo while the person can still look the number up.
 */

const EMPTY = {
  NameOnAccount: "",
  AccountType: "Checking",
  RoutingNumber: "",
  Number: "",
};

export function AddBankDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (account: BankAccountFields) => Promise<unknown>;
}) {
  const { identity } = useSession();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* Opening starts it fresh, with the account holder's name filled in from
   * the session as a starting point rather than a record. Seeded during render
   * rather than in an effect, for the reason set out in `add-card-dialog.tsx`. */
  const [seeded, setSeeded] = useState(false);
  if (open && !seeded) {
    setSeeded(true);
    setForm({ ...EMPTY, NameOnAccount: identity?.name ?? "" });
    setErrors({});
    setFailure(null);
  }
  if (!open && seeded) setSeeded(false);

  function set(field: keyof typeof EMPTY, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  }

  async function submit() {
    const found = errorsOf(bankAccountSchema, form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setBusy(true);
    setFailure(null);
    try {
      await onSave(bankAccountSchema.parse(form));
      onClose();
    } catch (refused: unknown) {
      /* The API is the authority. If it refused something this form let
       * through, its message is the one worth showing. */
      setFailure(
        refused instanceof Error
          ? refused.message
          : "The bank account was not saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <MethodDialog
      open={open}
      onClose={onClose}
      title="Add a bank account"
      note="All fields are required. Nothing verifies the account yet — saving it records the details and no more."
      error={failure}
      busy={busy}
      submitLabel="Save account"
      onSubmit={() => void submit()}
    >
      <DialogField
        label="Name on bank account"
        value={form.NameOnAccount}
        onChange={(value) => set("NameOnAccount", value)}
        error={errors.NameOnAccount}
        autoComplete="name"
        maxLength={64}
      />

      <DialogField
        label="Account type"
        value={form.AccountType}
        onChange={(value) => set("AccountType", value)}
        error={errors.AccountType}
        options={accountTypes}
      />

      <DialogField
        label="Routing number"
        value={form.RoutingNumber}
        onChange={(value) => set("RoutingNumber", value)}
        error={errors.RoutingNumber}
        placeholder="021000021"
        inputMode="numeric"
        maxLength={11}
        hint="Nine digits, printed to the left of the account number on a cheque."
      />

      <DialogField
        label="Account number"
        value={form.Number}
        onChange={(value) => set("Number", value)}
        error={errors.Number}
        inputMode="numeric"
        maxLength={21}
      />
    </MethodDialog>
  );
}
