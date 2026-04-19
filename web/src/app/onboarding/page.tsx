"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { patchProfile } from "@/lib/api";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const [sqft, setSqft] = useState(1800);
  const [rooms, setRooms] = useState(4);
  const [country, setCountry] = useState("US");
  const [bill, setBill] = useState(140);
  const [grid, setGrid] = useState(386);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await patchProfile({
        home_size_sqft: sqft,
        num_rooms: rooms,
        country,
        monthly_bill_usd: bill,
        grid_carbon_g_per_kwh: grid,
      });
      setMsg("Saved. Your footprint estimates will use these numbers.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center rounded-xl border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition"
      >
        Back to dashboard
      </Link>
      <Card className="relative overflow-hidden border-iris-green/30 bg-gradient-to-br from-emerald-950/50 via-zinc-950 to-zinc-900">
        <div className="pointer-events-none absolute -right-16 -top-10 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Personalization</p>
          <CardTitle className="mt-2 text-3xl">Home profile</CardTitle>
          <CardDescription className="mt-2 max-w-2xl text-zinc-300">
            These values tune your carbon estimate so recommendations fit your home. You can update them any time.
          </CardDescription>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-white/10 bg-zinc-950/70">
          <form onSubmit={save} className="space-y-5">
            <InputField
              label="Home size (sq ft)"
              value={sqft}
              onChange={(n) => setSqft(n)}
              type="number"
            />
            <InputField
              label="Number of rooms"
              value={rooms}
              onChange={(n) => setRooms(n)}
              type="number"
            />
            <TextField label="Country / region" value={country} onChange={setCountry} />
            <InputField
              label="Monthly electricity bill (USD, rough)"
              value={bill}
              onChange={(n) => setBill(n)}
              type="number"
            />
            <InputField
              label="Grid carbon intensity (g CO2 per kWh)"
              value={grid}
              onChange={(n) => setGrid(n)}
              type="number"
            />
            {msg && <p className="text-sm text-emerald-300 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">{msg}</p>}
            <Button type="submit" className="!bg-iris-green !text-iris-dark hover:!bg-emerald-300">
              Save profile
            </Button>
          </form>
        </Card>

        <Card className="border-white/10 bg-zinc-950/70">
          <CardTitle className="text-lg">Why this matters</CardTitle>
          <ul className="mt-4 space-y-3 text-sm text-zinc-300">
            <li>• More accurate CO2 and waste estimates.</li>
            <li>• Better day-to-day comparisons in charts.</li>
            <li>• Smarter thresholds based on your home size.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  type: "number";
}) {
  return (
    <label className="block text-sm text-zinc-300">
      {label}
      <input
        type={type}
        className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm text-zinc-300">
      {label}
      <input
        className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
