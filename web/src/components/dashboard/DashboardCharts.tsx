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
  demoMode?: boolean;
};

export type ChartMetric = "temperature" | "light" | "noise" | "motion";

export function DashboardCharts({ history, range, activeMetric, demoMode = false }: Props) {
  const safeHistory = history.filter((h) => {
    const ts = new Date(h.recordedAt).getTime();
    return Number.isFinite(ts);
  });

  const seriesData = safeHistory.map((h, i) => ({
    t: formatLabel(h.recordedAt, range, i),
    temperature: toFiniteNumber(h.temperature),
    light: toFiniteNumber(h.lightLevel),
    noise: toFiniteNumber(h.soundLevel),
    motion: h.motionDetected ? 1 : 0,
    waste: toFiniteNumber(h.wasteScore),
  }));

  const dailyWaste = bucketDailyWaste(safeHistory, range, demoMode);
  const metricMeta: Record<ChartMetric, { title: string; key: "temperature" | "light" | "noise" | "motion"; color: string; yDomain?: [number, number]; name: string; formatter?: (value: number | null) => string }> = {
    temperature: { title: "Temperature", key: "temperature", color: "#22c55e", name: "Temperature", formatter: (v) => (v == null ? "--" : `${v.toFixed(1)}°C`) },
    light: { title: "Light", key: "light", color: "#facc15", name: "Light", formatter: (v) => (v == null ? "--" : `${Math.round(v)}`) },
    noise: { title: "Noise", key: "noise", color: "#38bdf8", name: "Noise", formatter: (v) => (v == null ? "--" : `${Math.round(v)}`) },
    motion: { title: "Motion", key: "motion", color: "#a78bfa", yDomain: [0, 1], name: "Motion", formatter: (v) => (v == null ? "--" : v >= 0.5 ? "Active" : "Idle") },
  };
  const latestPoint = seriesData[seriesData.length - 1] ?? null;

  return (
    <div id="dashboard-charts" className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(metricMeta) as ChartMetric[]).map((metric) => {
          const meta = metricMeta[metric];
          const value = latestPoint?.[meta.key] ?? null;
          return (
            <Card
              key={metric}
              className={
                activeMetric === metric
                  ? "border-iris-green/50 bg-emerald-500/10 transition"
                  : "border-white/10 bg-zinc-950/70 transition"
              }
            >
              <CardDescription>{meta.title}</CardDescription>
              <CardTitle className="mt-1 text-2xl">{meta.formatter ? meta.formatter(value) : String(value ?? "--")}</CardTitle>
              <p className="mt-1 text-xs text-zinc-500">Latest reading</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {(Object.keys(metricMeta) as ChartMetric[]).map((metric) => {
          const meta = metricMeta[metric];
          return (
            <Card
              key={metric}
              className={activeMetric === metric ? "border-iris-green/50" : "border-white/10"}
            >
              <CardTitle>{meta.title}</CardTitle>
              <CardDescription>
                Last {range === "24h" ? "24 hours" : range === "7d" ? "7 days" : "30 days"}
              </CardDescription>
              <div className="h-56 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={seriesData} syncId="sensor-metrics">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="t" stroke="#71717a" fontSize={11} />
                    <YAxis stroke="#71717a" fontSize={11} domain={meta.yDomain ?? ["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ background: "#18181b", border: "1px solid #27272a" }}
                      labelStyle={{ color: "#a1a1aa" }}
                    />
                    <Line
                      type="monotone"
                      dataKey={meta.key}
                      stroke={meta.color}
                      strokeWidth={2}
                      dot={false}
                      name={meta.name}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          );
        })}

        <Card className="lg:col-span-2 border-white/10">
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
    </div>
  );
}

function formatLabel(iso: string, range: string, index: number) {
  const d = new Date(iso);
  if (range === "24h") return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (range === "7d" || range === "30d") return `${d.getMonth() + 1}/${d.getDate()}`;
  return String(index);
}

function bucketDailyWaste(history: HistoryPoint[], range: "24h" | "7d" | "30d", demoMode: boolean) {
  const map = new Map<string, { sum: number; n: number }>();
  for (const h of history) {
    const d = new Date(h.recordedAt);
    const key = isoDayKey(d);
    const waste = toFiniteNumber(h.wasteScore);
    if (waste == null) continue;
    const cur = map.get(key) ?? { sum: 0, n: 0 };
    cur.sum += waste;
    cur.n += 1;
    map.set(key, cur);
  }

  const targetDays = range === "30d" ? 30 : range === "7d" ? 14 : 10;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const base =
    map.size > 0
      ? Math.round(
          [...map.values()].reduce((acc, item) => acc + item.sum / Math.max(1, item.n), 0) / map.size
        )
      : 45;

  const rows: Array<{ day: string; score: number }> = [];
  for (let i = targetDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = isoDayKey(d);
    const existing = map.get(key);
    if (existing) {
      rows.push({
        day: `${d.getMonth() + 1}/${d.getDate()}`,
        score: Math.round(existing.sum / Math.max(1, existing.n)),
      });
      continue;
    }
    if (demoMode) {
      const synthetic = clamp(
        Math.round(base + Math.sin((d.getDate() + d.getMonth() * 3) / 2.2) * 12 + (d.getDay() - 3) * 2),
        8,
        92
      );
      rows.push({
        day: `${d.getMonth() + 1}/${d.getDate()}`,
        score: synthetic,
      });
    }
  }
  return rows;
}

function isoDayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toFiniteNumber(value: unknown): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(n)) return null;
  return n;
}
