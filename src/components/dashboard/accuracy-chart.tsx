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
import { format, parseISO } from "date-fns";
import type { AccuracyTrendPoint } from "@/lib/repositories/session.repository";

export function AccuracyChart({ data }: { data: AccuracyTrendPoint[] }) {
  const chartData = data.map((point) => ({
    ...point,
    label: format(parseISO(point.date), "MMM d"),
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          interval="preserveStartEnd"
          className="fill-muted-foreground"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11 }}
          tickFormatter={(value) => `${value}%`}
          className="fill-muted-foreground"
        />
        <Tooltip
          formatter={(value) => [value == null ? "No practice" : `${value}%`, ""]}
          labelFormatter={(label) => label}
        />
        <Line
          type="monotone"
          dataKey="accuracyPct"
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
