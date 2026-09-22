import Avatar from "@mui/material/Avatar";
import type { SxProps, Theme } from "@mui/material/styles";

/*
 * The circle that stands in for somebody's face.
 *
 * This product has nowhere to keep a photograph -- the profile page says so
 * where the camera button is -- so a person is drawn as their initials on the
 * button's gradient. Three places want that now: the rail's account button,
 * the profile page, and the face on a notification. It was a private copy of
 * the same six lines in the first two until the third asked for it, which is
 * the rule in docs/codebase-structure.md being applied.
 *
 * The day an account can carry a photograph, this is the one file that learns
 * about it and the three callers do not.
 */

/* "Thomas John" -> "TJ". A login name with no space gives one letter, which
 * is the point: it is an avatar, not a label. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function InitialsAvatar({
  name,
  size,
  fontSize,
  sx,
}: {
  name: string;
  size: number;
  /* Passed rather than derived from `size`: the three callers draw this at
   * 36, 42 and 124 pixels, and the proportion that reads well is not the same
   * at both ends of that. */
  fontSize: string;
  sx?: SxProps<Theme>;
}) {
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        fontSize,
        fontWeight: 600,
        color: "common.white",
        backgroundImage: (theme) => theme.palette.brand.buttonGradient,
        ...sx,
      }}
    >
      {initialsOf(name)}
    </Avatar>
  );
}
