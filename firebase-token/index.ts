import { GoogleAuth } from "google-auth-library";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
