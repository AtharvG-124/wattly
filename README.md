# Iris

Home energy awareness for everyday households: Arduino sensors → **Next.js** (UI + API routes) + **Expo mobile**. Dark UI, green accents (`#22c55e`).

## Monorepo layout

| Path | Description |
|------|-------------|
| `web/` | Next.js 14 app + **Route Handlers** under `/api/*` (sensor ingest, readings, profile, seed) |
| `mobile/` | Expo — calls the same `/api` on your dev machine or deployed URL |
| `arduino/` | `arduino_bridge.py` + `iris_sensors.ino` |
| `supabase/schema.sql` | Postgres tables + RLS starter |

Backend logic lives in `web/src/lib/iris/` (waste score, in-memory dev store, Supabase admin client). **No separate Express server.**

## Important files breakdown

### Web app (Next.js)

- `web/src/app/dashboard/page.tsx` - main dashboard route.
- `web/src/components/dashboard/DashboardClient.tsx` - dashboard state, polling, calendar filtering, demo mode.
- `web/src/components/dashboard/DashboardCharts.tsx` - interactive charts for temperature/light/noise/motion + daily waste.
- `web/src/app/api/sensor-data/route.ts` - ingest endpoint for Arduino payloads (`POST /api/sensor-data`).
- `web/src/app/api/readings/latest/route.ts` - latest reading API consumed by web/mobile.
- `web/src/app/api/readings/history/route.ts` - historical readings API for charts.
- `web/src/app/api/stats/summary/route.ts` - aggregate stats used by dashboard cards.
- `web/src/lib/iris/wasteScore.ts` - waste score + carbon estimate formulas.
- `web/src/lib/iris/memoryStore.ts` - in-memory fallback store (dev only).
- `web/src/lib/iris/supabaseAdmin.ts` - server-side Supabase client for route handlers.

### Arduino + bridge

- `arduino/sketch.ino` - richer UNO sketch emitting `DATA,...` lines for `main.py`.
- `arduino/main.py` - serial reader + parser + POST bridge for `sketch.ino`.
- `arduino/iris_sensors.ino` - minimal sensor sketch emitting `TEMP:...,LIGHT:...,SOUND:...,MOTION:...`.
- `arduino/arduino_bridge.py` - parser + POST bridge for `iris_sensors.ino`.

### Mobile app (Expo)

- `mobile/app/index.tsx` - mobile home dashboard.
- `mobile/app/auth.tsx` - auth screen.
- `mobile/src/api.ts` - shared API client used by mobile.

### Data + config

- `supabase/schema.sql` - database schema + RLS starter policies.
- `web/.env.local.example` - required server/browser env vars for web.
- `mobile/.env.example` - required env vars for mobile.

## Run locally

### One dev server

```bash
cd web
cp .env.local.example .env.local
# Fill .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IRIS_DEVICE_API_KEY, ...)
npm install
npm run dev
```

- UI: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- Dev env flags (no secrets): [http://localhost:3000/api/health/env](http://localhost:3000/api/health/env)

`NEXT_PUBLIC_API_URL` can stay **unset** so the browser uses same-origin `/api/...`. Set it only if the frontend is hosted on a different origin than the API.

### Seed mock data

```bash
curl -X POST http://localhost:3000/api/seed
```

### Mobile (Expo)

```bash
cd mobile
cp .env.example .env
# EXPO_PUBLIC_API_URL=http://localhost:3000 (simulator) or http://YOUR_LAN_IP:3000 (device)
npm install
npx expo start --clear
```

Same Supabase keys as web, with `EXPO_PUBLIC_*` prefix.

### Arduino -> API

```bash
export IRIS_API_URL=http://localhost:3000
export IRIS_API_KEY=dev-secret-change-me   # must match IRIS_DEVICE_API_KEY in web/.env.local
python3 main.py --port /dev/cu.usbmodemXXXX --baud 9600
```

JSON: `{ temperature, lightLevel, soundLevel, motionDetected, roomId?, deviceId? }` — header `x-api-key`.

### Supabase

1. Run `supabase/schema.sql`.
2. In **`web/.env.local`**: `NEXT_PUBLIC_SUPABASE_*` for the browser; **`SUPABASE_URL`** + **`SUPABASE_SERVICE_ROLE_KEY`** for Route Handlers (server only).
3. Middleware + client setup: see `web/src/lib/supabase/`.

### Production notes

- In-memory readings **do not** persist across Vercel/serverless instances — use Supabase for real deployments.
- `IRIS_DEVICE_API_KEY` protects `POST /api/sensor-data`.

### License

MIT — portfolio / demo use.
