"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

type SkillRadarProps = {
  data: {
    skill: string;
    band: number;
  }[];
};

export function SkillRadar({ data }: SkillRadarProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <Radar
            name="Band"
            dataKey="band"
            stroke="var(--brand)"
            fill="var(--brand)"
            fillOpacity={0.35}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
