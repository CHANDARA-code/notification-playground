const ENV_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

const STORAGE_KEY = 'apiBaseUrl';

export function getApiBaseUrl(): string {
  return localStorage.getItem(STORAGE_KEY) || ENV_BASE_URL;
}

export function setApiBaseUrl(url: string): void {
  const trimmed = url.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function resetApiBaseUrl(): void {
  localStorage.removeItem(STORAGE_KEY);
}


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
  const response = await fetch(`${getApiBaseUrl()}/notifications/send`, {
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
  const response = await fetch(`${getApiBaseUrl()}/config`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to load config');
  }
  return response.json() as Promise<AppConfig>;
}

export async function updateConfig(payload: AppConfig) {
  const response = await fetch(`${getApiBaseUrl()}/config`, {
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
  const response = await fetch(`${getApiBaseUrl()}/configs`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to load configs');
  }
  return response.json() as Promise<AppConfig[]>;
}

export async function createConfig(payload: AppConfig) {
  const response = await fetch(`${getApiBaseUrl()}/configs`, {
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
  const response = await fetch(`${getApiBaseUrl()}/configs/${id}`, {
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
  const response = await fetch(`${getApiBaseUrl()}/configs/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to delete config');
  }
  return response.json() as Promise<{ deleted: boolean }>;
}

export async function activateConfig(id: number) {
  const response = await fetch(`${getApiBaseUrl()}/configs/${id}/activate`, {
    method: 'POST',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to activate config');
  }
  return response.json() as Promise<AppConfig>;
}

export interface Topic {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

export async function listTopics(): Promise<Topic[]> {
  const response = await fetch(`${getApiBaseUrl()}/topics`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to load topics');
  }
  return response.json() as Promise<Topic[]>;
}

export async function createTopic(payload: {
  name: string;
  description?: string | null;
}): Promise<Topic> {
  const response = await fetch(`${getApiBaseUrl()}/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to create topic');
  }
  return response.json() as Promise<Topic>;
}

export async function deleteTopic(id: number): Promise<{ deleted: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/topics/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to delete topic');
  }
  return response.json() as Promise<{ deleted: boolean }>;
}

export interface TopicSubscriptionResult {
  successCount: number;
  failureCount: number;
  errors: Array<{ index: number; reason: string }>;
}

export async function subscribeTokensToTopic(
  topicName: string,
  tokens: string[],
): Promise<TopicSubscriptionResult> {
  const response = await fetch(`${getApiBaseUrl()}/topics/${encodeURIComponent(topicName)}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokens }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to subscribe tokens to topic');
  }
  return response.json() as Promise<TopicSubscriptionResult>;
}

export interface NotificationHistoryItem {
  id: number;
  token: string;
  topic: string | null;
  topics: string | null;
  title: string;
  body: string;
  icon: string | null;
  iconUrl: string | null;
  leftIconUrl: string | null;
  imageUrl: string | null;
  data: string | null;
  status: string;
  priority: string;
  androidPriority: string;
  apnsPriority: string;
  messageId: string | null;
  error: string | null;
  createdAt: string;
}

export interface NotificationHistoryResponse {
  items: NotificationHistoryItem[];
  total: number;
}

export async function getNotificationHistory(
  page = 1,
  pageSize = 10,
): Promise<NotificationHistoryResponse> {
  const offset = (page - 1) * pageSize;
  const response = await fetch(
    `${getApiBaseUrl()}/notifications/history?limit=${pageSize}&offset=${offset}`,
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to load notification history');
  }
  return response.json() as Promise<NotificationHistoryResponse>;
}

export async function unsubscribeTokensFromTopic(
  topicName: string,
  tokens: string[],
): Promise<TopicSubscriptionResult> {
  const response = await fetch(
    `${getApiBaseUrl()}/topics/${encodeURIComponent(topicName)}/unsubscribe`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens }),
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to unsubscribe tokens from topic');
  }
  return response.json() as Promise<TopicSubscriptionResult>;
}
