# Flutter: dynamic notification icons

This sample shows **data-only** FCM pushes and uses `flutter_local_notifications` to display
notifications with a **dynamic Android small icon** chosen from a whitelist. It also ships
with a built-in **playground UI** to craft payloads and send a test push to the device. A
local history of sends is stored in `shared_preferences`.
The app also fetches **remote config** from the API to subscribe to one or more topics and
store per-platform priorities.

## 1) Firebase setup
- Add `google-services.json` and `GoogleService-Info.plist` to your app.
- Ensure Firebase is initialized in `lib/main.dart`.

## 2) Android icon resources
Android notification **small icons must be bundled** (white/transparent).
Add these drawables (names must match):

```
android/app/src/main/res/drawable/ic_notif_default.png
android/app/src/main/res/drawable/ic_notif_sale.png
android/app/src/main/res/drawable/ic_notif_chat.png
android/app/src/main/res/drawable/ic_notif_alert.png
```

Update the allowed list in `lib/notification_service.dart` if you add more.

Optional default icon for system-handled notifications:

```
<meta-data
  android:name="com.google.firebase.messaging.default_notification_icon"
  android:resource="@drawable/ic_notif_default" />
```

## 3) App registration
`NotificationService.registerDeviceToken` posts the FCM token to your NestJS API:

- Default API base URL: `http://192.168.22.35:3000`
- Override with `--dart-define=API_BASE_URL=...`

## 4) Payload fields expected by Flutter
The app expects data keys:

- `title`
- `body`
- `icon` (Android small icon name)
- `left_icon_url` (optional; large icon image URL)
- `imageUrl` (optional; shows a big picture)

Example data payload:

```
{
  "title": "Sale now live",
  "body": "Tap to view the deal",
  "icon": "ic_notif_default",
  "left_icon_url": "https://example.com/icon.png",
  "imageUrl": "https://example.com/banner.png"
}
```

## Notes
- iOS does not support changing the small icon. The code still shows a local
  notification with title/body.
- Data-only messages are used so Flutter can fully customize the notification.
- Android small icon must be bundled; this project uses `ic_notif_default` by default.

## Integration test
```
flutter test integration_test/playground_smoke_test.dart
```
