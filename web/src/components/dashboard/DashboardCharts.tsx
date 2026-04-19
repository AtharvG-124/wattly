"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import type { HistoryPoint } from "@/lib/api";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type Props = {
  history: HistoryPoint[];
  range: "24h" | "7d" | "30d";
  activeMetric: ChartMetric;
};

export type ChartMetric = "temperature" | "light" | "noise" | "motion";

export function DashboardCharts({ history, range, activeMetric }: Props) {
  const seriesData = history.map((h, i) => ({
    t: formatLabel(h.recordedAt, range, i),
    temperature: h.temperature,
    light: h.lightLevel,
    noise: h.soundLevel,
    motion: h.motionDetected ? 1 : 0,
    waste: h.wasteScore,
  }));

  const dailyWaste = bucketDailyWaste(history);
  const metricMeta: Record<ChartMetric, { title: string; key: keyof (typeof seriesData)[number]; color: string; yDomain?: [number, number]; name: string }> = {
    temperature: { title: "Temperature", key: "temperature", color: "#22c55e", name: "°C" },
    light: { title: "Light", key: "light", color: "#facc15", name: "Light level" },
    noise: { title: "Noise", key: "noise", color: "#38bdf8", name: "Noise level" },
    motion: { title: "Motion", key: "motion", color: "#a78bfa", yDomain: [0, 1], name: "Motion (0/1)" },
  };
  const current = metricMeta[activeMetric];

  return (
    <div id="dashboard-charts" className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardTitle>{current.title}</CardTitle>
        <CardDescription>Last {range === "24h" ? "24 hours" : range === "7d" ? "7 days" : "30 days"}</CardDescription>
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={seriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="t" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} domain={current.yDomain ?? ["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #27272a" }}
                labelStyle={{ color: "#a1a1aa" }}
              />
              <Line
                type="monotone"
                dataKey={current.key}
                stroke={current.color}
                strokeWidth={2}
                dot={false}
                name={current.name}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardTitle>Daily waste score</CardTitle>
        <CardDescription>How intense usage patterns were each day</CardDescription>
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyWaste}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="day" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #27272a" }}
                labelStyle={{ color: "#a1a1aa" }}
              />
              <Bar dataKey="score" fill="#22c55e" radius={[4, 4, 0, 0]} name="Waste score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function formatLabel(iso: string, range: string, index: number) {
  const d = new Date(iso);
  if (range === "24h") return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (range === "7d" || range === "30d") return `${d.getMonth() + 1}/${d.getDate()}`;
  return String(index);
}

function bucketDailyWaste(history: HistoryPoint[]) {
  const map = new Map<string, { sum: number; n: number }>();
  for (const h of history) {
    const d = new Date(h.recordedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const cur = map.get(key) ?? { sum: 0, n: 0 };
    cur.sum += h.wasteScore;
    cur.n += 1;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([k, v]) => ({
      day: k.split("-").slice(1).join("/"),
      score: Math.round(v.sum / Math.max(1, v.n)),
    }))
    .slice(-14);
}
