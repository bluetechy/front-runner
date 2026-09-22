import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession } from "../authentication";

/*
 * Where a completed sign-in lands. Deliberately plain -- the design of the
 * signed-in application comes later. What it is here for is proof: it shows
 * the identity Keycloak issued the token for, and beside it the account
 * main-api returned when that same token was sent to it, which is the only
 * way to see that the whole chain works rather than just the login form.
 */

interface Account {
  UserUUID: string;
  Name: string;
  LoginName: string;
  Email: string | null;
  IsAdmin: boolean | null;
}

const ME = `query Me { me { UserUUID Name LoginName Email IsAdmin } }`;

export function SignedIn() {
  const { status, identity, getAccessToken, signOut } = useSession();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Signing out from here, or arriving without a session at all, goes back
   * to the landing page rather than sitting on an empty account panel. */
  useEffect(() => {
    if (status === "signed-out") void navigate({ to: "/", replace: true });
  }, [status, navigate]);

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
    <Container
      component="section"
      sx={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        justifyContent: "center",
        paddingBlock: "clamp(3rem, 10vw, 7rem)",
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: "center", color: "primary.light" }}
      >
        <CheckCircleRoundedIcon />
        <Typography variant="h2" sx={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>
          You are logged in
        </Typography>
      </Stack>

      <Typography
        variant="body1"
        sx={{ maxWidth: "52ch", mt: 2, color: "text.secondary" }}
      >
        Signed in as <strong>{identity?.name ?? "—"}</strong>. This page stands
        in for the application behind the login; it exists to show that the
        token works, and its design comes later.
      </Typography>

      <Box
        sx={{
          mt: 4,
          p: { xs: 2.5, sm: 3 },
          maxWidth: 640,
          borderRadius: 3,
          backgroundColor: (t) => t.palette.brand.panel,
          border: (t) => `1px solid ${t.palette.brand.panelEdge}`,
        }}
      >
        <Detail label="Identity from Keycloak" />
        <Row label="Name" value={identity?.name} />
        <Row label="Username" value={identity?.loginName} />
        <Row label="Email" value={identity?.email} />
        <Row label="Subject" value={identity?.subject} />

        <Box sx={{ mt: 3 }}>
          <Detail label="Account from main-api" />
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
            <Skeleton sx={{ mt: 1, maxWidth: 320 }} />
          )}
        </Box>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Button variant="outlined" onClick={() => void signOut()}>
          Sign out
        </Button>
      </Box>
    </Container>
  );
}

function Detail({ label }: { label: string }) {
  return (
    <Typography
      variant="body2"
      sx={{
        fontSize: "0.72rem",
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        color: "primary.light",
      }}
    >
      {label}
    </Typography>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      sx={{ mt: 1, gap: { xs: 0, sm: 2 } }}
    >
      <Typography
        variant="body2"
        sx={{ minWidth: 130, color: "text.secondary", fontSize: "0.85rem" }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontSize: "0.85rem", wordBreak: "break-all" }}
      >
        {value || "—"}
      </Typography>
    </Stack>
  );
}
