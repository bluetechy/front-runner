import type { FC } from "react";
import GrossSaleIcon from "@/shared/icons/GrossSaleIcon";
import type IconProps from "@/shared/icons/IconProps";
import ItemsSoldIcon from "@/shared/icons/ItemsSoldIcon";
import OrdersIcon from "@/shared/icons/OrdersIcon";
import ProcessingIcon from "@/shared/icons/ProcessingIcon";
import RefundsIcon from "@/shared/icons/RefundsIcon";
import ShippingIcon from "@/shared/icons/ShippingIcon";

/*
 * Every figure the dashboard draws, and nothing else.
 *
 * All of it is placeholder: main-api serves accounts and organizations today,
 * not KPIs, so the page is laid out against numbers held here. They are in one
 * file rather than spread through the cards so that the day a query exists
 * there is exactly one place the page stops reading from -- and so that no
 * card is quietly inventing a number of its own.
 *
 * The figures are the ones in the supplied mock-up, made to agree with each
 * other where the mock-up's did not: the earnings slices add to their total,
 * the week's days add to the week, and the goal bar's percentage is the one
 * its two numbers actually give.
 */

/* Money, to the cent when there are cents and never otherwise. `pricing` has
 * a formatter of its own; these are separate on purpose, because that one
 * writes prices in whole dollars and this one writes takings. */
const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const plain = new Intl.NumberFormat("en-US");

export function money(value: number): string {
  return dollars.format(value);
}

export function count(value: number): string {
  return plain.format(value);
}

/* Where a figure went since the period before it. The tile draws the arrow. */
export type Direction = "up" | "down";

export interface Tile {
  id: string;
  label: string;
  value: string;
  /* The same figure a period ago, which is what the change is against. */
  previous: string;
  changePercent: number;
  direction: Direction;
  icon: FC<IconProps>;
}

export const today = {
  visits: 15_209,
  sales: 29_115.5,
};

export const tiles: readonly Tile[] = [
  {
    id: "orders",
    label: "Orders",
    value: count(15_210),
    previous: count(13_456),
    changePercent: 5.5,
    direction: "up",
    icon: OrdersIcon,
  },
  {
    id: "items-sold",
    label: "Items sold",
    value: count(1_106),
    previous: count(1_103),
    changePercent: 2.5,
    direction: "up",
    icon: ItemsSoldIcon,
  },
  {
    id: "gross-sale",
    label: "Gross sale",
    value: money(12_435),
    previous: money(10_320),
    changePercent: 11.5,
    direction: "up",
    icon: GrossSaleIcon,
  },
  {
    id: "refunds",
    label: "Refunds",
    value: money(102),
    previous: money(560),
    changePercent: 1.5,
    direction: "down",
    icon: RefundsIcon,
  },
  {
    id: "shipping",
    label: "Shipping",
    value: money(380),
    previous: money(450),
    changePercent: 11.5,
    direction: "down",
    icon: ShippingIcon,
  },
  {
    id: "processing",
    label: "Processing",
    value: count(84),
    previous: count(65),
    changePercent: 1.5,
    direction: "up",
    icon: ProcessingIcon,
  },
];

/* The month's takings against what they are aimed at. The bar's percentage is
 * computed from these two, so the three numbers cannot drift apart. */
export const monthRevenue = {
  earned: 16_520,
  goal: 23_000,
  changePercent: 1.5,
  direction: "down" as Direction,
};

export const weekdays = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

/* Two weeks of takings, so the week on show has something to be read against.
 * The first adds to $24,354, which is the figure over the chart. */
export const weeklySales = {
  total: 24_354,
  series: [
    { label: "This week", values: [2810, 3120, 3960, 3480, 4210, 3520, 3254] },
    { label: "Last week", values: [2410, 2680, 3050, 3890, 3260, 4020, 2880] },
  ],
} as const;

/* The slices add to the total; the total is not a fourth number. */
export const expectedEarnings = {
  changePercent: 6.5,
  direction: "up" as Direction,
  slices: [
    { label: "Groceries", value: 9_500 },
    { label: "Electronics", value: 11_500 },
    { label: "Others", value: 11_000 },
  ],
};

/* The seven days average to $6,102, which is the figure over the bars. */
export const averageDailySales = {
  average: 6_102,
  changePercent: 4.3,
  direction: "up" as Direction,
  values: [5200, 6400, 5900, 7100, 6300, 5800, 6014],
};

export const newCustomers = {
  value: "3.1K",
  changePercent: 4.1,
  direction: "up" as Direction,
  joinedToday: 31,
};
