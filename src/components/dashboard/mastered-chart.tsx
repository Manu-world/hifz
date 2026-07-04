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
import type { MasteredOverTimePoint } from "@/lib/repositories/gamification.repository";

export function MasteredChart({ data }: { data: MasteredOverTimePoint[] }) {
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
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <Tooltip
          formatter={(value) => [`${value} mastered`, ""]}
          labelFormatter={(label) => label}
        />
        <Line
          type="monotone"
          dataKey="masteredCount"
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
