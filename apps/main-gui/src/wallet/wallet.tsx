import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import BankIcon from "@/shared/icons/BankIcon";
import CreditCardIcon from "@/shared/icons/CreditCardIcon";
import { CardSurface } from "../card-surface";
import { AddBankDialog } from "./add-bank-dialog";
import { AddCardDialog } from "./add-card-dialog";
import { MethodList } from "./method-list";
import { useWallet, type PaymentMethod } from "./wallet-api";

/*
 * The wallet, at /wallet, which is Payment Wallet in the rail.
 *
 * Built from the supplied mock-up of a saved-cards screen, with two
 * differences that were asked for: the heading is "Saved Payment Methods"
 * because a wallet holds bank accounts too, and the mock-up's "Add a New Card"
 * row at the bottom is two buttons on the heading line instead -- a bank and a
 * card -- each opening the form for its own kind.
 *
 * `notice` is how the page says something back: that it saved, that a method
 * was removed, or that the API refused. The dialogs report their own failures
 * inside themselves, because that is where the field that caused one is.
 */

type Tone = "success" | "info" | "error";

export function Wallet() {
  const {
    methods,
    loading,
    error,
    addCreditCard,
    addBankAccount,
    setDefault,
    remove,
  } = useWallet();
  const [adding, setAdding] = useState<"card" | "bank" | null>(null);
  /* Which row has a save in flight. One at a time is enough: both actions
   * rewrite the whole wallet, so a second one started underneath the first
   * would be answering about a list that no longer exists. */
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    message: string;
    tone: Tone;
  } | null>(null);

  async function act(
    method: PaymentMethod,
    run: () => Promise<unknown>,
    done: string,
  ) {
    setBusyId(method.PaymentMethodUUID);
    try {
      await run();
      setNotice({ message: done, tone: "success" });
    } catch (failure: unknown) {
      setNotice({
        message:
          failure instanceof Error
            ? failure.message
            : "The wallet was not changed.",
        tone: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Stack sx={{ marginBottom: { xs: 2, md: 2.5 } }}>
        <Typography
          variant="h2"
          sx={{ fontSize: "clamp(1.6rem, 3vw, 2.1rem)" }}
        >
          Payment Wallet
        </Typography>
        <Stack
          direction="row"
          sx={{ gap: 0.75, mt: 0.5, fontSize: "0.82rem", alignItems: "center" }}
        >
          <Typography
            component={Link}
            to="/dashboard"
            sx={{
              fontSize: "inherit",
              color: "primary.light",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Dashboard
          </Typography>
          <Typography
            component="span"
            sx={{ fontSize: "inherit", color: "text.secondary" }}
          >
            &rsaquo;
          </Typography>
          <Typography
            component="span"
            sx={{ fontSize: "inherit", color: "text.secondary" }}
          >
            Payment Wallet
          </Typography>
        </Stack>
      </Stack>

      <CardSurface
        title="Saved Payment Methods"
        action={
          <Stack direction="row" sx={{ gap: 1 }}>
            <AddButton
              label="Add a bank account"
              onClick={() => setAdding("bank")}
            >
              <BankIcon color="currentColor" size={20} />
            </AddButton>
            <AddButton label="Add a card" onClick={() => setAdding("card")}>
              <CreditCardIcon color="currentColor" size={20} />
            </AddButton>
          </Stack>
        }
        sx={{ height: "auto" }}
      >
        {/* The wallet could not be read at all, which is a different thing
         * from an empty one and has to say so rather than look like one. */}
        {error ? (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        ) : null}

        <MethodList
          methods={methods}
          loading={loading}
          busyId={busyId}
          onChooseDefault={(method) =>
            void act(
              method,
              () => setDefault(method.Kind, method.PaymentMethodUUID),
              "Default payment method updated.",
            )
          }
          onRemove={(method) =>
            void act(
              method,
              () => remove(method.Kind, method.PaymentMethodUUID),
              /* Removing the default hands it to the oldest of what is left,
               * so the list reorders itself and the sentence says why. */
              method.IsDefault
                ? "Removed. The oldest remaining method is now the default."
                : "Removed.",
            )
          }
        />
      </CardSurface>

      <AddCardDialog
        open={adding === "card"}
        onClose={() => setAdding(null)}
        onSave={async (card) => {
          await addCreditCard(card);
          setNotice({ message: "Card saved.", tone: "success" });
        }}
      />
      <AddBankDialog
        open={adding === "bank"}
        onClose={() => setAdding(null)}
        onSave={async (account) => {
          await addBankAccount(account);
          setNotice({ message: "Bank account saved.", tone: "success" });
        }}
      />

      <Snackbar
        open={notice !== null}
        autoHideDuration={6000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={notice?.tone ?? "info"}
          variant="filled"
          onClose={() => setNotice(null)}
          sx={{
            borderRadius: 2,
            /* Material's "info" is a blue this product does not own. The
             * other two keep their colours: green and red mean the same
             * thing everywhere, and saying so is the point. */
            ...(notice?.tone === "info"
              ? {
                  backgroundColor: (theme) => theme.palette.brand.panel,
                  border: (theme) =>
                    `1px solid ${theme.palette.brand.panelEdge}`,
                  color: "common.white",
                }
              : {}),
          }}
        >
          {notice?.message}
        </Alert>
      </Snackbar>
    </>
  );
}

/* One of the two buttons on the heading line. Icon-only, because two words
 * each would push the heading onto its own row on a narrow screen -- so the
 * label is the accessible name and the tooltip, and the glyph says which is
 * which. */
function AddButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip title={label}>
      <IconButton
        aria-label={label}
        onClick={onClick}
        sx={{
          width: 38,
          height: 38,
          color: "common.white",
          backgroundImage: (theme) => theme.palette.brand.buttonGradient,
          boxShadow: "0 8px 18px rgba(224, 52, 159, 0.28)",
          "&:hover": { transform: "scale(1.06)" },
        }}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}
