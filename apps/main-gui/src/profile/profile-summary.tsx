import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import CameraIcon from "@/shared/icons/CameraIcon";
import LocationIcon from "@/shared/icons/LocationIcon";
import MobileIcon from "@/shared/icons/MobileIcon";
import { InitialsAvatar } from "../avatar";
import { CardLabel, CardSurface } from "../card-surface";
import { useSession } from "../authentication";
import type { ToastTone } from "../toast";
import { linksOf, placeholderSkills, placeholderTallies } from "./details";
import { useProfile } from "./profile-api";

/*
 * The left-hand column: who this is, what they have earned, where else they
 * are, what they are good at, and how to reach them.
 *
 * The name and the initials are the session's; the designation, the bio, the
 * links and the contact lines are the saved profile's, so editing the form
 * beside it changes this the moment it saves. The tallies and the skill bars
 * are still placeholder -- see `details.ts`.
 *
 * What is somebody's own words -- their name, their bio, the handles they
 * typed -- is never run through `t()`. Only what this card says about them
 * is. Nor are the five link labels: Facebook is Facebook in Spanish.
 */

/* Enough of the bio to see what it is, until it is asked for in full. */
const BIO_PREVIEW = 180;

export function ProfileSummary({
  onNotice,
}: {
  onNotice: (message: string, tone?: ToastTone) => void;
}) {
  const { identity } = useSession();
  const { profile, loading } = useProfile();
  const { t } = useTranslation();
  const [bioOpen, setBioOpen] = useState(false);

  const name = identity?.name ?? "—";
  const bio = profile?.Biography ?? "";
  const long = bio.length > BIO_PREVIEW;
  const links = profile ? linksOf(profile) : [];

  return (
    <Stack sx={{ gap: { xs: 2, md: 2.5 } }}>
      <CardSurface>
        <Box sx={{ position: "relative", width: 124, alignSelf: "flex-start" }}>
          <InitialsAvatar name={name} size={124} fontSize="2.4rem" />
          <IconButton
            aria-label={t("Change picture")}
            onClick={() =>
              onNotice(
                t(
                  "There is nowhere to keep a picture yet — the account has no photograph on it.",
                ),
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
        <Muted>{profile?.Designation || t("No designation yet")}</Muted>

        <Typography sx={{ mt: 2.5, fontSize: "0.85rem", fontWeight: 600 }}>
          {t("Bio")}
        </Typography>
        {loading ? (
          <Skeleton sx={{ mt: 1 }} />
        ) : (
          <Typography
            sx={{
              mt: 0.5,
              fontSize: "0.85rem",
              lineHeight: 1.7,
              color: (theme) => theme.palette.brand.cardInkMuted,
            }}
          >
            {bio === ""
              ? t("Nothing here yet — the form beside this is where it goes.")
              : bioOpen || !long
                ? bio
                : `${bio.slice(0, BIO_PREVIEW).trimEnd()}… `}
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
                {bioOpen ? t("Less") : t("More")}
              </Box>
            ) : null}
          </Typography>
        )}

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
                {t(tally.label)}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Box sx={{ mt: 3 }}>
          <CardLabel>{t("Social")}</CardLabel>
          {links.length === 0 ? (
            <Box sx={{ mt: 1 }}>
              <Muted>
                {loading ? (
                  <Skeleton sx={{ maxWidth: 180 }} />
                ) : (
                  t("None saved")
                )}
              </Muted>
            </Box>
          ) : (
            <Stack component="ul" sx={{ gap: 1.75, p: 0, m: 0, mt: 1.5 }}>
              {links.map((link) => {
                const LinkIcon = link.icon;
                return (
                  <Stack
                    key={link.label}
                    component="li"
                    direction="row"
                    sx={{ gap: 1.5, alignItems: "center", listStyle: "none" }}
                  >
                    <Badge>
                      <LinkIcon size={17} />
                    </Badge>
                    <Box sx={{ minWidth: 0 }}>
                      <Muted>{link.label}</Muted>
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
          )}
        </Box>

        <Box sx={{ mt: 3 }}>
          <CardLabel>{t("Skills")}</CardLabel>
          <Stack sx={{ gap: 1.75, mt: 1.5 }}>
            {placeholderSkills.map((skill) => (
              <Box key={skill.label}>
                <Stack
                  direction="row"
                  sx={{ justifyContent: "space-between", gap: 1 }}
                >
                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                    {t(skill.label)}
                  </Typography>
                  <Muted>{skill.percent}%</Muted>
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

      <CardSurface title={t("Contact")}>
        <Stack component="ul" sx={{ gap: 2, p: 0, m: 0 }}>
          <ContactLine
            label={t("Mobile")}
            value={profile?.Phone ?? ""}
            loading={loading}
          >
            <MobileIcon size={17} />
          </ContactLine>
          <ContactLine
            label={t("Current address")}
            value={profile?.Address ?? ""}
            loading={loading}
          >
            <LocationIcon size={17} />
          </ContactLine>
        </Stack>
      </CardSurface>
    </Stack>
  );
}

function ContactLine({
  label,
  value,
  loading,
  children,
}: {
  label: string;
  value: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  /* `label` arrives translated from the caller; "Not set" is this
   * component's own word, so it translates it itself. */
  const { t } = useTranslation();

  return (
    <Stack
      component="li"
      direction="row"
      sx={{ gap: 1.5, alignItems: "center", listStyle: "none" }}
    >
      <Badge>{children}</Badge>
      <Box sx={{ minWidth: 0 }}>
        <Muted>{label}</Muted>
        {loading ? (
          <Skeleton sx={{ width: 140 }} />
        ) : (
          <Typography sx={{ fontSize: "0.88rem", fontWeight: 600 }}>
            {value || t("Not set")}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

/* The tinted disc an icon sits in, beside a link or a contact line. */
function Badge({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </Box>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="div"
      sx={{
        fontSize: "0.8rem",
        color: (theme) => theme.palette.brand.cardInkMuted,
      }}
    >
      {children}
    </Typography>
  );
}
