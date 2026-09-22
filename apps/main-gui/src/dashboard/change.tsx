import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import FallIcon from "@/shared/icons/FallIcon";
import RiseIcon from "@/shared/icons/RiseIcon";
import type { Direction } from "./metrics";

/*
 * How far a figure moved, and which way. The arrow is there so the direction
 * is not carried by the colour alone, which is the same reason the label
 * spells it out for a screen reader.
 *
 * Up is green and down is red throughout, including on refunds and shipping,
 * where falling is the good news. The mock-up does the same; making those two
 * read the other way needs a rule about which metrics are inverted, and that
 * belongs with the metrics rather than here.
 */
/* Read out, never seen. The lengths are strings because a bare 1 in `sx` is
 * MUI shorthand for 100%, which is a full-width span the page then has to
 * scroll sideways for. */
const visuallyHidden = {
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
} as const;

export function Change({
  percent,
  direction,
  tinted = false,
}: {
  percent: number;
  direction: Direction;
  /* The pill form, which the revenue card uses; elsewhere it is bare text. */
  tinted?: boolean;
}) {
  const up = direction === "up";
  const Arrow = up ? RiseIcon : FallIcon;

  return (
    <Stack
      direction="row"
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.25,
        color: (theme) =>
          up ? theme.palette.brand.rise : theme.palette.brand.fall,
        ...(tinted
          ? {
              paddingInline: "0.5rem",
              paddingBlock: "0.15rem",
              borderRadius: 999,
              backgroundColor: (theme) => theme.palette.brand.cardTint,
            }
          : {}),
      }}
    >
      <Typography
        component="span"
        sx={{ fontSize: "0.78rem", fontWeight: 600 }}
      >
        {percent}%
      </Typography>
      <Arrow color="currentColor" size={13} />
      {/* The arrow is a shape, so the direction is said in words too. */}
      <Typography component="span" sx={visuallyHidden}>
        {up ? "up" : "down"}
      </Typography>
    </Stack>
  );
}
