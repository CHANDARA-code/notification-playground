import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { DB, DrizzleDb } from '@db/database.module';
import { getPushConfigsTable } from '@model/registry';

export type PushPriority = 'high' | 'normal';

export interface PushConfigInput {
  name: string;
  topics?: string[] | null;
  androidPriority?: PushPriority;
  apnsPriority?: PushPriority;
}

export interface PushConfigUpdateInput {
  name?: string;
  topics?: string[] | null;
  androidPriority?: PushPriority;
  apnsPriority?: PushPriority;
}

export interface PushConfigOutput {
  id: number;
  name: string;
  topic: string | null;
  priority: PushPriority;
  topics: string[];
  androidPriority: PushPriority;
  apnsPriority: PushPriority;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AppConfigService {
  constructor(@Inject(DB) private readonly db: DrizzleDb) {}

  async listConfigs(): Promise<PushConfigOutput[]> {
    const table = getPushConfigsTable();
    const rows = await this.db
      .select()
      .from(table)
      .orderBy(desc(table.updatedAt));
    return rows.map((row) => normalizeConfig(row));
  }

  async getActiveConfig(): Promise<PushConfigOutput> {
    const table = getPushConfigsTable();
    const [row] = await this.db
      .select()
      .from(table)
      .where(eq(table.isActive, 1))
      .orderBy(desc(table.updatedAt))
      .limit(1);

    if (row) return normalizeConfig(row);

    return this.createConfig(
      {
        name: 'Default',
        topics: null,
        androidPriority: 'high',
        apnsPriority: 'high',
      },
      true,
    );
  }

  async createConfig(
    input: PushConfigInput,
    activate = false,
  ): Promise<PushConfigOutput> {
    const table = getPushConfigsTable();
    const now = new Date();
    const topics = normalizeTopics(input.topics);
    const topicsValue = topics.length > 0 ? JSON.stringify(topics) : null;
    const primaryTopic = topics.length > 0 ? topics[0] : null;
    const androidPriority = input.androidPriority ?? 'high';
    const apnsPriority = input.apnsPriority ?? androidPriority;

    await this.db.insert(table).values({
      name: input.name,
      topic: primaryTopic,
      priority: androidPriority,
      topics: topicsValue,
      androidPriority,
      apnsPriority,
      isActive: activate ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    });

    const [row] = await this.db
      .select()
      .from(table)
      .orderBy(desc(table.id))
      .limit(1);

    if (activate && row) {
      await this.setActive(row.id);
      return this.getActiveConfig();
    }

    return row ? normalizeConfig(row) : this.getActiveConfig();
  }

  async updateConfig(
    id: number,
    input: PushConfigUpdateInput,
  ): Promise<PushConfigOutput | undefined> {
    const table = getPushConfigsTable();
    const now = new Date();

    const updateData: Record<string, unknown> = {
      updatedAt: now,
    };

    if (input.name !== undefined) updateData.name = input.name;

    if (input.topics !== undefined) {
      const topics = normalizeTopics(input.topics);
      updateData.topics = topics.length ? JSON.stringify(topics) : null;
      updateData.topic = topics.length ? topics[0] : null;
    }

    if (input.androidPriority !== undefined) {
      updateData.androidPriority = input.androidPriority;
      updateData.priority = input.androidPriority;
    }

    if (input.apnsPriority !== undefined) {
      updateData.apnsPriority = input.apnsPriority;
    }

    await this.db.update(table).set(updateData).where(eq(table.id, id));

    const [row] = await this.db
      .select()
      .from(table)
      .where(eq(table.id, id))
      .limit(1);

    return row ? normalizeConfig(row) : undefined;
  }

  async deleteConfig(id: number) {
    const table = getPushConfigsTable();
    const active = await this.getActiveConfig();

    await this.db.delete(table).where(eq(table.id, id));

    if (active && active.id === id) {
      const [fallback] = await this.db
        .select()
        .from(table)
        .orderBy(desc(table.updatedAt))
        .limit(1);

      if (fallback) {
        await this.setActive(fallback.id);
      } else {
        await this.createConfig(
          {
            name: 'Default',
            topics: null,
            androidPriority: 'high',
            apnsPriority: 'high',
          },
          true,
        );
      }
    }

    return { deleted: true };
  }

  async setActive(id: number) {
    const table = getPushConfigsTable();
    const now = new Date();

    await this.db.update(table).set({ isActive: 0 });
    await this.db
      .update(table)
      .set({ isActive: 1, updatedAt: now })
      .where(eq(table.id, id));

    return this.getActiveConfig();
  }

  async updateActiveConfig(input: PushConfigUpdateInput) {
    const active = await this.getActiveConfig();
    if (!active) {
      return this.createConfig(
        {
          name: input.name ?? 'Default',
          topics: input.topics ?? null,
          androidPriority: input.androidPriority ?? 'high',
          apnsPriority: input.apnsPriority ?? 'high',
        },
        true,
      );
    }

    return this.updateConfig(active.id, {
      name: input.name ?? active.name,
      topics: input.topics ?? active.topics,
      androidPriority: input.androidPriority ?? active.androidPriority,
      apnsPriority: input.apnsPriority ?? active.apnsPriority,
    });
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

function parseTopics(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return normalizeTopics(parsed.map((item) => String(item)));
    }
  } catch {
    // ignore JSON parse errors
  }
  return normalizeTopics(raw.split(',').map((item) => item.trim()));
}

function normalizeConfig(row: Record<string, unknown>): PushConfigOutput {
  const topics =
    typeof row.topics === 'string'
      ? parseTopics(row.topics)
      : parseTopics(typeof row.topic === 'string' ? row.topic : null);

  const androidPriority = (row.androidPriority ?? row.priority ?? 'high') as PushPriority;
  const apnsPriority = (row.apnsPriority ?? row.priority ?? androidPriority) as PushPriority;

  return {
    ...(row as PushConfigOutput),
    topic: (row.topic as string | null) ?? (topics[0] ?? null),
    priority: (row.priority as PushPriority) ?? androidPriority,
    topics,
    androidPriority,
    apnsPriority,
  };
}
