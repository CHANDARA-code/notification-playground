import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { desc } from 'drizzle-orm';
import type { messaging } from 'firebase-admin';

import { DB, DrizzleDb } from '@db/database.module';
import { FIREBASE_MESSAGING } from '@firebase/firebase.constants';
import { getNotificationsTable } from '@model/registry';

export interface SendNotificationInput {
  token: string;
  title: string;
  body: string;
  icon?: string;
  iconUrl?: string;
  leftIconUrl?: string;
  imageUrl?: string;
  data?: Record<string, string | number | boolean>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DB)
    private readonly db: DrizzleDb,
    @Inject(FIREBASE_MESSAGING)
    private readonly messaging: messaging.Messaging,
  ) {}

  async send(input: SendNotificationInput) {
    if (!input.token || !input.title || !input.body) {
      throw new BadRequestException('token, title, and body are required');
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

    const message: messaging.Message = {
      token: input.token,
      data,
      android: {
        priority: 'high',
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            'content-available': 1,
          },
        },
      },
    };

    const notifications = getNotificationsTable();

    try {
      const messageId = await this.messaging.send(message);
      await this.db.insert(notifications).values({
        token: input.token,
        title: input.title,
        body: input.body,
        icon: input.icon,
        iconUrl: input.iconUrl,
        leftIconUrl: leftIconUrl ?? null,
        imageUrl: input.imageUrl,
        data: input.data ? JSON.stringify(input.data) : null,
        status: 'sent',
        messageId,
      });
      return { messageId };
    } catch (error) {
      await this.db.insert(notifications).values({
        token: input.token,
        title: input.title,
        body: input.body,
        icon: input.icon,
        iconUrl: input.iconUrl,
        leftIconUrl: leftIconUrl ?? null,
        imageUrl: input.imageUrl,
        data: input.data ? JSON.stringify(input.data) : null,
        status: 'error',
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
