export type SensorPayload = {
  temperature: number;
  lightLevel: number;
  soundLevel: number;
  motionDetected: boolean;
  roomId?: string;
  timestamp?: string;
  deviceId?: string;
};
