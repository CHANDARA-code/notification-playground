import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { NotificationsService, SendNotificationInput } from '@notifications/notifications.service';

interface SendNotificationBody {
  token?: string;
  topic?: string;
  topics?: string[] | string;
  priority?: 'high' | 'normal';
  androidPriority?: 'high' | 'normal';
  apnsPriority?: 'high' | 'normal';
  title?: string;
  body?: string;
  icon?: string;
  iconUrl?: string;
  leftIconUrl?: string;
  left_icon_url?: string;
  imageUrl?: string;
  data?: Record<string, string | number | boolean>;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  async send(@Body() body: SendNotificationBody) {
    const leftIconUrl =
      body.leftIconUrl ?? body.left_icon_url ?? body.iconUrl ?? undefined;
    const topics = normalizeTopics(body.topics ?? body.topic);
    return this.notificationsService.send({
      ...(body as SendNotificationInput),
      leftIconUrl,
      topics,
    });
  }

  @Get('history')
  async history(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = Number(limit);
    const parsedOffset = Number(offset);
    return this.notificationsService.history(
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10,
      Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0,
    );
  }
}

function normalizeTopics(input?: string[] | string) {
  if (!input) return undefined;
  if (Array.isArray(input)) {
    return input
      .map((topic) => topic.trim())
      .filter((topic) => topic.length > 0);
  }
  return input
    .split(',')
    .map((topic) => topic.trim())
    .filter((topic) => topic.length > 0);
}
