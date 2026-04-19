"""
Iris bridge for UNO Q.
Reads sensor data from sketch.ino and POSTs to Iris API.
"""

import argparse
import time
import threading
import sys
import json
import os

try:
    import requests
except ImportError:
    print("Installing requests...")
    os.system("pip install requests --break-system-packages")
    import requests

try:
    import serial
except ImportError:
    serial = None

# Optional overrides. Prefer env vars IRIS_API_URL and IRIS_API_KEY.
IRIS_BASE_URL = os.environ.get("IRIS_API_URL", "http://localhost:3000")
IRIS_API_KEY = os.environ.get("IRIS_API_KEY", "dev-secret-change-me")

DEVICE_ID = "iris-uno-q"
ROOM_ID = "living-room"
POST_INTERVAL = 5.0

API_URL = f"{IRIS_BASE_URL}/api/sensor-data"

latest = {
    "temp": None,
    "light": 0,
    "sound": 0,
    "motion": 0,
    "appliance": 0,
    "waste_score": 0,
    "reason": "",
    "fresh": False,
}
state_lock = threading.Lock()
last_sensor_seen_at = 0.0


def handle_line(line: str) -> None:
    global last_sensor_seen_at
    line = line.strip()
    if not line.startswith("DATA,"):
        if line:
            print(f"[sketch] {line}")
        return
    parts = line.split(",")
    if len(parts) < 7:
        return
    try:
        with state_lock:
            temp = float(parts[1])
            latest["temp"] = None if temp == -999 else temp
            latest["light"] = int(parts[2])
            latest["sound"] = int(parts[3])
            latest["motion"] = int(parts[4])
            latest["appliance"] = int(parts[5])
            latest["waste_score"] = int(parts[6])
            latest["reason"] = parts[7] if len(parts) > 7 else ""
            latest["fresh"] = True
            last_sensor_seen_at = time.time()
        print("[sensor]")
        print(f"  temp_f: {latest['temp']}")
        print(f"  light: {latest['light']}")
        print(f"  sound: {latest['sound']}")
        print(f"  motion: {'yes' if latest['motion'] else 'no'}")
        print(f"  appliance: {'on' if latest['appliance'] else 'off'}")
        print(f"  waste_score: {latest['waste_score']}")
        if latest["reason"]:
            print(f"  reason: {latest['reason']}")
    except (ValueError, IndexError) as e:
        print(f"[parse error] {e}")


def read_sketch_output_stdin():
    for line in sys.stdin:
        handle_line(line)


def read_sketch_output_serial(port: str, baud: int):
    if serial is None:
        print("Install pyserial first: python3 -m pip install --user pyserial")
        sys.exit(1)
    try:
        ser = serial.Serial(port, baud, timeout=2)
    except OSError as e:
        print(f"Could not open serial port {port}: {e}")
        sys.exit(2)
    print(f"[bridge] reading serial {port} @ {baud}")
    while True:
        raw = ser.readline()
        if not raw:
            continue
        line = raw.decode("utf-8", errors="replace")
        handle_line(line)


def f_to_c(temp_f: float) -> float:
    return (temp_f - 32.0) * 5.0 / 9.0


def push_to_iris():
    headers = {
        "Content-Type": "application/json",
        "x-api-key": IRIS_API_KEY,
    }
    while True:
        time.sleep(POST_INTERVAL)
        with state_lock:
            if not latest["fresh"]:
                idle_for = time.time() - last_sensor_seen_at if last_sensor_seen_at else None
                if idle_for is None or idle_for > 8:
                    print("[bridge] waiting for DATA lines from sketch...")
                continue
            payload = {
                # sketch emits Fahrenheit; backend expects Celsius
                "temperature": f_to_c(latest["temp"]) if latest["temp"] is not None else 22.2,
                "lightLevel": latest["light"],
                "soundLevel": latest["sound"],
                "motionDetected": bool(latest["motion"]),
                "deviceId": DEVICE_ID,
                "roomId": ROOM_ID,
            }
            latest["fresh"] = False
        print(f"[post] {json.dumps(payload)}")
        try:
            r = requests.post(API_URL, headers=headers, data=json.dumps(payload), timeout=5)
            if 200 <= r.status_code < 300:
                print(f"[iris OK] {r.status_code} pushed: {r.text[:120]}")
            else:
                print(f"[iris FAIL] {r.status_code}: {r.text[:100]}")
        except requests.RequestException as e:
            print(f"[iris FAIL] {e}")


def main():
    parser = argparse.ArgumentParser(description="Iris sketch.ino -> Next.js API bridge")
    parser.add_argument("--port", help="Serial port (e.g. /dev/cu.usbmodemXXXX). If omitted, read stdin.")
    parser.add_argument("--baud", type=int, default=9600)
    args = parser.parse_args()

    print("=" * 60)
    print("IRIS BRIDGE — UNO Q -> Next.js API")
    print(f"Target: {API_URL}")
    print("=" * 60)

    reader = (
        lambda: read_sketch_output_serial(args.port, args.baud)
        if args.port
        else read_sketch_output_stdin
    )
    threading.Thread(target=reader, daemon=True).start()
    threading.Thread(target=push_to_iris, daemon=True).start()

    while True:
        time.sleep(60)


if __name__ == "__main__":
    main()