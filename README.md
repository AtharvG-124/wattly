# Wattly

Home energy awareness for everyday households: Arduino sensors → **Next.js** (UI + API routes) + **Expo mobile**. Dark UI, green accents (`#22c55e`).

## Monorepo layout

| Path | Description |
|------|-------------|
| `web/` | Next.js 14 app + **Route Handlers** under `/api/*` (sensor ingest, readings, profile, seed) |
| `mobile/` | Expo — calls the same `/api` on your dev machine or deployed URL |
| `arduino/` | `arduino_bridge.py` + `wattly_sensors.ino` |
| `supabase/schema.sql` | Postgres tables + RLS starter |

Backend logic lives in `web/src/lib/wattly/` (waste score, in-memory dev store, Supabase admin client). **No separate Express server.**

### One dev server

```bash
cd web
cp .env.local.example .env.local
# Copy any secrets from old api/.env into .env.local (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WATTLY_DEVICE_API_KEY, …)
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

### Arduino → API

```bash
export WATTLY_API_URL=http://localhost:3000
export WATTLY_API_KEY=dev-secret-change-me   # must match WATTLY_DEVICE_API_KEY in web/.env.local
python arduino_bridge.py --port /dev/tty.usbmodem1101
```

JSON: `{ temperature, lightLevel, soundLevel, motionDetected, roomId?, deviceId? }` — header `x-api-key`.

### Supabase

1. Run `supabase/schema.sql`.
2. In **`web/.env.local`**: `NEXT_PUBLIC_SUPABASE_*` for the browser; **`SUPABASE_URL`** + **`SUPABASE_SERVICE_ROLE_KEY`** for Route Handlers (server only).
3. Middleware + client setup: see `web/src/lib/supabase/`.

### Production notes

- In-memory readings **do not** persist across Vercel/serverless instances — use Supabase for real deployments.
- `WATTLY_DEVICE_API_KEY` protects `POST /api/sensor-data`.

### License

MIT — portfolio / demo use.
