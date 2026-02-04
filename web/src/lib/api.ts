export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export interface SendNotificationPayload {
  token: string;
  title: string;
  body: string;
  icon?: string;
  left_icon_url?: string;
  imageUrl?: string;
  data?: Record<string, string | number | boolean>;
}

export async function sendNotification(payload: SendNotificationPayload) {
  const response = await fetch(`${apiBaseUrl}/notifications/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to send notification');
  }

  return response.json();
}
