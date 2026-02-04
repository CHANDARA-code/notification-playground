import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { NotificationsService, SendNotificationInput } from '@notifications/notifications.service';

interface SendNotificationBody {
  token?: string;
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
    return this.notificationsService.send({
      ...(body as SendNotificationInput),
      leftIconUrl,
    });
  }

  @Get('history')
  async history(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : undefined;
    return this.notificationsService.history(
      Number.isFinite(parsed) ? (parsed as number) : 50,
    );
  }
}
