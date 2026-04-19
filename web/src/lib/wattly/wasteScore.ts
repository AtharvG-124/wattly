/**
 * Energy Waste Score (0–100): higher = more wasteful patterns detected.
 */

export type WasteInputs = {
  temperatureC: number;
  lightLevel: number;
  soundLevel: number;
  motionDetected: boolean;
  minutesLightOnWithoutMotion: number;
  settings: {
    tempThresholdHighC: number;
    lightThreshold: number;
    noiseThreshold: number;
    motionAbsenceAlertMins: number;
  };
};

export function computeWasteScore(i: WasteInputs): number {
  const { settings: s } = i;
  let score = 0;

  const lightsOn = i.lightLevel >= s.lightThreshold;
  if (lightsOn && !i.motionDetected) {
    const over = Math.max(0, i.minutesLightOnWithoutMotion - 5);
    score += Math.min(45, 15 + over * 1.2);
  }

  if (i.temperatureC > s.tempThresholdHighC) {
    score += Math.min(25, (i.temperatureC - s.tempThresholdHighC) * 3);
  }

  if (lightsOn && i.motionDetected && i.lightLevel > s.lightThreshold + 150) {
    score += 10;
  }

  if (i.soundLevel > s.noiseThreshold && !i.motionDetected) {
    score += Math.min(15, (i.soundLevel - s.noiseThreshold) / 40);
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

export function estimateCarbonGramsPerDay(params: {
  wasteScore: number;
  homeSizeSqft: number;
  monthlyBillUsd: number;
  gridCarbonGPerKwh: number;
}): number {
  const { wasteScore, homeSizeSqft, monthlyBillUsd, gridCarbonGPerKwh } = params;
  const pricePerKwh = 0.15;
  const kwhMonth = Math.max(50, monthlyBillUsd / pricePerKwh);
  const kwhDay = kwhMonth / 30;
  const wasteFraction = wasteScore / 100;
  const avoidableKwhDay = kwhDay * 0.35 * wasteFraction * Math.min(1.5, homeSizeSqft / 2000);
  return Math.round(avoidableKwhDay * gridCarbonGPerKwh);
}
