# Dynamic icon push notifications (Web + Flutter + NestJS)

This repo contains:
- `web/`: React + Tailwind playground to craft payloads and send pushes.
- `flutter_dynamic_notifications/`: Flutter client that shows notifications with a dynamic Android icon.
- `server/`: NestJS backend using Drizzle + Firebase Admin to register tokens and send FCM data messages.

## Quick curl
```
curl -X POST http://localhost:3000/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

For setup details, see `flutter_dynamic_notifications/README.md` and `server/README.md`.

Web playground docs live in `web/README.md`.
