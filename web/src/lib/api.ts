export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export interface SendNotificationPayload {
  token?: string;
  topic?: string;
  topics?: string[];
  priority?: 'high' | 'normal';
  androidPriority?: 'high' | 'normal';
  apnsPriority?: 'high' | 'normal';
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

export interface AppConfig {
  id?: number;
  name?: string;
  topic?: string | null;
  topics?: string[] | null;
  priority?: 'high' | 'normal';
  androidPriority?: 'high' | 'normal';
  apnsPriority?: 'high' | 'normal';
  isActive?: number;
}

export async function getConfig() {
  const response = await fetch(`${apiBaseUrl}/config`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to load config');
  }
  return response.json() as Promise<AppConfig>;
}

export async function updateConfig(payload: AppConfig) {
  const response = await fetch(`${apiBaseUrl}/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to update config');
  }
  return response.json() as Promise<AppConfig>;
}

export async function listConfigs() {
  const response = await fetch(`${apiBaseUrl}/configs`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to load configs');
  }
  return response.json() as Promise<AppConfig[]>;
}

export async function createConfig(payload: AppConfig) {
  const response = await fetch(`${apiBaseUrl}/configs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to create config');
  }
  return response.json() as Promise<AppConfig>;
}

export async function updateConfigById(id: number, payload: AppConfig) {
  const response = await fetch(`${apiBaseUrl}/configs/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to update config');
  }
  return response.json() as Promise<AppConfig>;
}

export async function deleteConfig(id: number) {
  const response = await fetch(`${apiBaseUrl}/configs/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to delete config');
  }
  return response.json() as Promise<{ deleted: boolean }>;
}

export async function activateConfig(id: number) {
  const response = await fetch(`${apiBaseUrl}/configs/${id}/activate`, {
    method: 'POST',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to activate config');
  }
  return response.json() as Promise<AppConfig>;
}
