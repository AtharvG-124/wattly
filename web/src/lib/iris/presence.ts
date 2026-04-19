const lastMotionAt = new Map<string, number>();

export function minutesSinceMotion(deviceId: string, roomId: string, motion: boolean): number {
  const key = `${deviceId}:${roomId}`;
  const now = Date.now();
  if (motion) {
    lastMotionAt.set(key, now);
    return 0;
  }
  const prev = lastMotionAt.get(key) ?? now;
  return (now - prev) / 60000;
}
