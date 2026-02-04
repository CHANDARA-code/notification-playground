# NestJS + Drizzle (SQLite) + Firebase Admin

Endpoints:
- `POST /devices/register`
- `POST /notifications/send`
- `GET /notifications/history`
- `GET /config` (active config)
- `PUT /config` (update active config)
- `GET /configs`
- `POST /configs`
- `PUT /configs/:id`
- `DELETE /configs/:id`
- `POST /configs/:id/activate`
- Swagger UI: `GET /docs`

## Environment variables
```
PORT=3000

# Database adapter
# DB_CLIENT=mysql | postgres | sqlite
DB_CLIENT=sqlite

# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=app_db
MYSQL_POOL=10

# Postgres
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_password
PG_DATABASE=app_db
PG_POOL=10

# SQLite
DB_SQLITE_PATH=./dev.db

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account.json
```

## Migrations (Drizzle Kit)
```
yarn db:generate
yarn db:push
```

## SQL (SQLite)
```
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'unknown',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  last_seen_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS devices_token_idx ON devices(token);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  topic TEXT,
  topics TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  icon_url TEXT,
  left_icon_url TEXT,
  image_url TEXT,
  data TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  priority TEXT NOT NULL DEFAULT 'high',
  android_priority TEXT NOT NULL DEFAULT 'high',
  apns_priority TEXT NOT NULL DEFAULT 'high',
  message_id TEXT,
  error TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS push_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  topic TEXT,
  priority TEXT NOT NULL DEFAULT 'high',
  topics TEXT,
  android_priority TEXT NOT NULL DEFAULT 'high',
  apns_priority TEXT NOT NULL DEFAULT 'high',
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
```

## Request payloads
### Register device
```
POST /devices/register
{
  "token": "FCM_TOKEN",
  "platform": "android"
}
```

### Send notification
```
POST /notifications/send
{
  "topics": ["ahaha", "test", "all"],
  "androidPriority": "high",
  "apnsPriority": "normal",
  "title": "Sale now live",
  "body": "Tap to view the deal",
  "icon": "ic_notif_default",
  "left_icon_url": "https://example.com/icon.png",
  "imageUrl": "https://example.com/banner.png",
  "data": {
    "screen": "promo"
  }
}
```

### Update config
```
PUT /config
{
  "topics": ["ahaha", "test", "all"],
  "androidPriority": "high",
  "apnsPriority": "normal"
}
```

### Create config
```
POST /configs
{
  "name": "Promo",
  "topics": ["ahaha", "test", "all"],
  "androidPriority": "high",
  "apnsPriority": "normal"
}
```

## Notes
- `icon` must match a bundled Android drawable in the Flutter app.
- `left_icon_url` is used for the large icon (downloaded by Flutter at display time).
- The server sends **data-only** messages so Flutter can render dynamic icons.
- `topics` accepts a list or a comma-separated string. Special topics like `ios`,
  `android`, and `all` can be used for targeting.
