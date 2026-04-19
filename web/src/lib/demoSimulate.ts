/** Client-side fake sensor stream when Demo Mode is on without API */

import type { LatestReading } from "./api";

let seq = 0;

export function nextSimulatedReading(): LatestReading {
  seq += 1;
  const hour = new Date().getHours();
  const temp = 19 + Math.sin(seq / 8) * 3 + (Math.random() - 0.5);
  const light = hour > 8 && hour < 21 ? 450 + Math.random() * 300 : 80;
  const motion = Math.random() > 0.4;
  const waste = Math.min(
    100,
    Math.round(
      (!motion && light > 400 ? 35 : 0) +
        (temp > 24 ? (temp - 24) * 8 : 0) +
        Math.random() * 20
    )
  );
  return {
    temperature: Math.round(temp * 10) / 10,
    lightLevel: Math.round(light),
    soundLevel: Math.round(200 + Math.random() * 500),
    motionDetected: motion,
    roomId: "living-room",
    wasteScore: waste,
    carbonGramsEst: Math.round(80 + waste * 4),
    recordedAt: new Date().toISOString(),
  };
}
