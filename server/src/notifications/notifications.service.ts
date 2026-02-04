import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { messaging } from 'firebase-admin';

import { FIREBASE_MESSAGING } from '@firebase/firebase.constants';

export interface SendNotificationInput {
  token: string;
  title: string;
  body: string;
  icon?: string;
  imageUrl?: string;
  data?: Record<string, string | number | boolean>;
}

@Injectable()
export class NotificationsService {
  constructor(
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

    const messageId = await this.messaging.send(message);
    return { messageId };
  }
}
