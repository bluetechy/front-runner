import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useSession } from "../authentication";
import { CardLabel, DashboardCard } from "./dashboard-card";

/*
 * The one card on this page that is not placeholder. It shows the identity
 * Keycloak issued the token for beside the account main-api returned when
 * that same token was sent to it, which is the only view that proves the
 * whole chain works rather than just the login form. It was the whole of the
 * page that used to stand here, and it stays until the KPI cards around it
 * have real queries of their own.
 */

interface Account {
  UserUUID: string;
  Name: string;
  LoginName: string;
  Email: string | null;
  IsAdmin: boolean | null;
}

const ME = `query Me { me { UserUUID Name LoginName Email IsAdmin } }`;

export function AccountCard() {
  const { identity, getAccessToken } = useSession();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getAccessToken();
      if (!token) return;
      const response = await fetch(import.meta.env.VITE_GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: ME }),
      });
      const body = (await response.json()) as {
        data?: { me: Account | null };
        errors?: { message: string }[];
      };
      if (cancelled) return;
      if (body.errors?.length) throw new Error(body.errors[0]!.message);
      setAccount(body.data?.me ?? null);
    }

    load().catch((failure: unknown) => {
      if (!cancelled)
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not reach the API.",
        );
    });

    return () => {
      cancelled = true;
    };
  }, [getAccessToken]);

  return (
    <DashboardCard title="Your account">
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <CardLabel>Identity from Keycloak</CardLabel>
          <Row label="Name" value={identity?.name} />
          <Row label="Username" value={identity?.loginName} />
          <Row label="Email" value={identity?.email} />
          <Row label="Subject" value={identity?.subject} />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <CardLabel>Account from main-api</CardLabel>
          {error ? (
            <Alert severity="error" sx={{ mt: 1, borderRadius: 2 }}>
              {error}
            </Alert>
          ) : account ? (
            <>
              <Row label="UserUUID" value={account.UserUUID} />
              <Row label="Name" value={account.Name} />
              <Row label="Login name" value={account.LoginName} />
              <Row label="Email" value={account.Email} />
              <Row label="Admin" value={account.IsAdmin ? "yes" : "no"} />
            </>
          ) : (
            <Box sx={{ mt: 1 }}>
              <Skeleton sx={{ maxWidth: 260 }} />
              <Skeleton sx={{ maxWidth: 220 }} />
            </Box>
          )}
        </Grid>
      </Grid>
    </DashboardCard>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      sx={{ mt: 1, gap: { xs: 0, sm: 2 } }}
    >
      <Typography
        sx={{
          minWidth: 110,
          fontSize: "0.82rem",
          color: (theme) => theme.palette.brand.cardInkMuted,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: "0.82rem", wordBreak: "break-all" }}>
        {value || "—"}
      </Typography>
    </Stack>
  );
}
