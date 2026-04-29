"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SERIES = [
  { key: "current", name: "최근 7일", color: "#60a5fa" },
  { key: "previous", name: "직전 7일", color: "#c084fc" },
] as const;

const tooltipStyle = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "0",
};

export type SummaryDualWeekCompareChartProps = {
  /** 접근성용 설명 */
  ariaLabel: string;
  /** 금액(원) 또는 건수 — 툴팁/축 포맷 */
  variant: "currency" | "integer";
  /** 최근 7일: 가장 오래된 날 → 가장 최근 날 (길이 7) */
  currentWeek?: (number | null)[];
  /** 직전 7일: 가장 오래된 날 → 가장 최근 날 (길이 7) */
  previousWeek?: (number | null)[];
};

function padSeven(values?: (number | null)[]): number[] {
  const v = values ?? [];
  return Array.from({ length: 7 }, (_, i) =>
    typeof v[i] === "number" ? v[i] : 0
  );
}

function formatTick(variant: "currency" | "integer", v: number) {
  if (variant === "currency") {
    return new Intl.NumberFormat("ko-KR", {
      notation: v >= 1_000_000 ? "compact" : "standard",
      maximumFractionDigits: v >= 1_000_000 ? 1 : 0,
    }).format(v);
  }
  return new Intl.NumberFormat("ko-KR").format(v);
}

export default function SummaryDualWeekCompareChart({
  ariaLabel,
  variant,
  currentWeek,
  previousWeek,
}: SummaryDualWeekCompareChartProps) {
  const c = padSeven(currentWeek);
  const p = padSeven(previousWeek);

  const data = Array.from({ length: 7 }, (_, i) => ({
    ord: i + 1,
    dayLabel: `${i + 1}`,
    current: c[i],
    previous: p[i],
  }));

  return (
    <div className="w-full min-w-0">
      <div
        className="flex h-[240px] w-full flex-col border border-zinc-800 bg-zinc-900/60 p-3 sm:h-[280px]"
        role="img"
        aria-label={ariaLabel}
      >
        <div className="min-h-0 min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, bottom: 8, left: 4 }}
          >
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              dataKey="dayLabel"
              stroke="#52525b"
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              tickLine={{ stroke: "#3f3f46" }}
            />
            <YAxis
              stroke="#52525b"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              tickLine={{ stroke: "#3f3f46" }}
              tickFormatter={(val) => formatTick(variant, Number(val))}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: "#fafafa" }}
              itemStyle={{ color: "#d4d4d8" }}
              formatter={(value, name) => {
                const n =
                  typeof value === "number"
                    ? value
                    : typeof value === "string"
                      ? Number(value)
                      : NaN;
                const text =
                  Number.isFinite(n) && variant === "currency"
                    ? `${new Intl.NumberFormat("ko-KR").format(n)}원`
                    : Number.isFinite(n)
                      ? `${new Intl.NumberFormat("ko-KR").format(n)}명`
                      : "—";
                return [text, String(name)];
              }}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as { ord?: number } | undefined;
                return row?.ord != null ? `${row.ord}번째 날` : "";
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              formatter={(value) => (
                <span style={{ color: "#d4d4d8" }}>{value}</span>
              )}
            />
            {SERIES.map(({ key, name, color }) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={name}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3, fill: color, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
