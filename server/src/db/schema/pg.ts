import {
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const devices = pgTable(
  'devices',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    token: varchar('token', { length: 255 }).notNull(),
    platform: varchar('platform', { length: 32 })
      .notNull()
      .default('unknown'),
    createdAt: timestamp('created_at', { withTimezone: false })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex('devices_token_idx').on(table.token),
  }),
);

export const notifications = pgTable('notifications', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  token: varchar('token', { length: 255 }).notNull(),
  topic: varchar('topic', { length: 200 }),
  topics: varchar('topics', { length: 2000 }),
  title: varchar('title', { length: 200 }).notNull(),
  body: varchar('body', { length: 500 }).notNull(),
  icon: varchar('icon', { length: 100 }),
  iconUrl: varchar('icon_url', { length: 500 }),
  leftIconUrl: varchar('left_icon_url', { length: 500 }),
  imageUrl: varchar('image_url', { length: 500 }),
  data: varchar('data', { length: 2000 }),
  status: varchar('status', { length: 20 }).notNull().default('sent'),
  priority: varchar('priority', { length: 20 }).notNull().default('high'),
  androidPriority: varchar('android_priority', { length: 20 })
    .notNull()
    .default('high'),
  apnsPriority: varchar('apns_priority', { length: 20 })
    .notNull()
    .default('high'),
  messageId: varchar('message_id', { length: 255 }),
  error: varchar('error', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const pushConfigs = pgTable('push_configs', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 120 }).notNull(),
  topic: varchar('topic', { length: 200 }),
  priority: varchar('priority', { length: 20 }).notNull().default('high'),
  topics: varchar('topics', { length: 2000 }),
  androidPriority: varchar('android_priority', { length: 20 })
    .notNull()
    .default('high'),
  apnsPriority: varchar('apns_priority', { length: 20 })
    .notNull()
    .default('high'),
  isActive: integer('is_active').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const topics = pgTable(
  'topics',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: varchar('name', { length: 120 }).notNull(),
    description: varchar('description', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    nameIdx: uniqueIndex('topics_name_idx').on(table.name),
  }),
);

export const deviceTopics = pgTable(
  'device_topics',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    deviceId: integer('device_id').notNull(),
    topicId: integer('topic_id').notNull(),
    subscribedAt: timestamp('subscribed_at', { withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    deviceTopicIdx: uniqueIndex('device_topics_device_topic_idx').on(
      table.deviceId,
      table.topicId,
    ),
  }),
);

export const schema = { devices, notifications, pushConfigs, topics, deviceTopics };
