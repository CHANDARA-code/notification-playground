import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const devices = sqliteTable(
  'devices',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    token: text('token').notNull(),
    platform: text('platform').notNull().default('unknown'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .defaultNow(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex('devices_token_idx').on(table.token),
  }),
);

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').notNull(),
  topic: text('topic'),
  topics: text('topics'),
  title: text('title').notNull(),
  body: text('body').notNull(),
  icon: text('icon'),
  iconUrl: text('icon_url'),
  leftIconUrl: text('left_icon_url'),
  imageUrl: text('image_url'),
  data: text('data'),
  status: text('status').notNull().default('sent'),
  priority: text('priority').notNull().default('high'),
  androidPriority: text('android_priority').notNull().default('high'),
  apnsPriority: text('apns_priority').notNull().default('high'),
  messageId: text('message_id'),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .defaultNow(),
});

export const pushConfigs = sqliteTable('push_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  topic: text('topic'),
  priority: text('priority').notNull().default('high'),
  topics: text('topics'),
  androidPriority: text('android_priority').notNull().default('high'),
  apnsPriority: text('apns_priority').notNull().default('high'),
  isActive: integer('is_active').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .defaultNow(),
});

export const schema = { devices, notifications, pushConfigs };
