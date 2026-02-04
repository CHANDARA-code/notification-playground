import { BadRequestException, Body, Controller, Post } from '@nestjs/common';

import { DevicesService } from '@devices/devices.service';

interface RegisterDeviceBody {
  token?: string;
  platform?: string;
}

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  async register(@Body() body: RegisterDeviceBody) {
    if (!body?.token || typeof body.token !== 'string') {
      throw new BadRequestException('token is required');
    }

    return this.devicesService.register({
      token: body.token,
      platform: body.platform,
    });
  }
}
