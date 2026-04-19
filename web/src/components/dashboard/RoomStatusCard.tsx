"use client";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  roomLabel: string;
  lightLevel: number;
  motion: boolean;
  wasteScore: number;
};

export function RoomStatusCard({ roomLabel, lightLevel, motion, wasteScore }: Props) {
  const lightsOn = lightLevel > 400;
  const suspicious = lightsOn && !motion;
  const copy = suspicious
    ? `${roomLabel} — lights may be on with no one detected. Worth a quick check.`
    : motion
      ? `${roomLabel} — activity detected. Lights look ${lightsOn ? "on" : "dim"}.`
      : `${roomLabel} — quiet right now. Lights look ${lightsOn ? "on" : "dim"}.`;

  return (
    <Card
      className={cn(
        "border-l-4",
        suspicious ? "border-l-amber-400" : wasteScore < 40 ? "border-l-emerald-500" : "border-l-zinc-600"
      )}
    >
      <CardTitle>Room status</CardTitle>
      <CardDescription className="text-zinc-300 mt-2 !text-[15px] leading-relaxed">{copy}</CardDescription>
    </Card>
  );
}
