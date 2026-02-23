# FCM Playground Enhancement - Task Breakdown

> A comprehensive plan to enhance the Dynamic Icon Push Notification system into a full-featured FCM playground.

---

## 📊 Current State Summary

| Component | Status | Key Features |
|-----------|--------|--------------|
| **Flutter App** | ✅ Done | Dynamic icons, large icons, big picture, topic sync |
| **NestJS Server** | ✅ Done | Token/topic push, config CRUD, history logging |
| **Web Playground** | ✅ Done | Payload builder, config manager, preview |

---

## 🎯 Enhancement Roadmap

### Priority 1: High Impact Features

- [ ] 1.1 Scheduled Notifications
- [ ] 1.2 Device Management UI
- [ ] 1.3 Topic Subscription Management
- [ ] 1.4 Action Buttons Support
- [ ] 1.5 Notification History Dashboard

### Priority 2: Medium Impact Features

- [ ] 2.1 Payload Templates (Save/Load)
- [ ] 2.2 Silent Push Support
- [ ] 2.3 Dry Run / Validate Mode
- [ ] 2.4 Batch Send
- [ ] 2.5 Custom Sound & Channel ID

### Priority 3: Nice to Have Features

- [ ] 3.1 Basic Analytics Dashboard
- [ ] 3.2 WebPush Support
- [ ] 3.3 API Authentication
- [ ] 3.4 Token Validation Endpoint

### Priority 4: Security & Reliability Features

- [ ] 4.1 Stale Token Management
- [ ] 4.2 FCM Error Handling
- [ ] 4.3 End-to-End Encryption

### Priority 5: Message Configuration & Scaling Features

- [ ] 5.1 Message Lifespan (TTL)
- [ ] 5.2 Collapse Key Support
- [ ] 5.3 Multicast Sending (500 tokens)
- [ ] 5.4 Analytics Labels & Delivery Tracking
- [ ] 5.5 Server-side Throttling & Rate Limiting
- [ ] 5.6 Android Notification Channels

---

## 📋 Detailed Implementation Plans

---

## Priority 1: High Impact Features

---

### 1.1 Scheduled Notifications

**Goal**: Allow sending notifications at a future time with automatic delivery.

#### Database Schema Changes

```sql
-- Add to existing schema
CREATE TABLE scheduled_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scheduled_at INTEGER NOT NULL,           -- Unix timestamp for delivery
  ttl INTEGER DEFAULT 86400,                -- Time-to-live in seconds (default 24h)
  status TEXT DEFAULT 'pending',            -- pending | sent | failed | cancelled
  payload TEXT NOT NULL,                    -- JSON notification payload
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  executed_at INTEGER
);
CREATE INDEX scheduled_at_idx ON scheduled_notifications(scheduled_at, status);
```

#### Server Implementation

**Files to modify/create:**

| File | Action | Description |
|------|--------|-------------|
| `src/scheduler/scheduler.module.ts` | NEW | Module for scheduling functionality |
| `src/scheduler/scheduler.service.ts` | NEW | Service with cron job to process scheduled notifications |
| `src/scheduler/scheduler.controller.ts` | NEW | REST endpoints for scheduling |
| `src/db/schema/*.ts` | MODIFY | Add scheduled_notifications table |

**New Endpoints:**

```
POST   /notifications/schedule    - Create scheduled notification
GET    /notifications/scheduled   - List scheduled notifications
DELETE /notifications/scheduled/:id - Cancel scheduled notification
```

**Payload Example:**

```json
{
  "scheduledAt": "2026-02-06T10:00:00Z",
  "ttl": 3600,
  "notification": {
    "topics": ["promo"],
    "title": "Flash Sale!",
    "body": "50% off for the next hour",
    "icon": "ic_notif_sale"
  }
}
```

**Cron Job Logic:**

```typescript
@Cron('*/30 * * * * *') // Every 30 seconds
async processScheduledNotifications() {
  const due = await this.getDueNotifications();
  for (const notification of due) {
    try {
      await this.notificationsService.send(notification.payload);
      await this.markAsSent(notification.id);
    } catch (error) {
      await this.handleRetry(notification);
    }
  }
}
```

#### Web UI Changes

- Add "Schedule" tab with datetime picker
- Add "Scheduled" section to view pending notifications
- Add cancel/edit functionality for scheduled items

---

### 1.2 Device Management UI

**Goal**: View and manage all registered devices from the web playground.

#### Server Implementation

**New Endpoints:**

```
GET    /devices                - List all devices (with pagination)
GET    /devices/:id            - Get device details
DELETE /devices/:id            - Remove device
PUT    /devices/:id/tags       - Update device tags
GET    /devices/stats          - Device statistics
```

#### Database Schema Changes

```sql
-- Enhance existing devices table
ALTER TABLE devices ADD COLUMN app_version TEXT;
ALTER TABLE devices ADD COLUMN device_model TEXT;
ALTER TABLE devices ADD COLUMN os_version TEXT;
ALTER TABLE devices ADD COLUMN tags TEXT;        -- JSON array of tags
ALTER TABLE devices ADD COLUMN is_active INTEGER DEFAULT 1;
```

**Device Registration Enhanced Payload:**

```json
{
  "token": "FCM_TOKEN",
  "platform": "android",
  "appVersion": "1.0.0",
  "deviceModel": "Pixel 7",
  "osVersion": "Android 14"
}
```

#### Web UI Components

| Component | Description |
|-----------|-------------|
| `DeviceList` | Paginated table of registered devices |
| `DeviceCard` | Individual device with actions |
| `DeviceStats` | Summary cards (total, by platform, active) |
| `DeviceFilter` | Filter by platform, tags, activity |

---

### 1.3 Topic Subscription Management

**Goal**: Manage topic subscriptions directly from the server/web.

#### Server Implementation

**New Endpoints:**

```
POST   /topics/subscribe       - Subscribe token(s) to topic(s)
POST   /topics/unsubscribe     - Unsubscribe token(s) from topic(s)
GET    /topics                  - List all known topics
GET    /topics/:name/devices   - List devices subscribed to topic
GET    /devices/:id/topics     - Get topics for a device
```

#### Database Schema

```sql
CREATE TABLE device_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  topic TEXT NOT NULL,
  subscribed_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  UNIQUE(device_id, topic)
);
CREATE INDEX device_topics_topic_idx ON device_topics(topic);
```

#### Service Logic

```typescript
async subscribeToTopic(tokens: string[], topic: string) {
  // Use Firebase Admin SDK
  const response = await this.messaging.subscribeToTopic(tokens, topic);
  // Store in local DB for tracking
  await this.db.insert(deviceTopics).values(
    tokens.map(token => ({ deviceId: this.getDeviceId(token), topic }))
  );
  return response;
}
```

#### Flutter Integration

```dart
// In notification_service.dart
Future<void> subscribeToTopics(List<String> topics) async {
  for (final topic in topics) {
    await FirebaseMessaging.instance.subscribeToTopic(topic);
  }
}

Future<void> unsubscribeFromTopics(List<String> topics) async {
  for (final topic in topics) {
    await FirebaseMessaging.instance.unsubscribeFromTopic(topic);
  }
}
```

---

### 1.4 Action Buttons Support

**Goal**: Add interactive action buttons to notifications.

#### Payload Enhancement

```json
{
  "title": "New Order",
  "body": "Order #123 is ready",
  "actions": [
    {
      "id": "accept",
      "title": "Accept",
      "icon": "ic_check"
    },
    {
      "id": "reject", 
      "title": "Reject",
      "icon": "ic_close"
    }
  ]
}
```

#### Flutter Implementation

**Modify `notification_service.dart`:**

```dart
Future<void> showFromRemoteMessage(RemoteMessage message) async {
  final data = message.data;
  
  // Parse actions
  List<AndroidNotificationAction> actions = [];
  if (data['actions'] != null) {
    final actionList = jsonDecode(data['actions']) as List;
    actions = actionList.map((a) => AndroidNotificationAction(
      a['id'],
      a['title'],
      icon: DrawableResourceAndroidBitmap(a['icon'] ?? 'ic_notif_default'),
      showsUserInterface: true,
    )).toList();
  }

  final androidDetails = AndroidNotificationDetails(
    'fcm_channel',
    'FCM Notifications',
    actions: actions,
    // ... other details
  );
}
```

**Handle Action Callbacks:**

```dart
void _onNotificationAction(NotificationResponse response) {
  final actionId = response.actionId;
  final payload = response.payload;
  
  // Route based on action
  switch (actionId) {
    case 'accept':
      _handleAccept(payload);
      break;
    case 'reject':
      _handleReject(payload);
      break;
  }
}
```

#### Web UI

- Add "Actions" section in payload builder
- Dynamic form to add/remove action buttons
- Preview showing action buttons

---

### 1.5 Notification History Dashboard

**Goal**: Enhanced history view with search, filter, and analytics.

#### Server Enhancements

**Enhanced History Endpoint:**

```
GET /notifications/history?
    page=1&
    limit=50&
    status=sent|error&
    startDate=2026-01-01&
    endDate=2026-02-01&
    topic=promo&
    search=sale
```

**Statistics Endpoint:**

```
GET /notifications/stats
```

**Response:**

```json
{
  "total": 1234,
  "sent": 1200,
  "failed": 34,
  "byTopic": {
    "promo": 500,
    "news": 400,
    "all": 334
  },
  "byDay": [
    { "date": "2026-02-01", "count": 45 },
    { "date": "2026-02-02", "count": 67 }
  ]
}
```

#### Web UI Components

| Component | Description |
|-----------|-------------|
| `HistoryTable` | Paginated, sortable notification history |
| `HistoryFilters` | Date range, status, topic filters |
| `HistorySearch` | Full-text search in title/body |
| `StatsCards` | Summary metrics |
| `StatsChart` | Daily/weekly notification volume chart |

---

## Priority 2: Medium Impact Features

---

### 2.1 Payload Templates

**Goal**: Save and reuse frequently used notification payloads.

#### Database Schema

```sql
CREATE TABLE notification_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  payload TEXT NOT NULL,         -- Full JSON payload
  is_favorite INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
```

#### Endpoints

```
GET    /templates          - List all templates
POST   /templates          - Create template
PUT    /templates/:id      - Update template
DELETE /templates/:id      - Delete template
POST   /templates/:id/send - Send notification using template
```

---

### 2.2 Silent Push Support

**Goal**: Send data-only silent notifications for background updates.

#### Payload

```json
{
  "silent": true,
  "data": {
    "action": "sync_data",
    "version": "2.0"
  }
}
```

#### Server Changes

```typescript
if (input.silent) {
  message = {
    data: input.data,
    android: {
      priority: 'high',
    },
    apns: {
      payload: {
        aps: {
          'content-available': 1,
        },
      },
    },
  };
}
```

---

### 2.3 Dry Run / Validate Mode

**Goal**: Validate notification payload without actually sending.

#### Endpoint

```
POST /notifications/validate
```

**Response:**

```json
{
  "valid": true,
  "warnings": [
    "Image URL returns 404",
    "TTL is very short (< 1 hour)"
  ],
  "estimatedRecipients": 150,
  "payload": { ... }
}
```

---

### 2.4 Batch Send

**Goal**: Send to multiple tokens in a single request.

#### Endpoint

```
POST /notifications/batch
```

**Payload:**

```json
{
  "tokens": ["token1", "token2", "token3"],
  "notification": {
    "title": "Hello",
    "body": "World"
  }
}
```

#### Implementation

```typescript
async sendBatch(tokens: string[], notification: SendNotificationInput) {
  const messages = tokens.map(token => ({
    ...this.buildMessage(notification),
    token,
  }));
  
  const response = await this.messaging.sendEach(messages);
  
  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    responses: response.responses,
  };
}
```

---

### 2.5 Custom Sound & Channel ID

**Goal**: Support custom notification sounds and Android channels.

#### Payload Enhancement

```json
{
  "title": "Alert",
  "body": "Emergency notification",
  "channelId": "urgent_alerts",
  "sound": "alarm.wav"
}
```

#### Flutter Setup

```dart
// Create channels on app init
const urgentChannel = AndroidNotificationChannel(
  'urgent_alerts',
  'Urgent Alerts',
  importance: Importance.max,
  sound: RawResourceAndroidNotificationSound('alarm'),
);
await flutterLocalNotificationsPlugin
    .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
    ?.createNotificationChannel(urgentChannel);
```

---

## Priority 3: Nice to Have Features

---

### 3.1 Basic Analytics Dashboard

**Goal**: Visual analytics for notification performance.

#### Metrics to Track

- Notifications sent per day/week/month
- Success/failure rate
- Top topics by volume
- Platform distribution
- Peak sending hours

#### UI Components

- Line chart for daily volume
- Pie chart for platform split
- Bar chart for top topics
- Success rate gauge

---

### 3.2 WebPush Support

**Goal**: Add browser push notification support.

#### Requirements

- Add Web client with Service Worker
- Generate VAPID keys
- Web token registration endpoint
- Handle web-specific display

---

### 3.3 API Authentication

**Goal**: Secure playground endpoints.

#### Implementation Options

1. **API Key** - Simple header-based auth
2. **JWT** - Token-based auth with expiry
3. **Basic Auth** - Username/password

#### Recommended Approach

```typescript
// Simple API key for playground
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    return apiKey === process.env.API_KEY;
  }
}
```

---

### 3.4 Token Validation Endpoint

**Goal**: Check if an FCM token is still valid.

#### Endpoint

```
POST /tokens/validate
{
  "token": "FCM_TOKEN"
}
```

**Response:**

```json
{
  "valid": true,
  "platform": "android",
  "lastSeen": "2026-02-05T08:00:00Z"
}
```

#### Implementation

```typescript
async validateToken(token: string) {
  try {
    // Send a dry-run message to validate
    await this.messaging.send({
      token,
      data: { validate: 'true' },
    }, true); // dry-run = true
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

---

## Priority 4: Security & Reliability Features

---

### 4.1 Stale Token Management

**Goal**: Manage stale and expired FCM registration tokens following Firebase best practices.

> **Reference**: [Firebase FCM Token Management](https://firebase.google.com/docs/cloud-messaging/manage-tokens)

#### Database Schema Changes

```sql
-- Enhance existing devices table
ALTER TABLE devices ADD COLUMN key_version INTEGER DEFAULT 1;
ALTER TABLE devices ADD COLUMN public_key TEXT;
ALTER TABLE devices ADD COLUMN previous_key TEXT;
```

#### Server Implementation

**New Endpoints:**

```
POST   /devices/heartbeat        - Update device last_seen_at
POST   /devices/token-refresh    - Handle token refresh (old→new)
GET    /devices/stale            - List stale devices
DELETE /devices/stale            - Prune stale devices
```

**Stale Token Cleanup Service:**

```typescript
@Injectable()
export class TokenCleanupService {
  private readonly STALE_THRESHOLD_DAYS = 30;
  private readonly EXPIRED_THRESHOLD_DAYS = 270; // Android FCM expiry

  @Cron('0 0 * * *') // Daily at midnight
  async pruneStaleTokens() {
    const staleDate = Date.now() - (this.STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
    
    // Get stale devices
    const staleDevices = await this.db
      .select()
      .from(devices)
      .where(lt(devices.lastSeenAt, staleDate));
    
    for (const device of staleDevices) {
      // Unsubscribe from topics
      const topics = await this.getDeviceTopics(device.id);
      for (const topic of topics) {
        await this.messaging.unsubscribeFromTopic([device.token], topic);
      }
      
      // Delete device
      await this.db.delete(devices).where(eq(devices.id, device.id));
    }
    
    this.logger.log(`Pruned ${staleDevices.length} stale tokens`);
  }
}
```

**Handle Invalid Token on Send:**

```typescript
async send(input: SendNotificationInput) {
  try {
    return await this.messaging.send(message);
  } catch (error) {
    if (error.code === 'messaging/registration-token-not-registered') {
      // Token is invalid - delete from database
      await this.db.delete(devices).where(eq(devices.token, input.token));
      await this.db.delete(deviceTopics).where(eq(deviceTopics.deviceToken, input.token));
    }
    throw error;
  }
}
```

#### Flutter Implementation

```dart
// Token refresh listener
FirebaseMessaging.instance.onTokenRefresh.listen((newToken) async {
  final prefs = await SharedPreferences.getInstance();
  final oldToken = prefs.getString('fcm_token');
  
  if (oldToken != null && oldToken != newToken) {
    // Notify server of token change
    await _api.post('/devices/token-refresh', {
      'oldToken': oldToken,
      'newToken': newToken,
      'platform': Platform.operatingSystem,
    });
  }
  
  await prefs.setString('fcm_token', newToken);
});

// Heartbeat on app resume
void _onAppResumed() async {
  final token = await FirebaseMessaging.instance.getToken();
  await _api.post('/devices/heartbeat', {'token': token});
}
```

---

### 4.2 FCM Error Handling

**Goal**: Comprehensive error handling for all FCM error codes with retry logic.

> **Reference**: [FCM Error Codes](https://firebase.google.com/docs/cloud-messaging/error-codes)

#### Database Schema Changes

```sql
CREATE TABLE retry_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  payload TEXT NOT NULL,
  error_code TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  next_retry_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (notification_id) REFERENCES notifications(id)
);
CREATE INDEX retry_queue_next_retry_idx ON retry_queue(next_retry_at);
```

#### Error Classification

```typescript
enum FCMErrorType {
  RETRYABLE = 'retryable',
  PERMANENT = 'permanent',
  TOKEN_INVALID = 'token_invalid',
}

const ERROR_CLASSIFICATION: Record<string, FCMErrorType> = {
  // Retryable errors
  'messaging/server-unavailable': FCMErrorType.RETRYABLE,
  'messaging/internal-error': FCMErrorType.RETRYABLE,
  'messaging/message-rate-exceeded': FCMErrorType.RETRYABLE,
  'messaging/device-message-rate-exceeded': FCMErrorType.RETRYABLE,
  'messaging/topics-message-rate-exceeded': FCMErrorType.RETRYABLE,
  
  // Token invalid - delete token
  'messaging/registration-token-not-registered': FCMErrorType.TOKEN_INVALID,
  'messaging/invalid-registration-token': FCMErrorType.TOKEN_INVALID,
  
  // Permanent errors - don't retry
  'messaging/invalid-argument': FCMErrorType.PERMANENT,
  'messaging/invalid-recipient': FCMErrorType.PERMANENT,
  'messaging/invalid-payload': FCMErrorType.PERMANENT,
  'messaging/mismatched-credential': FCMErrorType.PERMANENT,
  'messaging/invalid-apns-credentials': FCMErrorType.PERMANENT,
};
```

#### Retry Service

```typescript
@Injectable()
export class RetryService {
  @Cron('*/30 * * * * *') // Every 30 seconds
  async processRetryQueue() {
    const dueRetries = await this.db
      .select()
      .from(retryQueue)
      .where(and(
        lte(retryQueue.nextRetryAt, Date.now()),
        lt(retryQueue.retryCount, retryQueue.maxRetries)
      ));
    
    for (const retry of dueRetries) {
      try {
        await this.messaging.send(JSON.parse(retry.payload));
        await this.db.delete(retryQueue).where(eq(retryQueue.id, retry.id));
        await this.updateNotificationStatus(retry.notificationId, 'sent');
      } catch (error) {
        const errorType = this.classifyError(error);
        
        if (errorType === FCMErrorType.RETRYABLE) {
          await this.scheduleRetry(retry);
        } else {
          await this.markAsFailed(retry, error);
        }
      }
    }
  }
  
  private calculateBackoff(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s... max 1 hour
    return Math.min(Math.pow(2, retryCount) * 1000, 3600000);
  }
}
```

#### Error Handling Matrix

| Error Code | Action | Retry |
|------------|--------|-------|
| `UNAVAILABLE` (503) | Add to retry queue with backoff | ✅ |
| `INTERNAL` (500) | Add to retry queue with backoff | ✅ |
| `QUOTA_EXCEEDED` (429) | Add to retry queue, respect Retry-After | ✅ |
| `UNREGISTERED` (404) | Delete token from database | ❌ |
| `INVALID_ARGUMENT` (400) | Log error, notify admin | ❌ |
| `SENDER_ID_MISMATCH` (403) | Mark device as invalid | ❌ |
| `THIRD_PARTY_AUTH_ERROR` | Alert admin, check APNs cert | ❌ |

---

### 4.3 End-to-End Encryption

**Goal**: Secure sensitive message data with end-to-end encryption.

> **Reference**: [Firebase E2E Encryption](https://firebase.google.com/docs/cloud-messaging/encryption)

#### Database Schema Changes

```sql
-- Enhance devices table for key storage
ALTER TABLE devices ADD COLUMN public_key TEXT;
ALTER TABLE devices ADD COLUMN key_version INTEGER DEFAULT 1;
ALTER TABLE devices ADD COLUMN key_algorithm TEXT DEFAULT 'RSA-2048';
ALTER TABLE devices ADD COLUMN previous_key TEXT;
ALTER TABLE devices ADD COLUMN key_rotated_at INTEGER;
```

#### Server Implementation

**New Endpoints:**

```
PUT    /devices/:id/key          - Update device public key
POST   /notifications/encrypted  - Send encrypted notification
```

**Crypto Service:**

```typescript
@Injectable()
export class CryptoService {
  /**
   * Encrypt payload using hybrid encryption (RSA + AES)
   */
  async encryptForDevice(devicePublicKey: string, payload: object): Promise<EncryptedPayload> {
    // 1. Generate random AES-256 key
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    // 2. Encrypt payload with AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    const payloadString = JSON.stringify(payload);
    let encrypted = cipher.update(payloadString, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    
    // 3. Encrypt AES key with device's RSA public key
    const publicKey = crypto.createPublicKey(devicePublicKey);
    const encryptedKey = crypto.publicEncrypt(
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      aesKey
    );
    
    return {
      encrypted_payload: encrypted,
      encrypted_key: encryptedKey.toString('base64'),
      iv: iv.toString('base64'),
      auth_tag: authTag.toString('base64'),
    };
  }
}
```

**Send Encrypted Notification:**

```typescript
async sendEncrypted(input: SendEncryptedNotificationInput) {
  const device = await this.getDeviceByToken(input.token);
  
  if (!device.publicKey) {
    throw new BadRequestException('Device not registered for E2E encryption');
  }
  
  const encryptedPayload = await this.cryptoService.encryptForDevice(
    device.publicKey,
    { title: input.title, body: input.body, data: input.data }
  );
  
  return this.messaging.send({
    token: input.token,
    data: {
      encrypted: 'true',
      key_version: String(device.keyVersion),
      ...encryptedPayload,
    },
  });
}
```

#### Flutter Implementation

```dart
class E2ECryptoService {
  static const _keyAlias = 'fcm_e2e_key';
  
  /// Generate RSA key pair and store in secure storage
  Future<String> generateKeyPair() async {
    final keyPair = await RSAKeyGenerator.generate(2048);
    
    // Store private key securely
    await _secureStorage.write(
      key: _keyAlias,
      value: keyPair.privateKey.toPem(),
    );
    
    // Return public key for registration
    return keyPair.publicKey.toPem();
  }
  
  /// Decrypt received notification
  Future<Map<String, dynamic>> decrypt(Map<String, String> data) async {
    final privateKeyPem = await _secureStorage.read(key: _keyAlias);
    final privateKey = RSAPrivateKey.fromPem(privateKeyPem!);
    
    // 1. Decrypt AES key with RSA private key
    final encryptedKey = base64Decode(data['encrypted_key']!);
    final aesKey = privateKey.decrypt(encryptedKey);
    
    // 2. Decrypt payload with AES
    final iv = base64Decode(data['iv']!);
    final authTag = base64Decode(data['auth_tag']!);
    final encryptedPayload = base64Decode(data['encrypted_payload']!);
    
    final decrypted = AES.decrypt(
      encryptedPayload,
      aesKey,
      iv: iv,
      authTag: authTag,
    );
    
    return jsonDecode(utf8.decode(decrypted));
  }
}
```

**Integration in Notification Service:**

```dart
Future<void> showFromRemoteMessage(RemoteMessage message) async {
  Map<String, dynamic> payload;
  
  if (message.data['encrypted'] == 'true') {
    // Decrypt the payload
    payload = await _cryptoService.decrypt(message.data);
  } else {
    payload = message.data;
  }
  
  // Display notification with decrypted content
  await _showNotification(
    title: payload['title'],
    body: payload['body'],
    data: payload['data'],
  );
}
```

#### Key Rotation

```dart
/// Rotate keys periodically (e.g., every 30 days)
Future<void> rotateKeys() async {
  final newPublicKey = await _cryptoService.generateKeyPair();
  
  await _api.put('/devices/${_deviceId}/key', {
    'publicKey': newPublicKey,
    'keyVersion': _currentKeyVersion + 1,
  });
  
  // Keep old key for 24h grace period
  Future.delayed(Duration(hours: 24), () async {
    await _secureStorage.delete(key: '${_keyAlias}_old');
  });
}
```

#### Security Considerations

| Aspect | Implementation |
|--------|----------------|
| **Key Storage** | Android Keystore / iOS Keychain via flutter_secure_storage |
| **Key Size** | RSA 2048-bit minimum, 4096-bit recommended |
| **Symmetric** | AES-256-GCM (authenticated encryption) |
| **Key Rotation** | Every 30 days or on security events |
| **Fallback** | Server-fetch pattern for devices without keys |

---

## Priority 5: Message Configuration & Scaling Features

---

### 5.1 Message Lifespan (TTL)

**Goal**: Configure how long FCM should store and attempt to deliver messages.

> **Reference**: [Message Lifespan](https://firebase.google.com/docs/cloud-messaging/customize-messages/setting-message-lifespan)

#### Input Enhancement

```typescript
interface SendNotificationInput {
  // ... existing fields
  ttl?: number;  // Time-to-live in seconds (default: 4 weeks = 2419200)
}
```

#### Server Implementation

```typescript
const baseMessage = {
  data,
  android: {
    priority: 'high',
    ttl: input.ttl ? `${input.ttl * 1000}ms` : undefined,
  },
  apns: {
    headers: {
      'apns-expiration': input.ttl 
        ? String(Math.floor(Date.now() / 1000) + input.ttl)
        : undefined,
    },
  },
  webpush: {
    headers: {
      TTL: input.ttl ? String(input.ttl) : undefined,
    },
  },
};
```

---

### 5.2 Collapse Key Support

**Goal**: Replace old pending messages with the same key to prevent notification spam.

#### Input Enhancement

```typescript
interface SendNotificationInput {
  // ... existing fields
  collapseKey?: string;  // Messages with same key replace each other
}
```

#### Server Implementation

```typescript
const baseMessage = {
  data,
  android: {
    collapseKey: input.collapseKey,
  },
  apns: {
    headers: {
      'apns-collapse-id': input.collapseKey,
    },
  },
  webpush: {
    headers: {
      Topic: input.collapseKey,
    },
  },
};
```

---

### 5.3 Multicast Sending (500 tokens)

**Goal**: Send the same message to up to 500 tokens in one API call.

#### New Endpoint

```
POST /notifications/multicast
```

**Payload:**

```json
{
  "tokens": ["token1", "token2", ..., "token500"],
  "title": "Hello",
  "body": "World"
}
```

#### Service Implementation

```typescript
async sendMulticast(tokens: string[], notification: SendNotificationInput) {
  // Chunk into batches of 500
  const chunks = this.chunkArray(tokens, 500);
  const results = [];
  
  for (const chunk of chunks) {
    const message = {
      tokens: chunk,
      data: this.buildDataPayload(notification),
      android: { priority: 'high' },
    };
    
    const response = await this.messaging.sendEachForMulticast(message);
    results.push(response);
    
    // Handle failed tokens
    response.responses.forEach((res, idx) => {
      if (!res.success && res.error?.code === 'messaging/registration-token-not-registered') {
        this.deleteToken(chunk[idx]);
      }
    });
  }
  
  return this.aggregateResults(results);
}
```

---

### 5.4 Analytics Labels & Delivery Tracking

**Goal**: Tag messages for tracking in Firebase Console.

#### Input Enhancement

```typescript
interface SendNotificationInput {
  // ... existing fields
  analyticsLabel?: string;  // Tag for Firebase Console reports
}
```

#### Server Implementation

```typescript
const message = {
  data,
  fcmOptions: {
    analyticsLabel: input.analyticsLabel,
  },
  android: {
    fcmOptions: {
      analyticsLabel: input.analyticsLabel,
    },
  },
  apns: {
    fcmOptions: {
      analyticsLabel: input.analyticsLabel,
    },
  },
};
```

---

### 5.5 Server-side Throttling & Rate Limiting

**Goal**: Prevent FCM rate limiting by controlling message send rate.

#### Implementation

```typescript
import { RateLimiterMemory } from 'rate-limiter-flexible';

@Injectable()
export class ThrottledNotificationsService {
  private rateLimiter = new RateLimiterMemory({
    points: 1000, // Max requests
    duration: 60, // Per 60 seconds
  });

  async send(input: SendNotificationInput) {
    try {
      await this.rateLimiter.consume('fcm-sends', 1);
      return this.notificationsService.send(input);
    } catch (rateLimitError) {
      throw new TooManyRequestsException('Rate limit exceeded. Retry after 60s');
    }
  }
}
```

#### Exponential Backoff with Jitter

```typescript
calculateBackoff(attempt: number): number {
  const baseDelay = Math.min(Math.pow(2, attempt) * 1000, 3600000);
  const jitter = Math.random() * baseDelay * 0.5;
  return baseDelay + jitter;
}
```

---

### 5.6 Android Notification Channels

**Goal**: Support Android notification channels for categorized notifications.

#### Input Enhancement

```typescript
interface SendNotificationInput {
  // ... existing fields
  channelId?: string;  // Android notification channel ID
  sound?: string;      // Custom sound file name
}
```

#### Server Implementation

```typescript
const message = {
  data: {
    ...data,
    channelId: input.channelId,
    sound: input.sound,
  },
  android: {
    notification: {
      channelId: input.channelId,
      sound: input.sound,
    },
  },
  apns: {
    payload: {
      aps: {
        sound: input.sound ? `${input.sound}.caf` : 'default',
      },
    },
  },
};
```

#### Flutter Channel Setup

```dart
// In notification_service.dart init()
const channels = [
  AndroidNotificationChannel('default', 'General', importance: Importance.defaultImportance),
  AndroidNotificationChannel('urgent_alerts', 'Urgent Alerts', importance: Importance.max, sound: RawResourceAndroidNotificationSound('alarm')),
  AndroidNotificationChannel('promo', 'Promotions', importance: Importance.low),
  AndroidNotificationChannel('silent', 'Silent', importance: Importance.min, playSound: false),
];

for (final channel in channels) {
  await flutterLocalNotificationsPlugin
    .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
    ?.createNotificationChannel(channel);
}
```

---

## 🗂️ File Structure After Implementation

```
server/
├── src/
│   ├── devices/
│   │   ├── devices.controller.ts      # Enhanced with list, stats
│   │   └── devices.service.ts         # Enhanced with CRUD
│   ├── notifications/
│   │   ├── notifications.controller.ts # Enhanced with batch, validate
│   │   └── notifications.service.ts   # Enhanced with scheduling
│   ├── scheduler/                      # NEW
│   │   ├── scheduler.module.ts
│   │   ├── scheduler.service.ts
│   │   └── scheduler.controller.ts
│   ├── topics/                         # NEW
│   │   ├── topics.module.ts
│   │   ├── topics.service.ts
│   │   └── topics.controller.ts
│   ├── templates/                      # NEW
│   │   ├── templates.module.ts
│   │   ├── templates.service.ts
│   │   └── templates.controller.ts
│   └── db/
│       └── schema/
│           ├── scheduled.ts            # NEW
│           ├── device-topics.ts        # NEW
│           └── templates.ts            # NEW

web/src/
├── components/
│   ├── DeviceManager/                  # NEW
│   ├── ScheduleForm/                   # NEW
│   ├── HistoryDashboard/               # NEW
│   ├── TopicManager/                   # NEW
│   ├── TemplateManager/                # NEW
│   └── ActionButtonEditor/             # NEW
└── pages/
    ├── Dashboard.tsx                   # NEW - Analytics
    ├── Devices.tsx                     # NEW
    ├── History.tsx                     # NEW
    └── Templates.tsx                   # NEW

flutter_dynamic_notifications/lib/
├── services/
│   ├── notification_service.dart       # Enhanced
│   ├── topic_service.dart              # NEW
│   └── e2e_crypto_service.dart         # NEW - E2E Encryption
└── models/
    └── notification_action.dart        # NEW
```

---

## 📅 Suggested Implementation Timeline

| Week | Features |
|------|----------|
| Week 1 | 1.5 History Dashboard, 1.2 Device Management |
| Week 2 | 1.3 Topic Management, 2.1 Templates |
| Week 3 | 1.1 Scheduled Notifications |
| Week 4 | 1.4 Action Buttons, 2.2 Silent Push |
| Week 5 | 2.3 Dry Run, 2.4 Batch Send |
| Week 6 | 2.5 Sound/Channel, 3.4 Token Validation |
| Week 7 | 4.1 Stale Token Management, 4.2 FCM Error Handling |
| Week 8 | 4.3 End-to-End Encryption |
| Week 9 | 5.1 TTL, 5.2 Collapse Key, 5.3 Multicast |
| Week 10 | 5.4 Analytics Labels, 5.5 Throttling, 5.6 Channels |
| Week 11+ | Analytics Dashboard, WebPush, API Auth |

---

## 🚦 Getting Started

To begin implementation, pick a feature from Priority 1 and:

1. Create the database migration
2. Implement the service layer
3. Add REST endpoints
4. Build the web UI component
5. Update Flutter client if needed
6. Write tests

---

> 💡 **Tip**: Start with **1.5 History Dashboard** as it's mostly UI work and provides immediate value for debugging other features.
