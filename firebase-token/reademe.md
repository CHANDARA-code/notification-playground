## Node.js TypeScript — Get FCM Bearer Token from Service Account

### Install dependencies

```bash
npm install google-auth-library
npm install -D @types/node typescript ts-node
```

---

### `getFcmToken.ts`

```typescript
import { GoogleAuth } from "google-auth-library";
import path from "path";

const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, "service-account.json");

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

export async function getFcmAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    scopes: [FCM_SCOPE],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();

  if (!tokenResponse.token) {
    throw new Error("Failed to retrieve access token");
  }

  return tokenResponse.token;
}

// --- Run directly ---
(async () => {
  try {
    const token = await getFcmAccessToken();
    console.log("✅ Bearer Token:\n", token);
  } catch (err) {
    console.error("❌ Error getting token:", err);
  }
})();
```

---

### `sendFcmNotification.ts` — Full usage with FCM send

```typescript
import { GoogleAuth } from "google-auth-library";
import path from "path";

const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, "service-account.json");
const PROJECT_ID = "YOUR_PROJECT_ID"; // 🔁 Replace this

const FCM_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

// ─── Get Access Token ───────────────────────────────────────────────────────

async function getFcmAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    keyFile: SERVICE_ACCOUNT_PATH,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();

  if (!tokenResponse.token) {
    throw new Error("Failed to retrieve access token");
  }

  return tokenResponse.token;
}

// ─── Send via FCM Token ──────────────────────────────────────────────────────

async function sendToDevice(deviceToken: string): Promise<void> {
  const accessToken = await getFcmAccessToken();

  const payload = {
    message: {
      token: deviceToken,
      notification: {
        title: "Hello from TS!",
        body: "Sent via FCM Token 🚀",
      },
      data: {
        key1: "value1",
        key2: "value2",
      },
      android: { priority: "high" },
      apns: {
        payload: { aps: { sound: "default" } },
      },
    },
  };

  const response = await fetch(FCM_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  console.log("📱 Send to Device Result:", result);
}

// ─── Send via Topic ──────────────────────────────────────────────────────────

async function sendToTopic(topic: string): Promise<void> {
  const accessToken = await getFcmAccessToken();

  const payload = {
    message: {
      topic: topic,
      notification: {
        title: "Topic Broadcast!",
        body: `Message sent to topic: ${topic} 📢`,
      },
      data: {
        category: "news",
        articleId: "12345",
      },
      android: { priority: "high" },
      apns: {
        payload: { aps: { sound: "default" } },
      },
    },
  };

  const response = await fetch(FCM_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  console.log("📢 Send to Topic Result:", result);
}

// ─── Main ────────────────────────────────────────────────────────────────────

(async () => {
  // Send to a specific device
  await sendToDevice("DEVICE_FCM_TOKEN_HERE");

  // Send to a topic
  await sendToTopic("news");
})();
```

---

### Run it

```bash
# Direct run with ts-node
npx ts-node sendFcmNotification.ts

# Or compile first
npx tsc && node dist/sendFcmNotification.js
```

---

### `tsconfig.json` (minimal)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "outDir": "./dist",
    "strict": true
  },
  "include": ["*.ts"]
}
```

---

### 📁 Project Structure

```
project/
├── service-account.json     ← your Firebase service account
├── getFcmToken.ts
├── sendFcmNotification.ts
├── tsconfig.json
└── package.json
```

> ⚠️ **Never commit `service-account.json` to Git.** Add it to `.gitignore` immediately.

```bash
echo "service-account.json" >> .gitignore
```

## FCM Push Notification — cURL Examples

### 1. Send via FCM Token (single device)

```bash
curl -X POST https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "token": "DEVICE_FCM_TOKEN",
      "notification": {
        "title": "Hello!",
        "body": "This is a push notification via FCM Token"
      },
      "data": {
        "key1": "value1",
        "key2": "value2"
      },
      "android": {
        "priority": "high"
      },
      "apns": {
        "payload": {
          "aps": {
            "sound": "default"
          }
        }
      }
    }
  }'
```

---

### 2. Send via Topic (broadcast to subscribers)

```bash
curl -X POST https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "topic": "news",
      "notification": {
        "title": "Breaking News",
        "body": "This is sent to all subscribers of the news topic"
      },
      "data": {
        "category": "sports",
        "articleId": "12345"
      },
      "android": {
        "priority": "high"
      },
      "apns": {
        "payload": {
          "aps": {
            "sound": "default"
          }
        }
      }
    }
  }'
```

---

### 3. Send via Condition (multiple topics)

```bash
curl -X POST https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "condition": "'\''news'\'' in topics && '\''sports'\'' in topics",
      "notification": {
        "title": "Sports News",
        "body": "Sent to users subscribed to both news AND sports"
      }
    }
  }'
```

---

### 🔑 How to Get `YOUR_ACCESS_TOKEN`

FCM v1 API uses **OAuth2**, not a server key. Generate the token with:

```bash
# Using gcloud CLI
ACCESS_TOKEN=$(gcloud auth print-access-token)

# Then use it in your curl
curl -X POST https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  ...
```

Or via a **service account JSON**:

```bash
# Install google-auth-library and generate token, or use:
ACCESS_TOKEN=$(python3 -c "
import google.auth.transport.requests
import google.oauth2.service_account

creds = google.oauth2.service_account.Credentials.from_service_account_file(
    'service-account.json',
    scopes=['https://www.googleapis.com/auth/firebase.messaging']
)
creds.refresh(google.auth.transport.requests.Request())
print(creds.token)
")
```

---

### 📋 Quick Reference

| Field        | Token                   | Topic                                          |
| ------------ | ----------------------- | ---------------------------------------------- |
| Target key   | `"token"`               | `"topic"`                                      |
| Value        | Device FCM token string | Topic name (no `/topics/` prefix needed in v1) |
| Audience     | Single device           | All topic subscribers                          |
| Multi-target | Use batch send          | Use `"condition"`                              |

> **Note:** The legacy API (`https://fcm.googleapis.com/fcm/send`) using `Authorization: key=SERVER_KEY` is **deprecated as of June 2024**. Use the v1 API shown above.
