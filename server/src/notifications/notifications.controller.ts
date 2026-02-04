import { Body, Controller, Post } from '@nestjs/common';

import { NotificationsService, SendNotificationInput } from '@notifications/notifications.service';

interface SendNotificationBody {
  token?: string;
  title?: string;
  body?: string;
  icon?: string;
  imageUrl?: string;
  data?: Record<string, string | number | boolean>;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  async send(@Body() body: SendNotificationBody) {
    return this.notificationsService.send(body as SendNotificationInput);
  }
}
