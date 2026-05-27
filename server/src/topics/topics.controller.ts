import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';

import { TopicsService } from '@topics/topics.service';

interface TopicBody {
  name?: string;
  description?: string | null;
}

interface SyncBody {
  topics?: string[] | string | null;
}

interface TokensBody {
  tokens?: string[] | string | null;
}

@Controller()
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  // ── Topic catalog (admin) ───────────────────────────────────────────────

  @Get('topics')
  listTopics() {
    return this.topicsService.listTopics();
  }

  @Post('topics')
  createTopic(@Body() body: TopicBody) {
    if (!body?.name) throw new BadRequestException('name is required');
    return this.topicsService.createTopic({ name: body.name, description: body.description });
  }

  @Put('topics/:id')
  updateTopic(@Param('id') id: string, @Body() body: TopicBody) {
    return this.topicsService.updateTopic(Number(id), {
      name: body.name,
      description: body.description,
    });
  }

  @Delete('topics/:id')
  deleteTopic(@Param('id') id: string) {
    return this.topicsService.deleteTopic(Number(id));
  }

  // ── Firebase Admin bulk subscribe / unsubscribe ─────────────────────────

  @Post('topics/:name/subscribe')
  subscribeTokensToTopic(@Param('name') name: string, @Body() body: TokensBody) {
    const tokens = normalizeTokensInput(body?.tokens);
    if (tokens.length === 0) throw new BadRequestException('tokens are required');
    return this.topicsService.subscribeTokensToTopic(name, tokens);
  }

  @Post('topics/:name/unsubscribe')
  unsubscribeTokensFromTopic(@Param('name') name: string, @Body() body: TokensBody) {
    const tokens = normalizeTokensInput(body?.tokens);
    if (tokens.length === 0) throw new BadRequestException('tokens are required');
    return this.topicsService.unsubscribeTokensFromTopic(name, tokens);
  }

  // ── Per-device subscriptions ────────────────────────────────────────────

  @Get('devices/:token/topics')
  getDeviceTopics(@Param('token') token: string) {
    return this.topicsService.getDeviceTopics(token);
  }

  @Post('devices/:token/topics/sync')
  syncDeviceTopics(@Param('token') token: string, @Body() body: SyncBody) {
    const topics = normalizeTopicsInput(body?.topics);
    return this.topicsService.syncDeviceTopics(token, topics);
  }
}

function normalizeTopicsInput(value: string[] | string | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((t) => t.trim()).filter(Boolean);
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function normalizeTokensInput(value: string[] | string | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((t) => t.trim()).filter(Boolean);
  return value
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);
}
