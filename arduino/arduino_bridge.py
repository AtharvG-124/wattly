#!/usr/bin/env python3
"""
Iris Arduino USB serial bridge
Reads lines from Arduino in the format:
  TEMP:23.4,LIGHT:512,SOUND:1,MOTION:0
and POSTs JSON to the Iris API (local or deployed).

Usage:
  pip install pyserial requests
  export IRIS_API_URL=http://localhost:3000
  export IRIS_API_KEY=dev-secret-change-me
  python arduino_bridge.py --port /dev/tty.usbmodem1101
"""


from __future__ import annotations

import argparse
from typing import Any, Dict, Optional
import json
import re
import sys
import time

try:
    import requests
except ImportError:
    requests = None  # type: ignore

try:
    import serial
except ImportError:
    serial = None  # type: ignore

LINE_RE = re.compile(
    r"TEMP:(?P<temp>[-\d.]+),LIGHT:(?P<light>\d+),SOUND:(?P<sound>\d+),MOTION:(?P<motion>[01])",
    re.I,
)


def parse_line(line: str) -> Optional[Dict[str, Any]]:
    line = line.strip()
    m = LINE_RE.search(line)
    if not m:
        return None
    return {
        "temperature": float(m.group("temp")),
        "lightLevel": int(m.group("light")),
        "soundLevel": int(m.group("sound")),
        "motionDetected": m.group("motion") == "1",
    }

def print_fields(payload: Dict[str, Any]) -> None:
    print("[sensor]")
    print(f"  temp: {payload['temperature']} C")
    print(f"  light: {payload['lightLevel']}")
    print(f"  sound: {payload['soundLevel']}")
    print(f"  motion: {'yes' if payload['motionDetected'] else 'no'}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Iris serial -> HTTP bridge")
    parser.add_argument("--port", required=True, help="Serial port, e.g. /dev/tty.usbmodem1101 or COM3")
    parser.add_argument("--baud", type=int, default=9600)
    parser.add_argument(
        "--api-url",
        default=None,
        help="Override IRIS_API_URL (default http://localhost:3000 - Next.js dev server)",
    )
    parser.add_argument("--device-id", default="iris-demo-device")
    parser.add_argument("--room-id", default="living-room")
    parser.add_argument("--interval", type=float, default=5.0, help="Min seconds between POSTs")
    args = parser.parse_args()

    if serial is None:
        print("Install pyserial: pip install pyserial", file=sys.stderr)
        sys.exit(1)
    if requests is None:
        print("Install requests: pip install requests", file=sys.stderr)
        sys.exit(1)

    import os

    base = (args.api_url or os.environ.get("IRIS_API_URL") or os.environ.get("WATTLY_API_URL") or "http://localhost:3000").rstrip("/")
    api_key = os.environ.get("IRIS_API_KEY", os.environ.get("WATTLY_API_KEY", "dev-secret-change-me"))

    url = f"{base}/api/sensor-data"
    headers = {"Content-Type": "application/json", "x-api-key": api_key}

    print(f"Opening {args.port} @ {args.baud} baud → POST {url}")

    try:
        ser = serial.Serial(args.port, args.baud, timeout=2)
    except OSError as e:
        print(f"Could not open serial: {e}", file=sys.stderr)
        sys.exit(2)

    last_post = 0.0
    try:
        while True:
            raw = ser.readline()
            if not raw:
                continue
            text = raw.decode("utf-8", errors="replace")
            payload = parse_line(text)
            if not payload:
                print(f"[skip] {text.strip()}")
                continue
            print_fields(payload)
            payload["deviceId"] = args.device_id
            payload["roomId"] = args.room_id
            now = time.time()
            if now - last_post < args.interval:
                continue
            last_post = now
            try:
                r = requests.post(url, headers=headers, data=json.dumps(payload), timeout=10)
                print(f"[{r.status_code}] waste OK: {r.text[:120]}")
            except requests.RequestException as e:
                print(f"[error] POST failed: {e}", file=sys.stderr)
    except KeyboardInterrupt:
        print("Stopped.")
    finally:
        ser.close()


if __name__ == "__main__":
    main()
