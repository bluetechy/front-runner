import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";
import { useSession, useSignInPrompt } from "../authentication";
import heroPlaceholder from "./hero-placeholder.png";

export function Hero() {
  const { status } = useSession();
  const signIn = useSignInPrompt();

  useEffect(() => {
    /* Not while a remembered session is still being restored: that resolves
     * to signed in often enough that asking first would be wrong. */
    if (status !== "signed-out") return;
    signIn.offerOnce();
  }, [status, signIn]);

  return (
    <Container
      component="section"
      sx={{
        display: "flex",
        flex: 1,
        alignItems: "center",
        paddingBlock: {
          xs: "2rem 3rem",
          md: "clamp(2rem, 6vw, 5rem) clamp(3rem, 8vw, 6rem)",
        },
      }}
    >
      <Grid
        container
        spacing={{ xs: 4, md: 8 }}
        sx={{ width: "100%", alignItems: "center" }}
      >
        <Grid
          size={{ xs: 12, md: 6 }}
          sx={{ textAlign: { xs: "center", md: "left" } }}
        >
          <Typography
            variant="h1"
            sx={{ maxWidth: "12ch", mx: { xs: "auto", md: 0 } }}
          >
            Gamification Concept
          </Typography>
          <Typography
            variant="body1"
            sx={{
              maxWidth: "36ch",
              mx: { xs: "auto", md: 0 },
              mt: 3,
              color: "text.secondary",
            }}
          >
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            useFlexGap
            sx={{
              flexWrap: "wrap",
              mt: 4,
              justifyContent: { xs: "center", md: "flex-start" },
            }}
          >
            <Button variant="contained" href="#more-details">
              More details
            </Button>
            <Button variant="outlined" href="#view-demo">
              View demo
            </Button>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              position: "relative",
              width: "100%",
              maxWidth: 540,
              mx: "auto",
              /* The light the artwork casts on the field behind it. */
              "&::before": {
                content: '""',
                position: "absolute",
                zIndex: 0,
                inset: "8%",
                borderRadius: "50%",
                backgroundImage: (theme) => theme.palette.brand.glow,
                filter: "blur(40px)",
              },
            }}
          >
            {/*
             * Placeholder artwork. The real illustration will have a
             * transparent background; this one is a flat screenshot, so its
             * outer band is faded to nothing and the square edge stops
             * reading as a tile sitting on top of the field. Two crossed
             * linear gradients rather than a radial one, which would eat the
             * corners of the phone. Delete the mask with the placeholder.
             */}
            <Box
              component="img"
              src={heroPlaceholder}
              alt="Players climbing levels on a phone screen"
              width={393}
              height={397}
              sx={{
                position: "relative",
                zIndex: 1,
                display: "block",
                width: "100%",
                height: "auto",
                maskImage: [
                  "linear-gradient(to right, transparent, #000 14%, #000 86%, transparent)",
                  "linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)",
                ].join(", "),
                maskComposite: "intersect",
              }}
            />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}
