import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { desc } from 'drizzle-orm';
import type { messaging } from 'firebase-admin';

import { DB, DrizzleDb } from '@db/database.module';
import { AppConfigService, PushPriority } from '@config/config.service';
import { FIREBASE_MESSAGING } from '@firebase/firebase.constants';
import { getNotificationsTable } from '@model/registry';

export interface SendNotificationInput {
  token?: string;
  topic?: string;
  topics?: string[];
  title: string;
  body: string;
  icon?: string;
  iconUrl?: string;
  leftIconUrl?: string;
  imageUrl?: string;
  priority?: PushPriority;
  androidPriority?: PushPriority;
  apnsPriority?: PushPriority;
  data?: Record<string, string | number | boolean>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DB)
    private readonly db: DrizzleDb,
    @Inject(FIREBASE_MESSAGING)
    private readonly messaging: messaging.Messaging,
    private readonly appConfig: AppConfigService,
  ) {}

  async send(input: SendNotificationInput) {
    if (!input.title || !input.body) {
      throw new BadRequestException('title and body are required');
    }

    const config = await this.appConfig.getActiveConfig();
    const resolvedTopics = normalizeTopics(
      input.token
        ? input.topics ?? (input.topic ? [input.topic] : undefined)
        : input.topics ??
            (input.topic ? [input.topic] : undefined) ??
            config.topics ??
            (config.topic ? [config.topic] : undefined),
    );
    const resolvedAndroidPriority = (input.androidPriority ??
      input.priority ??
      config.androidPriority ??
      config.priority ??
      'high') as PushPriority;
    const resolvedApnsPriority = (input.apnsPriority ??
      input.priority ??
      config.apnsPriority ??
      config.priority ??
      resolvedAndroidPriority) as PushPriority;

    if (!input.token && resolvedTopics.length === 0) {
      throw new BadRequestException('token or topic is required');
    }

    const data: Record<string, string> = {
      title: input.title,
      body: input.body,
    };

    if (input.icon) data.icon = input.icon;
    const leftIconUrl = input.leftIconUrl ?? input.iconUrl;
    if (leftIconUrl) data.left_icon_url = leftIconUrl;
    if (input.imageUrl) data.imageUrl = input.imageUrl;

    if (input.data) {
      for (const [key, value] of Object.entries(input.data)) {
        data[key] = String(value);
      }
    }

    const baseMessage = {
      data,
      android: {
        priority: resolvedAndroidPriority,
      },
      apns: {
        headers: {
          'apns-priority': resolvedApnsPriority === 'high' ? '10' : '5',
        },
        payload: {
          aps: {
            'content-available': 1,
          },
        },
      },
    };

    let message: messaging.Message;
    if (input.token) {
      message = { ...baseMessage, token: input.token };
    } else if (resolvedTopics.length === 1) {
      message = { ...baseMessage, topic: resolvedTopics[0] };
    } else if (resolvedTopics.length > 1) {
      message = { ...baseMessage, condition: buildCondition(resolvedTopics) };
    } else {
      throw new BadRequestException('token or topic is required');
    }

    const notifications = getNotificationsTable();

    try {
      const messageId = await this.messaging.send(message);
      await this.db.insert(notifications).values({
        token: input.token ?? '',
        topic: resolvedTopics.length === 1 ? resolvedTopics[0] : null,
        topics: resolvedTopics.length ? JSON.stringify(resolvedTopics) : null,
        title: input.title,
        body: input.body,
        icon: input.icon,
        iconUrl: input.iconUrl,
        leftIconUrl: leftIconUrl ?? null,
        imageUrl: input.imageUrl,
        data: input.data ? JSON.stringify(input.data) : null,
        status: 'sent',
        priority: resolvedAndroidPriority,
        androidPriority: resolvedAndroidPriority,
        apnsPriority: resolvedApnsPriority,
        messageId,
      });
      return { messageId };
    } catch (error) {
      await this.db.insert(notifications).values({
        token: input.token ?? '',
        topic: resolvedTopics.length === 1 ? resolvedTopics[0] : null,
        topics: resolvedTopics.length ? JSON.stringify(resolvedTopics) : null,
        title: input.title,
        body: input.body,
        icon: input.icon,
        iconUrl: input.iconUrl,
        leftIconUrl: leftIconUrl ?? null,
        imageUrl: input.imageUrl,
        data: input.data ? JSON.stringify(input.data) : null,
        status: 'error',
        priority: resolvedAndroidPriority,
        androidPriority: resolvedAndroidPriority,
        apnsPriority: resolvedApnsPriority,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async history(limit = 50) {
    const notifications = getNotificationsTable();
    const safeLimit = Math.max(1, Math.min(200, limit));

    return this.db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(safeLimit);
  }
}

function normalizeTopics(topics?: string[] | null): string[] {
  if (!topics || topics.length === 0) return [];
  return Array.from(
    new Set(
      topics
        .map((topic) => topic.trim())
        .filter((topic) => topic.length > 0),
    ),
  );
}

function buildCondition(topics: string[]) {
  return topics.map((topic) => `'${topic}' in topics`).join(' || ');
}
