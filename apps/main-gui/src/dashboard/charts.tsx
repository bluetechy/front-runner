import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { money } from "./metrics";

/*
 * The dashboard's three charts, drawn as SVG by hand. No chart library: these
 * are seven points, seven bars and three slices, and a dependency that draws
 * them would still have to be told this app's colors one by one.
 *
 * The rules they follow, which the next chart should follow too:
 *
 * - Series colors come from `brand.chartSeries` in fixed order and are never
 *   cycled. They are validated to stay apart for a color-blind reader.
 * - Identity is never color alone: two series carry a legend, and the slices
 *   are labeled in a list beside the ring.
 * - Marks are thin, gridlines recessive, and no number is printed on every
 *   point -- the headline figure is above the chart.
 * - Every mark carries a `<title>`, so the value is one hover away and is
 *   read out rather than guessed from the axis.
 */

/* Axis labels: $24,354 written over a tick is noise, $24K is a scale. */
const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/* The gridlines the axis is labeled with, and the value the plot is drawn
 * against at its full height.
 *
 * The step is picked from 1, 2, 2.5 and 5 times a power of ten, so that every
 * label is a number a reader recognizes: a scale that simply divided the
 * highest point into four would print 4,500 as "5K" and 1,125 as "1K", which
 * is a chart that lies about its own axis. The cost is headroom above the
 * highest point, which is the right thing to pay for it.
 */
const STEPS = [1, 2, 2.5, 5] as const;

function scaleFor(values: readonly number[], intervals = 3) {
  const rough = Math.max(...values) / intervals;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    STEPS.map((size) => size * magnitude).find(
      (candidate) => candidate >= rough,
    ) ?? magnitude * 10;

  return {
    ceiling: step * intervals,
    ticks: Array.from({ length: intervals + 1 }, (_at, index) => index * step),
  };
}

export interface Series {
  label: string;
  values: readonly number[];
}

/* ------------------------------------------------------------------ lines */

const LINE = {
  width: 560,
  height: 230,
  left: 46,
  right: 12,
  top: 12,
  bottom: 28,
} as const;

export function SalesLines({
  series,
  labels,
}: {
  series: readonly Series[];
  labels: readonly string[];
}) {
  const theme = useTheme();
  const colors = theme.palette.brand.chartSeries;
  const { ceiling, ticks } = scaleFor(series.flatMap((one) => [...one.values]));
  const plotWidth = LINE.width - LINE.left - LINE.right;
  const plotHeight = LINE.height - LINE.top - LINE.bottom;

  const x = (index: number) =>
    LINE.left + (index * plotWidth) / (labels.length - 1);
  const y = (value: number) =>
    LINE.top + plotHeight - (value / ceiling) * plotHeight;

  return (
    <Box>
      <Stack
        direction="row"
        component="ul"
        aria-hidden
        sx={{ gap: 2, p: 0, m: 0, mb: 1, listStyle: "none", flexWrap: "wrap" }}
      >
        {series.map((one, index) => (
          <Stack
            key={one.label}
            component="li"
            direction="row"
            sx={{ alignItems: "center", gap: 0.75 }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: colors[index % colors.length],
              }}
            />
            <Typography
              sx={{
                fontSize: "0.78rem",
                color: theme.palette.brand.cardInkMuted,
              }}
            >
              {one.label}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Box
        component="svg"
        viewBox={`0 0 ${LINE.width} ${LINE.height}`}
        sx={{
          width: "100%",
          height: "auto",
          display: "block",
          "& .column .on-hover": { opacity: 0, transition: "opacity 120ms" },
          "& .column:hover .on-hover": { opacity: 1 },
        }}
      >
        <title>
          {`${series.map((one) => one.label).join(" and ")} by day`}
        </title>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={LINE.left}
              x2={LINE.width - LINE.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke={theme.palette.brand.chartGrid}
              strokeWidth={1}
            />
            <text
              x={LINE.left - 10}
              y={y(tick) + 4}
              textAnchor="end"
              fontSize={11}
              fill={theme.palette.brand.cardInkMuted}
            >
              {compact.format(tick)}
            </text>
          </g>
        ))}

        {series.map((one, index) => (
          <polyline
            key={one.label}
            points={one.values
              .map((value, at) => `${x(at)},${y(value)}`)
              .join(" ")}
            fill="none"
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {labels.map((label, at) => (
          <g key={label} className="column">
            <text
              x={x(at)}
              y={LINE.height - 8}
              textAnchor="middle"
              fontSize={11}
              fill={theme.palette.brand.cardInkMuted}
            >
              {label}
            </text>

            <line
              className="on-hover"
              x1={x(at)}
              x2={x(at)}
              y1={LINE.top}
              y2={LINE.top + plotHeight}
              stroke={theme.palette.brand.chartGrid}
              strokeWidth={2}
            />
            {series.map((one, index) => (
              <circle
                key={one.label}
                className="on-hover"
                cx={x(at)}
                cy={y(one.values[at] ?? 0)}
                r={4.5}
                fill={colors[index % colors.length]}
                stroke={theme.palette.brand.card}
                strokeWidth={2}
              />
            ))}

            {/* The hit target: the whole column, not the 2px line. */}
            <rect
              x={x(at) - plotWidth / (labels.length * 2)}
              y={LINE.top}
              width={plotWidth / labels.length}
              height={plotHeight}
              fill="transparent"
            >
              <title>
                {`${label}: ${series
                  .map((one) => `${one.label} ${money(one.values[at] ?? 0)}`)
                  .join(", ")}`}
              </title>
            </rect>
          </g>
        ))}
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------- bars */

const BARS = { width: 300, height: 150, bottom: 22, top: 6 } as const;

export function DailySalesBars({
  values,
  labels,
}: {
  values: readonly number[];
  labels: readonly string[];
}) {
  const theme = useTheme();
  const { ceiling } = scaleFor(values);
  const plotHeight = BARS.height - BARS.top - BARS.bottom;
  const slot = BARS.width / values.length;
  /* A 2px gap of card paper either side, so two bars never touch. */
  const barWidth = slot - 10;

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${BARS.width} ${BARS.height}`}
      sx={{ width: "100%", height: "auto", display: "block" }}
    >
      <title>Sales by day</title>

      {values.map((value, at) => {
        const height = (value / ceiling) * plotHeight;
        return (
          <g key={labels[at] ?? at}>
            <rect
              x={at * slot + 5}
              y={BARS.top + plotHeight - height}
              width={barWidth}
              height={height}
              rx={4}
              fill={theme.palette.brand.chartSeries[0]}
            >
              <title>{`${labels[at] ?? ""}: ${money(value)}`}</title>
            </rect>
            <text
              x={at * slot + slot / 2}
              y={BARS.height - 6}
              textAnchor="middle"
              fontSize={10}
              fill={theme.palette.brand.cardInkMuted}
            >
              {labels[at]}
            </text>
          </g>
        );
      })}
    </Box>
  );
}

/* ------------------------------------------------------------------ donut */

const DONUT = { size: 168, radius: 62, thickness: 20 } as const;

export function EarningsDonut({
  slices,
}: {
  slices: readonly { label: string; value: number }[];
}) {
  const theme = useTheme();
  const colors = theme.palette.brand.chartSeries;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const circumference = 2 * Math.PI * DONUT.radius;
  /* Card paper shows through between segments, the same 2px the bars leave. */
  const gap = 3;

  /* Where each segment starts: the arcs before it, added up. Worked out here
   * rather than accumulated while rendering, which would make the ring depend
   * on the order React happened to call the map in. */
  const starts = slices.map((_slice, index) =>
    slices
      .slice(0, index)
      .reduce((sum, before) => sum + (before.value / total) * circumference, 0),
  );

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      sx={{ alignItems: "center", gap: 2.5 }}
    >
      <Box
        component="svg"
        viewBox={`0 0 ${DONUT.size} ${DONUT.size}`}
        sx={{
          width: DONUT.size,
          maxWidth: "100%",
          height: "auto",
          flexShrink: 0,
        }}
      >
        <title>Earnings by category</title>

        <g transform={`rotate(-90 ${DONUT.size / 2} ${DONUT.size / 2})`}>
          {slices.map((slice, index) => {
            const length = (slice.value / total) * circumference;
            return (
              <circle
                key={slice.label}
                cx={DONUT.size / 2}
                cy={DONUT.size / 2}
                r={DONUT.radius}
                fill="none"
                stroke={colors[index % colors.length]}
                strokeWidth={DONUT.thickness}
                strokeDasharray={`${Math.max(length - gap, 0)} ${
                  circumference - Math.max(length - gap, 0)
                }`}
                strokeDashoffset={-(starts[index] ?? 0)}
              >
                <title>{`${slice.label}: ${money(slice.value)}`}</title>
              </circle>
            );
          })}
        </g>
      </Box>

      <Stack component="ul" sx={{ gap: 1, p: 0, m: 0, listStyle: "none" }}>
        {slices.map((slice, index) => (
          <Stack
            key={slice.label}
            component="li"
            direction="row"
            sx={{ alignItems: "center", gap: 1 }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                flexShrink: 0,
                borderRadius: "50%",
                backgroundColor: colors[index % colors.length],
              }}
            />
            <Typography sx={{ fontSize: "0.82rem" }}>
              {slice.label} &mdash;{" "}
              <Box
                component="span"
                sx={{ color: theme.palette.brand.cardInkMuted }}
              >
                {money(slice.value)}
              </Box>
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
