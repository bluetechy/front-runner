import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import CameraIcon from "@/shared/icons/CameraIcon";
import { CardLabel, CardSurface } from "../card-surface";
import { useSession } from "../authentication";
import {
  placeholderBio,
  placeholderContact,
  placeholderLinks,
  placeholderPosition,
  placeholderSkills,
  placeholderTallies,
} from "./details";

/*
 * The left-hand column: who this is, what they have earned, where else they
 * are, what they are good at, and how to reach them.
 *
 * The name and the initials are the session's; everything else on this side
 * is placeholder from `details.ts`.
 */

/* Enough of the bio to see what it is, until it is asked for in full. */
const BIO_PREVIEW = 180;

export function ProfileSummary({
  onNotice,
}: {
  onNotice: (message: string) => void;
}) {
  const { identity } = useSession();
  const [bioOpen, setBioOpen] = useState(false);
  const name = identity?.name ?? "—";
  const long = placeholderBio.length > BIO_PREVIEW;

  return (
    <Stack sx={{ gap: { xs: 2, md: 2.5 } }}>
      <CardSurface>
        <Box sx={{ position: "relative", width: 124, alignSelf: "flex-start" }}>
          <Avatar
            sx={{
              width: 124,
              height: 124,
              fontSize: "2.4rem",
              fontWeight: 600,
              color: "common.white",
              backgroundImage: (theme) => theme.palette.brand.buttonGradient,
            }}
          >
            {initialsOf(name)}
          </Avatar>
          <IconButton
            aria-label="Change picture"
            onClick={() =>
              onNotice(
                "There is nowhere to keep a picture yet — the account has no photograph on it.",
              )
            }
            sx={{
              position: "absolute",
              right: 0,
              bottom: 4,
              width: 34,
              height: 34,
              color: "common.white",
              backgroundImage: (theme) => theme.palette.brand.buttonGradient,
              border: (theme) => `2px solid ${theme.palette.brand.card}`,
              "&:hover": { transform: "scale(1.06)" },
            }}
          >
            <CameraIcon size={16} />
          </IconButton>
        </Box>

        <Typography
          component="h2"
          sx={{
            mt: 2,
            fontFamily: (theme) => theme.typography.h1.fontFamily,
            fontSize: "1.5rem",
            fontWeight: 600,
          }}
        >
          {name}
        </Typography>
        <Typography
          sx={{
            fontSize: "0.85rem",
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          {placeholderPosition}
        </Typography>

        <Typography sx={{ mt: 2.5, fontSize: "0.85rem", fontWeight: 600 }}>
          Bio
        </Typography>
        <Typography
          sx={{
            mt: 0.5,
            fontSize: "0.85rem",
            lineHeight: 1.7,
            color: (theme) => theme.palette.brand.cardInkMuted,
          }}
        >
          {bioOpen || !long
            ? placeholderBio
            : `${placeholderBio.slice(0, BIO_PREVIEW).trimEnd()}… `}
          {long ? (
            <Box
              component="button"
              type="button"
              onClick={() => setBioOpen(!bioOpen)}
              sx={{
                padding: 0,
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: "inherit",
                fontWeight: 600,
                color: "primary.main",
              }}
            >
              {bioOpen ? "Less" : "More"}
            </Box>
          ) : null}
        </Typography>

        <Stack
          direction="row"
          sx={{ mt: 3, gap: 3, flexWrap: "wrap" }}
          component="dl"
        >
          {placeholderTallies.map((tally) => (
            <Box key={tally.label}>
              <Typography
                component="dd"
                sx={{
                  margin: 0,
                  fontFamily: (theme) => theme.typography.h1.fontFamily,
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  lineHeight: 1.2,
                }}
              >
                {tally.value}
              </Typography>
              <Typography
                component="dt"
                sx={{
                  fontSize: "0.78rem",
                  color: (theme) => theme.palette.brand.cardInkMuted,
                }}
              >
                {tally.label}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Box sx={{ mt: 3 }}>
          <CardLabel>Social</CardLabel>
          <Stack component="ul" sx={{ gap: 1.75, p: 0, m: 0, mt: 1.5 }}>
            {placeholderLinks.map((link) => {
              const LinkIcon = link.icon;
              return (
                <Stack
                  key={link.label}
                  component="li"
                  direction="row"
                  sx={{ gap: 1.5, alignItems: "center", listStyle: "none" }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 38,
                      height: 38,
                      flexShrink: 0,
                      borderRadius: "50%",
                      color: "primary.main",
                      backgroundColor: (theme) => theme.palette.brand.cardTint,
                    }}
                  >
                    <LinkIcon size={17} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: "0.8rem",
                        color: (theme) => theme.palette.brand.cardInkMuted,
                      }}
                    >
                      {link.label}
                    </Typography>
                    <Link
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      sx={{
                        fontSize: "0.85rem",
                        color: "primary.main",
                        textDecorationColor: "currentColor",
                        wordBreak: "break-all",
                      }}
                    >
                      {link.handle}
                    </Link>
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        </Box>

        <Box sx={{ mt: 3 }}>
          <CardLabel>Skills</CardLabel>
          <Stack sx={{ gap: 1.75, mt: 1.5 }}>
            {placeholderSkills.map((skill) => (
              <Box key={skill.label}>
                <Stack
                  direction="row"
                  sx={{ justifyContent: "space-between", gap: 1 }}
                >
                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                    {skill.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.82rem",
                      color: (theme) => theme.palette.brand.cardInkMuted,
                    }}
                  >
                    {skill.percent}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={skill.percent}
                  aria-label={skill.label}
                  sx={{
                    mt: 0.75,
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: (theme) => theme.palette.brand.chartTrack,
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 999,
                      backgroundImage: (theme) =>
                        theme.palette.brand.buttonGradient,
                    },
                  }}
                />
              </Box>
            ))}
          </Stack>
        </Box>
      </CardSurface>

      <CardSurface title="Contact">
        <Stack component="ul" sx={{ gap: 2, p: 0, m: 0 }}>
          {placeholderContact.map((line) => {
            const LineIcon = line.icon;
            return (
              <Stack
                key={line.label}
                component="li"
                direction="row"
                sx={{ gap: 1.5, alignItems: "center", listStyle: "none" }}
              >
                <Box
                  aria-hidden
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    borderRadius: "50%",
                    color: "primary.main",
                    backgroundColor: (theme) => theme.palette.brand.cardTint,
                  }}
                >
                  <LineIcon size={17} />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.8rem",
                      color: (theme) => theme.palette.brand.cardInkMuted,
                    }}
                  >
                    {line.label}
                  </Typography>
                  <Typography sx={{ fontSize: "0.88rem", fontWeight: 600 }}>
                    {line.value}
                  </Typography>
                </Box>
              </Stack>
            );
          })}
        </Stack>
      </CardSurface>
    </Stack>
  );
}

/* "Test User" -> "TU", the same stand-in for a picture the rail uses. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
