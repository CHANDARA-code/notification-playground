# NestJS + Drizzle (SQLite) + Firebase Admin

Endpoints:
- `POST /devices/register`
- `POST /notifications/send`
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

## SQL (SQLite)
```
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'unknown',
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS devices_token_idx ON devices(token);
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
  "token": "FCM_TOKEN",
  "title": "Sale now live",
  "body": "Tap to view the deal",
  "icon": "ic_notif_sale",
  "imageUrl": "https://example.com/banner.png",
  "data": {
    "screen": "promo"
  }
}
```

## Notes
- `icon` must match a bundled Android drawable in the Flutter app.
- The server sends **data-only** messages so Flutter can render dynamic icons.
