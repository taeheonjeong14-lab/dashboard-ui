"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BlogViewPoint } from "@/lib/queries";

type Props = {
  data: BlogViewPoint[];
};

const tooltipStyle = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "8px",
};

export default function BlogViewsChart({ data }: Props) {
  return (
    <div className="flex h-96 w-full min-w-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="min-h-0 min-w-0 flex-1">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
        <LineChart data={data}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis
            dataKey="metric_date"
            stroke="#52525b"
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            tickLine={{ stroke: "#3f3f46" }}
          />
          <YAxis
            allowDecimals={false}
            stroke="#52525b"
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            tickLine={{ stroke: "#3f3f46" }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: "#fafafa" }}
            itemStyle={{ color: "#a1a1aa" }}
          />
          <Line
            type="monotone"
            dataKey="blog_views"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
