"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type BandProgressChartProps = {
  data: { label: string; band: number }[];
  title?: string;
};

export function BandProgressChart({ data, title }: BandProgressChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có dữ liệu để vẽ biểu đồ.
      </p>
    );
  }
  return (
    <div className="h-56 w-full">
      {title ? <p className="mb-2 text-sm font-medium">{title}</p> : null}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 9]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="band"
            stroke="var(--brand)"
            strokeWidth={2}
            dot
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
