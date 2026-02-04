# Web playground (React + Tailwind)

## Setup
```
cd web
npm install
```

## Run
```
npm run dev
```

Set API base URL:
```
VITE_API_BASE_URL=http://localhost:3000
```

## Tests
UI-driven component tests:
```
npm test
```

E2E:
```
npm run build
npm run e2e
```

## Remote config
The left panel lets admins create, update, activate, and delete config profiles
(`GET /configs`). Each profile can store multiple topics (comma separated) and
per-platform priority (Android/iOS). Flutter fetches `GET /config` on startup to
subscribe to the active topics.
