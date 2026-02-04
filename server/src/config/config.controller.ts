import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';

import { AppConfigService, PushConfigInput, PushConfigUpdateInput, PushPriority } from '@config/config.service';

interface ConfigBody {
  name?: string;
  topic?: string | null;
  topics?: string[] | string | null;
  priority?: PushPriority;
  androidPriority?: PushPriority;
  apnsPriority?: PushPriority;
}

@Controller()
export class ConfigController {
  constructor(private readonly configService: AppConfigService) {}

  @Get('config')
  async getConfig() {
    return this.configService.getActiveConfig();
  }

  @Put('config')
  async update(@Body() body: ConfigBody) {
    return this.configService.updateActiveConfig(toConfigInput(body));
  }

  @Get('configs')
  async list() {
    return this.configService.listConfigs();
  }

  @Post('configs')
  async create(@Body() body: ConfigBody) {
    return this.configService.createConfig(toConfigInput(body, true), false);
  }

  @Put('configs/:id')
  async updateConfig(@Param('id') id: string, @Body() body: ConfigBody) {
    return this.configService.updateConfig(Number(id), toConfigInput(body));
  }

  @Delete('configs/:id')
  async remove(@Param('id') id: string) {
    return this.configService.deleteConfig(Number(id));
  }

  @Post('configs/:id/activate')
  async activate(@Param('id') id: string) {
    return this.configService.setActive(Number(id));
  }
}

function toConfigInput(body: ConfigBody, includeName = false) {
  const androidPriority = body.androidPriority ?? body.priority;
  const apnsPriority = body.apnsPriority ?? body.priority;

  const input: PushConfigUpdateInput & Partial<PushConfigInput> = {
    androidPriority,
    apnsPriority,
  };

  if (body.topics !== undefined || body.topic !== undefined) {
    input.topics = normalizeTopicsInput(body.topics ?? body.topic ?? null);
  }

  if (includeName || body.name !== undefined) {
    input.name = body.name ?? 'Untitled';
  }

  return input;
}

function normalizeTopicsInput(value: string[] | string | null): string[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return null;
}
