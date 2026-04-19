"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchHistory,
  fetchLatest,
  fetchStatsSummary,
  type LatestReading,
  type HistoryPoint,
  type StatsSummary,
} from "@/lib/api";
import { nextSimulatedReading } from "@/lib/demoSimulate";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RgbBadge } from "./RgbBadge";
import { RoomStatusCard } from "./RoomStatusCard";
import { DashboardCharts, type ChartMetric } from "./DashboardCharts";
import { IrisLogo } from "@/components/IrisLogo";
import * as Switch from "@radix-ui/react-switch";

const DEMO_KEY = "iris_demo_mode";

export function DashboardClient() {
  const [demoMode, setDemoMode] = useState(false);
  const [latest, setLatest] = useState<LatestReading | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");
  const [alert, setAlert] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<ChartMetric>("temperature");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    const v = localStorage.getItem(DEMO_KEY);
    setDemoMode(v === "1");
  }, []);

  const toggleDemo = (on: boolean) => {
    setDemoMode(on);
    localStorage.setItem(DEMO_KEY, on ? "1" : "0");
  };

  const loadApi = useCallback(async () => {
    if (demoMode) return;
    setErr(null);
    try {
      const [l, h, s] = await Promise.all([
        fetchLatest(),
        fetchHistory("30d"),
        fetchStatsSummary(),
      ]);
      setLatest(l);
      setHistory(Array.isArray(h) ? h : []);
      setStats(s);
      if (l && l.wasteScore > 55 && l.lightLevel > 400 && !l.motionDetected) {
        setAlert("Lights may have been on while the room looks empty — quick win if you switch them off.");
      } else setAlert(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not reach API");
    }
  }, [demoMode]);

  useEffect(() => {
    if (demoMode) {
      setLatest(nextSimulatedReading());
      setHistory(buildDemoHistory());
      setStats({
        wasteScoreAvgThisWeek: 42,
        wasteScoreAvgLastWeek: 51,
        carbonGramsThisWeek: 1200,
        carbonGramsLastWeek: 1500,
        savedCo2KgVsLastWeek: 0.3,
        streakDaysGreen: 2,
      });
      const id = setInterval(() => setLatest(nextSimulatedReading()), 3000);
      return () => clearInterval(id);
    }
    void loadApi();
    const id = setInterval(() => void loadApi(), 8000);
    return () => clearInterval(id);
  }, [demoMode, loadApi]);

  const co2dayKg = useMemo(() => {
    if (!latest) return 0;
    return Math.round((latest.carbonGramsEst / 1000) * 100) / 100;
  }, [latest]);

  const trendScore = useMemo(() => {
    if (!stats) return null;
    return Math.round((stats.wasteScoreAvgThisWeek - stats.wasteScoreAvgLastWeek) * 10) / 10;
  }, [stats]);

  const dailyAverages = useMemo(() => {
    const map = new Map<string, DailyAvg>();
    for (const h of history) {
      const d = new Date(h.recordedAt);
      if (!Number.isFinite(d.getTime())) continue;
      const temperature = toFiniteNumber(h.temperature);
      const lightLevel = toFiniteNumber(h.lightLevel);
      const soundLevel = toFiniteNumber(h.soundLevel);
      if (temperature == null || lightLevel == null || soundLevel == null) continue;
      const key = dayKey(d);
      const cur = map.get(key) ?? {
        dateKey: key,
        count: 0,
        temperature: 0,
        lightLevel: 0,
        soundLevel: 0,
        motionCount: 0,
      };
      cur.count += 1;
      cur.temperature += temperature;
      cur.lightLevel += lightLevel;
      cur.soundLevel += soundLevel;
      cur.motionCount += h.motionDetected ? 1 : 0;
      map.set(key, cur);
    }
    for (const value of map.values()) {
      value.temperature = round(value.temperature / value.count, 1);
      value.lightLevel = Math.round(value.lightLevel / value.count);
      value.soundLevel = Math.round(value.soundLevel / value.count);
      value.motionRate = Math.round((value.motionCount / value.count) * 100);
    }
    return map;
  }, [history]);

  useEffect(() => {
    if (history.length === 0) {
      setSelectedDay(null);
      return;
    }
    const latestPoint = history[history.length - 1];
    const latestDay = dayKey(new Date(latestPoint.recordedAt));
    setSelectedDay((cur) => cur ?? latestDay);
    const d = new Date(latestPoint.recordedAt);
    setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [history]);

  const selectedAvg = selectedDay ? dailyAverages.get(selectedDay) ?? null : null;
  const rangeHistory = useMemo(() => {
    if (history.length === 0) return history;
    const now = Date.now();
    const days = range === "24h" ? 1 : range === "7d" ? 7 : 30;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    const filtered = history.filter((h) => +new Date(h.recordedAt) >= cutoff);
    return filtered.length > 0 ? filtered : history;
  }, [history, range]);
  const chartHistory = useMemo(() => {
    if (!selectedDay) return rangeHistory;
    const dayFiltered = rangeHistory.filter((h) => dayKey(new Date(h.recordedAt)) === selectedDay);
    return dayFiltered.length > 0 ? dayFiltered : rangeHistory;
  }, [rangeHistory, selectedDay]);
  const goToMetricGraph = (metric: ChartMetric) => {
    setActiveMetric(metric);
    document.getElementById("dashboard-charts")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <IrisLogo />
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <Switch.Root
              checked={demoMode}
              onCheckedChange={toggleDemo}
              className="w-11 h-6 bg-zinc-700 rounded-full relative data-[state=checked]:bg-iris-green outline-none"
            >
              <Switch.Thumb className="block w-5 h-5 bg-white rounded-full translate-x-0.5 transition-transform data-[state=checked]:translate-x-5" />
            </Switch.Root>
            Demo mode
          </label>
          {!demoMode && (
            <Button type="button" className="!bg-zinc-800 !text-zinc-100 hover:!bg-zinc-700" onClick={() => void loadApi()}>
              Refresh
            </Button>
          )}
          <Link
            href="/onboarding"
            className="rounded-xl border border-iris-green/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20 transition"
          >
            Home profile
          </Link>
          <Link
            href="/settings"
            className="rounded-xl border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition"
          >
            Alerts & thresholds
          </Link>
        </div>
      </header>

      {err && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100 text-sm">
          {err} — Run <code className="text-white">cd web && npm run dev</code> or turn on Demo mode.
        </div>
      )}

      <Card className="relative overflow-hidden border-iris-green/30 bg-gradient-to-br from-emerald-950/50 via-zinc-950 to-zinc-900 shadow-xl shadow-emerald-500/10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-44 w-44 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Iris Dashboard</p>
            <CardTitle className="mt-2 text-2xl sm:text-3xl">See energy behavior in real time</CardTitle>
            <CardDescription className="mt-3 max-w-2xl text-zinc-300">
              Demo mode now includes realistic multi-day data points so the calendar and daily averages look fully
              populated without manual seeding.
            </CardDescription>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="text-sm text-zinc-400">
                {demoMode
                  ? "Disable Demo mode to hit real API endpoints."
                  : "Use sensor uploads or API seed route when you want persistent DB records."}
              </span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <Highlight label="Data points" value={String(history.length || 0)} hint="Loaded in charts" />
            <Highlight label="CO2 / day" value={latest ? `${co2dayKg} kg` : "--"} hint="Estimated footprint" />
            <Highlight label="Weekly trend" value={trendScore == null ? "--" : `${trendScore > 0 ? "+" : ""}${trendScore}`} hint="Waste score delta" />
          </div>
        </div>
      </Card>

      {alert && !demoMode && (
        <div className="rounded-2xl border border-iris-green/30 bg-emerald-500/10 px-4 py-3 text-emerald-100 text-sm">
          {alert}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950">
          <CardTitle>Energy waste score</CardTitle>
          <CardDescription>0 = efficient patterns · 100 = lots of avoidable use</CardDescription>
          <div className="mt-6 flex flex-col sm:flex-row sm:items-end gap-6">
            <p className="text-6xl font-bold text-white tabular-nums">{latest ? latest.wasteScore : "—"}</p>
            <RgbBadge wasteScore={latest?.wasteScore ?? 0} />
          </div>
        </Card>

        <Card className="border-white/10 bg-zinc-950/70">
          <CardTitle>Carbon footprint</CardTitle>
          <CardDescription>Estimated from your usage patterns & home profile</CardDescription>
          <p className="mt-4 text-3xl font-semibold text-iris-green">{latest ? `~${co2dayKg} kg` : "--"}</p>
          <p className="text-sm text-zinc-500 mt-1">CO₂ per day (rough, educational)</p>
          {stats && (
            <p className="mt-4 text-sm text-zinc-300 leading-relaxed">
              This week vs last: you may have avoided about{" "}
              <span className="text-iris-green font-medium">{stats.savedCo2KgVsLastWeek} kg</span> CO₂ if your
              score improved.
            </p>
          )}
        </Card>
      </div>

      {latest && (
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Temperature" value={`${latest.temperature}°C`} />
          <Metric label="Light" value={String(latest.lightLevel)} hint="sensor units" />
          <Metric label="Noise" value={String(latest.soundLevel)} hint="relative" />
          <Metric label="Motion" value={latest.motionDetected ? "Yes" : "No"} />
        </div>
      )}

      {latest && (
        <RoomStatusCard
          roomLabel="Living room"
          lightLevel={latest.lightLevel}
          motion={latest.motionDetected}
          wasteScore={latest.wasteScore}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-white/10 bg-zinc-950/70">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Daily metrics calendar</CardTitle>
              <CardDescription>Pick a date to filter graphs, then click a metric button to jump to it.</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
                onClick={() =>
                  setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                }
              >
                Prev
              </button>
              <p className="min-w-28 text-center text-zinc-300">
                {calendarMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}
              </p>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
                onClick={() =>
                  setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                }
              >
                Next
              </button>
            </div>
          </div>
          <CalendarGrid
            month={calendarMonth}
            selectedDay={selectedDay}
            onSelectDay={(k) => setSelectedDay(k)}
            daysWithData={new Set(dailyAverages.keys())}
          />
        </Card>

        <Card className="border-white/10 bg-zinc-950/70">
          <CardTitle>Selected day</CardTitle>
          <CardDescription>
            {selectedDay ? formatDayLabel(selectedDay) : "Choose a day in the calendar."}
          </CardDescription>
          {selectedAvg ? (
            <div className="mt-4 space-y-3 text-sm">
              <AverageLine label="Readings" value={`${selectedAvg.count}`} />
              <AverageLine label="Temperature" value={`${selectedAvg.temperature}°C`} />
              <AverageLine label="Light" value={`${selectedAvg.lightLevel}`} />
              <AverageLine label="Noise" value={`${selectedAvg.soundLevel}`} />
              <AverageLine label="Motion active" value={`${selectedAvg.motionRate}%`} />
              <div className="pt-2 grid grid-cols-2 gap-2">
                <MetricButton label="Temperature" onClick={() => goToMetricGraph("temperature")} />
                <MetricButton label="Light" onClick={() => goToMetricGraph("light")} />
                <MetricButton label="Noise" onClick={() => goToMetricGraph("noise")} />
                <MetricButton label="Motion" onClick={() => goToMetricGraph("motion")} />
              </div>
              <button
                type="button"
                className="text-xs text-zinc-400 hover:text-zinc-200 transition"
                onClick={() => setSelectedDay(null)}
              >
                Clear date filter
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              No readings for that date yet. Seed data or wait for incoming sensor points.
            </p>
          )}
        </Card>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-2 flex w-fit gap-2">
        {(["24h", "7d", "30d"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`rounded-xl px-4 py-2 text-sm transition ${
              range === r ? "bg-iris-green text-iris-dark font-medium" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <DashboardCharts history={chartHistory} range={range} activeMetric={activeMetric} demoMode={demoMode} />

      {stats && (
        <Card className="border-white/10 bg-zinc-950/70">
          <CardTitle>Gamification</CardTitle>
          <CardDescription>Lightweight nudges — opt-in leaderboard can come later</CardDescription>
          <ul className="mt-3 space-y-2 text-zinc-300 text-sm">
            <li>• Streak (green days): {stats.streakDaysGreen} days</li>
            <li>• Badge ideas: “3 days green”, “Saved 1 kg CO₂” — wire to backend when you ship Supabase</li>
          </ul>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="!py-4 border-white/10 bg-zinc-950/70">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      {hint && <p className="text-xs text-zinc-600 mt-1">{hint}</p>}
    </Card>
  );
}

function Highlight({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      <p className="text-xs text-zinc-400">{hint}</p>
    </div>
  );
}

type DailyAvg = {
  dateKey: string;
  count: number;
  temperature: number;
  lightLevel: number;
  soundLevel: number;
  motionCount: number;
  motionRate?: number;
};

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function round(n: number, precision = 1) {
  const p = 10 ** precision;
  return Math.round(n * p) / p;
}

function formatDayLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function AverageLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2">
      <span className="text-zinc-400">{label}</span>
      <span className="font-medium text-zinc-100">{value}</span>
    </div>
  );
}

function MetricButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-white/15 bg-zinc-900 px-2 py-2 text-xs text-zinc-200 hover:bg-zinc-800 transition"
    >
      {label} graph
    </button>
  );
}

function CalendarGrid({
  month,
  selectedDay,
  onSelectDay,
  daysWithData,
}: {
  month: Date;
  selectedDay: string | null;
  onSelectDay: (key: string) => void;
  daysWithData: Set<string>;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const startWeekday = firstDay.getDay();
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<{ key: string; day: number } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= totalDays; day++) {
    const key = dayKey(new Date(year, monthIndex, day));
    cells.push({ key, day });
  }

  return (
    <div className="mt-4">
      <div className="mb-2 grid grid-cols-7 gap-2 text-xs text-zinc-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <p key={d} className="px-2">
            {d}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell, idx) =>
          cell ? (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDay(cell.key)}
              className={`rounded-lg px-2 py-2 text-sm text-left border transition ${
                selectedDay === cell.key
                  ? "border-iris-green bg-emerald-500/20 text-white"
                  : daysWithData.has(cell.key)
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                    : "border-white/10 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {cell.day}
            </button>
          ) : (
            <div key={`blank-${idx}`} />
          )
        )}
      </div>
    </div>
  );
}

function buildDemoHistory(days = 30): HistoryPoint[] {
  const rows: HistoryPoint[] = [];
  const now = new Date();
  const slots = [8, 12, 18, 22];
  for (let d = days - 1; d >= 0; d--) {
    for (const hour of slots) {
      const base = nextSimulatedReading();
      const at = new Date(now);
      at.setDate(now.getDate() - d);
      at.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
      rows.push({
        ...base,
        recordedAt: at.toISOString(),
      });
    }
  }
  return rows.sort((a, b) => +new Date(a.recordedAt) - +new Date(b.recordedAt));
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
