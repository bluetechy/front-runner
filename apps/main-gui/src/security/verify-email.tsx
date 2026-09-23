import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

/*
 * Where a verification link lands.
 *
 * It is a marketing-shell page rather than an application one, and that is the
 * whole point: the link is opened by whoever reads the mailbox, on whatever
 * machine that mailbox is on, and requiring a session here would refuse the
 * case the feature exists for. So this sends the token and nothing else, and
 * the mutation behind it is the one `@Public` operation in the API.
 *
 * No token is read from storage and none is sent. The token on the URL is the
 * authorization, it is spent on first use, and this page is the only thing
 * that ever holds it.
 */

type State =
  | { name: "working" }
  | { name: "done"; email: string }
  | { name: "failed"; message: string };

const VERIFY = `mutation VerifyEmail($token: String!) {
  verifyEmail(token: $token) { Email }
}`;

export function VerifyEmail({ token }: { token: string | undefined }) {
  const [state, setState] = useState<State>(() =>
    token
      ? { name: "working" }
      : {
          name: "failed",
          message:
            "This link is missing its token. Open the link from the email rather than typing the address.",
        },
  );

  /*
   * The token is good for exactly one exchange, so the exchange is started
   * once and kept here rather than redone whenever this effect runs again.
   * Without it, StrictMode's second pass in development spends the token on
   * the first call and then reports the second as already used, which is a
   * verification that in fact succeeded shown as a failure. The same trap
   * `_site.auth.callback.tsx` documents.
   */
  const attempt = useRef<Promise<string> | null>(null);

  useEffect(() => {
    if (!token) return;
    let canceled = false;

    const pending = (attempt.current ??= verify(token));

    void pending
      .then((email) => {
        if (!canceled) setState({ name: "done", email });
      })
      .catch((failure: unknown) => {
        if (!canceled)
          setState({
            name: "failed",
            message:
              failure instanceof Error
                ? failure.message
                : "That verification link could not be checked.",
          });
      });

    return () => {
      canceled = true;
    };
  }, [token]);

  return (
    <Container
      component="section"
      sx={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        justifyContent: "center",
        paddingBlock: "clamp(4rem, 12vw, 9rem)",
      }}
    >
      <Typography variant="h2" sx={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}>
        {state.name === "working"
          ? "Checking your link…"
          : state.name === "done"
            ? "Address confirmed"
            : "That link did not work"}
      </Typography>

      {state.name === "done" ? (
        <Body>
          {state.email} is now verified. You can make it the address you sign in
          with from{" "}
          <Inline to="/security-and-access">Security &amp; Access</Inline>.
        </Body>
      ) : null}

      {state.name === "failed" ? (
        <Body>
          {state.message} You can send yourself another link from{" "}
          <Inline to="/security-and-access">Security &amp; Access</Inline>.
        </Body>
      ) : null}
    </Container>
  );
}

/* The mutation, sent without a token of our own. This is the one call in the
 * application that carries no Authorization header, because there may be no
 * session here at all. */
async function verify(token: string): Promise<string> {
  const response = await fetch(import.meta.env.VITE_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: VERIFY, variables: { token } }),
  });
  const body = (await response.json()) as {
    data?: { verifyEmail?: { Email: string } | null };
    errors?: { message: string }[];
  };
  /* The API answers 200 with an errors array, so the status says nothing. */
  if (body.errors?.length) throw new Error(body.errors[0]!.message);
  const email = body.data?.verifyEmail?.Email;
  if (!email) throw new Error("That verification link is not valid.");
  return email;
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="body1"
      sx={{ maxWidth: "52ch", mt: 2, color: "text.secondary" }}
    >
      {children}
    </Typography>
  );
}

/* The link back. Both endings offer it, because both leave somebody with
 * something to do and neither should leave them on a page with no way on. */
function Inline({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Typography
      component={Link}
      to={to}
      sx={{
        fontSize: "inherit",
        color: "primary.light",
        textDecoration: "none",
        "&:hover": { textDecoration: "underline" },
      }}
    >
      {children}
    </Typography>
  );
}
