Summary of current project state (save this for next session)

Repo layout
- Root: `/Users/chandara-dgc/Documents/self-learn/flutter_app_notification`
- Apps:
  - `web/` (Vite + React + TS + Tailwind admin playground)
  - `flutter_dynamic_notifications/` (Flutter app)
  - `server/` (NestJS + Drizzle + SQLite + Firebase Admin)

Key behavior
- Push flow: Web playground → NestJS API → Firebase Admin → Flutter client.
- Server sends data-only messages; Flutter renders notifications with local notifications.
- Dynamic large icon uses `left_icon_url` from payload (downloaded and displayed).
- Small icon uses bundled drawables (`ic_notif_default`, etc).

Multi-topic + per-platform priorities (latest)
- Configs now support:
  - `topics` array (e.g., `["ahaha","test","ios","android","all"]`) OR comma string.
  - `androidPriority` and `apnsPriority` separately.
- If multiple topics are active, server sends FCM `condition` (OR of topics).
- Flutter subscribes to topics from active config; filters platform-specific topics:
  - `android` subscribes only on Android
  - `ios` subscribes only on iOS
  - `all` applies to both
- Per-platform priorities are stored locally in shared_preferences.

API endpoints
- `/devices/register` POST
- `/notifications/send` POST
- `/notifications/history` GET
- `/config` GET (active)
- `/config` PUT (update active)
- `/configs` GET/POST
- `/configs/:id` PUT/DELETE
- `/configs/:id/activate` POST
- Swagger at `/docs`

Database (SQLite)
- `push_configs` table (active configs) now includes:
  - `topics`, `android_priority`, `apns_priority` (plus legacy `topic`, `priority`)
- `notifications` table now includes:
  - `topics`, `android_priority`, `apns_priority`
- Run `yarn db:push` after schema changes.

Web UI
- Left panel width 70% / right preview 30%.
- Config manager supports CRUD + activate.
- Config form now supports:
  - Topics (comma-separated)
  - Android priority
  - iOS priority
- Payload includes `left_icon_url`.
- Default left icon URL set to:
  `https://static.vecteezy.com/system/resources/thumbnails/048/942/306/small/dog-face-cartoon-icon-vector.jpg`

Flutter
- `NotificationService`:
  - Handles data messages, downloads large icon and optional big picture.
  - `sendTestPush` now sends `androidPriority` + `apnsPriority`.
  - `syncRemoteConfig` fetches active config; subscribes to topics; stores priorities.
- Playground:
  - Default left icon URL prefilled (same as web).
  - Priority dropdowns (Android/iOS) added.
  - Token load/copy supported.
  - Local history stored in shared_preferences.

Known environment notes
- Server start may require elevated permission for port binding (`0.0.0.0:3000`) in this sandbox.
- Drizzle kit had patched export compatibility; `yarn db:push` works now.
- `dev.db` is committed.

Recent commits
- `a77c7f9` Support multi-topic config and mobile priorities
- `b40fd0a` Wire config module and update docs
- `5e93932` Update dev sqlite database

Files recently changed (high value)
- `server/src/config/config.service.ts`
- `server/src/config/config.controller.ts`
- `server/src/notifications/notifications.service.ts`
- `server/src/notifications/notifications.controller.ts`
- `server/src/db/schema/sqlite.ts` (+ mysql/pg)
- `web/src/App.tsx`
- `web/src/lib/api.ts`
- `flutter_dynamic_notifications/lib/notification_service.dart`
- `flutter_dynamic_notifications/lib/playground_screen.dart`
- README files updated for new config format

Pending considerations
- If you want per-topic priority mappings (e.g., `test` high, `ios` normal), that’s not yet implemented.
- Schema update requires `yarn db:push` whenever you change config fields.

How to resume next time
- If you need to run API: `cd server && yarn start:dev` (may need elevated permission).
- If you need schema: `cd server && yarn db:push`.
- Flutter: `cd flutter_dynamic_notifications && fvm flutter run`.
- Web: `cd web && yarn dev`.
