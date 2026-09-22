import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Change } from "./change";
import { CardSurface } from "../card-surface";
import type { Tile } from "./metrics";

/*
 * One figure from `metrics.tiles`: a tinted icon, the label over the number,
 * and under it the same number a period ago with how far it moved.
 */
export function StatTile({ tile }: { tile: Tile }) {
  const TileIcon = tile.icon;

  return (
    <CardSurface sx={{ padding: { xs: "1.1rem", sm: "1.2rem 1.3rem" } }}>
      <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
        <Box
          aria-hidden
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 42,
            height: 42,
            flexShrink: 0,
            borderRadius: "1rem",
            color: "primary.main",
            backgroundColor: (theme) => theme.palette.brand.cardTint,
          }}
        >
          <TileIcon color="currentColor" size={20} />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: (theme) => theme.palette.brand.cardInkMuted,
            }}
          >
            {tile.label}
          </Typography>
          <Typography
            sx={{
              fontFamily: (theme) => theme.typography.h1.fontFamily,
              fontSize: "1.55rem",
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            {tile.value}
          </Typography>
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            <Typography
              sx={{
                fontSize: "0.78rem",
                color: (theme) => theme.palette.brand.cardInkMuted,
              }}
            >
              {tile.previous}
            </Typography>
            <Change percent={tile.changePercent} direction={tile.direction} />
          </Stack>
        </Box>
      </Stack>
    </CardSurface>
  );
}
