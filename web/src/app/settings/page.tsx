"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Threshold UI — values are stored client-side for demo; wire to GET/PATCH /api/user-settings
 * when you add that route + Supabase table.
 */
export default function SettingsPage() {
  const [temp, setTemp] = useState(24);
  const [light, setLight] = useState(400);
  const [noise, setNoise] = useState(600);
  const [motionMins, setMotionMins] = useState(30);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center rounded-xl border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition"
      >
        Back to dashboard
      </Link>

      <Card className="relative overflow-hidden border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-emerald-950/30">
        <div className="pointer-events-none absolute -left-20 -bottom-14 h-44 w-44 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Automation</p>
          <CardTitle className="mt-2 text-3xl">Alerts & thresholds</CardTitle>
          <CardDescription className="mt-2 max-w-2xl text-zinc-300">
            Control when Wattly flags avoidable waste patterns. These values are stored locally for now and can be wired
            to `/api/settings` later.
          </CardDescription>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-white/10 bg-zinc-950/70">
          <div className="space-y-5">
            <Field
              label="High temperature (°C)"
              helper="Notify when rooms stay above this."
              value={temp}
              onChange={setTemp}
            />
            <Field
              label="Bright 'lights on' level (0-1023)"
              helper="Higher means less sensitive to light."
              value={light}
              onChange={setLight}
            />
            <Field
              label="Noise level alert"
              helper="Useful for spotting devices left running."
              value={noise}
              onChange={setNoise}
            />
            <Field
              label="Minutes lights on with no motion"
              helper="Raise alerts for likely empty-room waste."
              value={motionMins}
              onChange={setMotionMins}
            />
            <Button
              type="button"
              className="!bg-wattly-green !text-wattly-dark hover:!bg-emerald-300"
              onClick={() => {
                localStorage.setItem("wattly_thresholds", JSON.stringify({ temp, light, noise, motionMins }));
              }}
            >
              Save thresholds
            </Button>
          </div>
        </Card>

        <Card className="border-white/10 bg-zinc-950/70">
          <CardTitle className="text-lg">Current values</CardTitle>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Temperature" value={`${temp}°C`} />
            <Row label="Light level" value={`${light}`} />
            <Row label="Noise level" value={`${noise}`} />
            <Row label="No-motion window" value={`${motionMins} min`} />
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            Backend persistence: add PATCH `/api/settings` and store in Supabase `user_settings` (see `schema.sql`).
          </p>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block text-sm text-zinc-300">
      {label}
      <p className="text-xs text-zinc-500 mt-1">{helper}</p>
      <input
        type="number"
        className="mt-2 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2">
      <span className="text-zinc-400">{label}</span>
      <span className="font-medium text-zinc-100">{value}</span>
    </div>
  );
}
