/** Calendar math and buckets use explicit Y-M-D (proleptic Gregorian). */

import type { HospitalManagementDayRow } from "@/lib/queries";

export type ManagementMetricKey = "sales" | "visits" | "newPatients";

export type ManagementDayRow = HospitalManagementDayRow;

export type Granularity = "day" | "month" | "year";

function rowMatchesGranularity(row: ManagementDayRow, granularity: Granularity): boolean {
  return row.periodType === granularity;
}

export function pickMetric(row: ManagementDayRow, metric: ManagementMetricKey): number | null {
  switch (metric) {
    case "sales":
      return row.sales;
    case "visits":
      return row.visits;
    case "newPatients":
      return row.newPatients;
    default:
      return null;
  }
}

/** Monday = 0 ? Sunday = 6 */
export function weekdayMonday0FromDateKey(dateKey: string): number {
  const [ys, ms, ds] = dateKey.split("-").map(Number);
  const dow = new Date(Date.UTC(ys, ms - 1, ds)).getUTCDay();
  return (dow + 6) % 7;
}

export function yearMonthFromDateKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function addCalendarMonths(ym: string, delta: number): string {
  const [ys, ms] = ym.split("-").map(Number);
  let y = ys;
  let m = ms + delta;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

function getRowsForGranularity(rows: ManagementDayRow[], granularity: Granularity): ManagementDayRow[] {
  return rows
    .filter((r) => rowMatchesGranularity(r, granularity))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export function getDataBounds(rows: ManagementDayRow[]): { min: string; max: string } | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return { min: sorted[0].dateKey, max: sorted[sorted.length - 1].dateKey };
}

export type SeriesChartPoint = {
  label: string;
  sortKey: string;
  value: number | null;
};

export function buildAggregatedSeries(
  rows: ManagementDayRow[],
  rangeStart: string,
  rangeEnd: string,
  granularity: Granularity,
  metric: ManagementMetricKey
): SeriesChartPoint[] {
  const inRange = getRowsForGranularity(rows, granularity).filter(
    (r) => r.dateKey >= rangeStart && r.dateKey <= rangeEnd
  );
  if (inRange.length === 0) return [];

  if (granularity === "day") {
    return inRange.map((r) => ({
      label: r.dateKey.slice(5).replace("-", "/"),
      sortKey: r.dateKey,
      value: pickMetric(r, metric),
    }));
  }
  if (granularity === "month") {
    return inRange.map((r) => ({
      label: yearMonthFromDateKey(r.dateKey),
      sortKey: yearMonthFromDateKey(r.dateKey),
      value: pickMetric(r, metric),
    }));
  }
  return inRange.map((r) => ({
    label: `${r.dateKey.slice(0, 4)}?`,
    sortKey: r.dateKey.slice(0, 4),
    value: pickMetric(r, metric),
  }));
}

export type YoYMonthRow = {
  monthKey: string;
  recentValue: number | null;
  previousValue: number | null;
};

export function buildYoYMonthlyRows(
  rows: ManagementDayRow[],
  metric: ManagementMetricKey
): YoYMonthRow[] {
  const monthRows = getRowsForGranularity(rows, "month");
  if (monthRows.length === 0) return [];
  const byMonth = new Map(monthRows.map((r) => [yearMonthFromDateKey(r.dateKey), pickMetric(r, metric)]));
  const endYm = yearMonthFromDateKey(monthRows[monthRows.length - 1].dateKey);
  const months: string[] = [];
  for (let i = 0; i < 12; i++) months.push(addCalendarMonths(endYm, -11 + i));
  return months.map((ym) => ({
    monthKey: ym,
    recentValue: byMonth.get(ym) ?? null,
    previousValue: byMonth.get(addCalendarMonths(ym, -12)) ?? null,
  }));
}

export type WeekdayRow = {
  weekdayIndex: number;
  weekdayLabel: string;
  avgLast12Months: number | null;
  last7DayValue: number | null;
};

const WEEKDAY_LABELS = ["?", "?", "?", "?", "?", "?", "?"] as const;

function parseDateKeyAsUtc(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function last7DateKeys(endDateKey: string): string[] {
  const end = parseDateKeyAsUtc(endDateKey);
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const t = new Date(end - i * 86400000);
    const y = t.getUTCFullYear();
    const mo = String(t.getUTCMonth() + 1).padStart(2, "0");
    const da = String(t.getUTCDate()).padStart(2, "0");
    keys.push(`${y}-${mo}-${da}`);
  }
  return keys;
}

export function buildWeekdayRows(
  rows: ManagementDayRow[],
  metric: ManagementMetricKey
): WeekdayRow[] {
  const dayRows = getRowsForGranularity(rows, "day");
  if (dayRows.length === 0) {
    return WEEKDAY_LABELS.map((label, weekdayIndex) => ({
      weekdayIndex,
      weekdayLabel: label,
      avgLast12Months: null,
      last7DayValue: null,
    }));
  }

  const byDate = new Map(dayRows.map((r) => [r.dateKey, r]));
  const endYm = yearMonthFromDateKey(dayRows[dayRows.length - 1].dateKey);
  const windowMonths = new Set<string>();
  for (let i = 0; i < 12; i++) windowMonths.add(addCalendarMonths(endYm, -11 + i));

  const sumsByWeekday = [0, 0, 0, 0, 0, 0, 0];
  const countsByWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const r of dayRows) {
    if (!windowMonths.has(yearMonthFromDateKey(r.dateKey))) continue;
    const wd = weekdayMonday0FromDateKey(r.dateKey);
    const v = pickMetric(r, metric);
    if (v != null && Number.isFinite(v)) {
      sumsByWeekday[wd] += v;
      countsByWeekday[wd] += 1;
    }
  }

  const endDateKey = dayRows[dayRows.length - 1].dateKey;
  const last7 = last7DateKeys(endDateKey);
  const last7ByWeekday: (number | null)[] = [null, null, null, null, null, null, null];
  for (const dk of last7) {
    const row = byDate.get(dk);
    const wd = weekdayMonday0FromDateKey(dk);
    last7ByWeekday[wd] = row ? pickMetric(row, metric) : null;
  }

  return WEEKDAY_LABELS.map((label, weekdayIndex) => ({
    weekdayIndex,
    weekdayLabel: label,
    avgLast12Months:
      countsByWeekday[weekdayIndex] > 0
        ? sumsByWeekday[weekdayIndex] / countsByWeekday[weekdayIndex]
        : null,
    last7DayValue: last7ByWeekday[weekdayIndex],
  }));
}
