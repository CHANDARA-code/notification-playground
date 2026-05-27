import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import type { messaging } from 'firebase-admin';

import { DB, DrizzleDb } from '@db/database.module';
import { FIREBASE_MESSAGING } from '@firebase/firebase.constants';
import { getDevicesTable, getDeviceTopicsTable, getTopicsTable } from '@model/registry';

export interface TopicOutput {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
}

export interface TopicInput {
  name: string;
  description?: string | null;
}

export interface TopicSubscriptionResult {
  successCount: number;
  failureCount: number;
  errors: Array<{ index: number; reason: string }>;
}

@Injectable()
export class TopicsService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDb,
    @Inject(FIREBASE_MESSAGING) private readonly messaging: messaging.Messaging,
  ) {}

  async listTopics(): Promise<TopicOutput[]> {
    const topics = getTopicsTable();
    return this.db.select().from(topics).orderBy(topics.name) as Promise<TopicOutput[]>;
  }

  async createTopic(input: TopicInput): Promise<TopicOutput> {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('name is required');

    const topics = getTopicsTable();
    await this.db.insert(topics).values({ name, description: input.description ?? null });

    const [row] = await this.db
      .select()
      .from(topics)
      .where(eq(topics.name, name))
      .limit(1);

    return row as TopicOutput;
  }

  async updateTopic(id: number, input: Partial<TopicInput>): Promise<TopicOutput> {
    const topics = getTopicsTable();
    const set: Record<string, unknown> = {};

    if (input.name !== undefined) {
      const name = input.name?.trim();
      if (!name) throw new BadRequestException('name cannot be empty');
      set.name = name;
    }
    if (input.description !== undefined) {
      set.description = input.description;
    }

    if (Object.keys(set).length === 0) throw new BadRequestException('nothing to update');

    await this.db.update(topics).set(set).where(eq(topics.id, id));

    const [row] = await this.db.select().from(topics).where(eq(topics.id, id)).limit(1);
    if (!row) throw new NotFoundException(`Topic ${id} not found`);

    return row as TopicOutput;
  }

  async deleteTopic(id: number): Promise<{ deleted: boolean }> {
    const topics = getTopicsTable();
    const deviceTopics = getDeviceTopicsTable();

    await this.db.delete(deviceTopics).where(eq(deviceTopics.topicId, id));
    await this.db.delete(topics).where(eq(topics.id, id));

    return { deleted: true };
  }

  async getDeviceTopics(token: string): Promise<TopicOutput[]> {
    const devices = getDevicesTable();
    const deviceTopics = getDeviceTopicsTable();
    const topics = getTopicsTable();

    const [device] = await this.db
      .select({ id: devices.id })
      .from(devices)
      .where(eq(devices.token, token))
      .limit(1);

    if (!device) return [];

    const subscriptions = await this.db
      .select({ topicId: deviceTopics.topicId })
      .from(deviceTopics)
      .where(eq(deviceTopics.deviceId, device.id));

    if (subscriptions.length === 0) return [];

    const topicIds = subscriptions.map((s) => s.topicId);
    return this.db
      .select()
      .from(topics)
      .where(inArray(topics.id, topicIds)) as Promise<TopicOutput[]>;
  }

  async syncDeviceTopics(token: string, topicNames: string[]): Promise<TopicOutput[]> {
    const devices = getDevicesTable();
    const deviceTopics = getDeviceTopicsTable();
    const topics = getTopicsTable();

    const [device] = await this.db
      .select({ id: devices.id })
      .from(devices)
      .where(eq(devices.token, token))
      .limit(1);

    if (!device) throw new NotFoundException(`Device with token not found — register first`);

    const normalized = [...new Set(topicNames.map((t) => t.trim()).filter(Boolean))];

    // resolve only topics that exist in the catalog
    const catalogRows =
      normalized.length > 0
        ? await this.db.select().from(topics).where(inArray(topics.name, normalized))
        : [];

    const validIds = new Set(catalogRows.map((r: any) => r.id));

    // current subscriptions
    const current = await this.db
      .select({ topicId: deviceTopics.topicId })
      .from(deviceTopics)
      .where(eq(deviceTopics.deviceId, device.id));

    const currentIds = new Set(current.map((c) => c.topicId));

    const toAdd = catalogRows.filter((r: any) => !currentIds.has(r.id));
    const toRemoveIds = [...currentIds].filter((id) => !validIds.has(id));

    // fetch names of topics being removed before deleting (needed for Firebase unsub)
    const toRemoveRows =
      toRemoveIds.length > 0
        ? await this.db
            .select({ name: topics.name })
            .from(topics)
            .where(inArray(topics.id, toRemoveIds))
        : [];

    if (toRemoveIds.length > 0) {
      await this.db
        .delete(deviceTopics)
        .where(
          and(
            eq(deviceTopics.deviceId, device.id),
            inArray(deviceTopics.topicId, toRemoveIds),
          ),
        );
    }

    if (toAdd.length > 0) {
      await this.db.insert(deviceTopics).values(
        toAdd.map((r: any) => ({ deviceId: device.id, topicId: r.id })),
      );
    }

    // sync Firebase subscriptions (best-effort — DB is source of truth)
    const toAddNames: string[] = toAdd.map((r: any) => r.name);
    const toRemoveNames: string[] = toRemoveRows.map((r: any) => r.name);

    await Promise.allSettled([
      ...toAddNames.map((name) => this.messaging.subscribeToTopic([token], name)),
      ...toRemoveNames.map((name) => this.messaging.unsubscribeFromTopic([token], name)),
    ]);

    if (validIds.size === 0) return [];

    return this.db
      .select()
      .from(topics)
      .where(inArray(topics.id, [...validIds])) as Promise<TopicOutput[]>;
  }

  async subscribeTokensToTopic(
    topicName: string,
    tokens: string[],
  ): Promise<TopicSubscriptionResult> {
    if (tokens.length === 0) throw new BadRequestException('tokens array must not be empty');
    if (tokens.length > 1000) throw new BadRequestException('max 1000 tokens per request');

    const response = await this.messaging.subscribeToTopic(tokens, topicName);
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      errors: response.errors.map((e) => ({ index: e.index, reason: e.error.message })),
    };
  }

  async unsubscribeTokensFromTopic(
    topicName: string,
    tokens: string[],
  ): Promise<TopicSubscriptionResult> {
    if (tokens.length === 0) throw new BadRequestException('tokens array must not be empty');
    if (tokens.length > 1000) throw new BadRequestException('max 1000 tokens per request');

    const response = await this.messaging.unsubscribeFromTopic(tokens, topicName);
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      errors: response.errors.map((e) => ({ index: e.index, reason: e.error.message })),
    };
  }
}
