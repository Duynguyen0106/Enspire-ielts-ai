"use client";

import { useEffect, useState } from "react";
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có dữ liệu để vẽ biểu đồ.
      </p>
    );
  }

  return (
    <div className="w-full min-w-0">
      {title ? <p className="mb-2 text-sm font-medium">{title}</p> : null}
      <div className="h-56 w-full">
        {ready ? (
          <ResponsiveContainer width="100%" height={224} minWidth={200}>
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 9]} tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="band"
                stroke="var(--brand)"
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground">Đang tải biểu đồ…</p>
        )}
      </div>
    </div>
  );
}
