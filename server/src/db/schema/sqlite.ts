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
  title: text('title').notNull(),
  body: text('body').notNull(),
  icon: text('icon'),
  iconUrl: text('icon_url'),
  leftIconUrl: text('left_icon_url'),
  imageUrl: text('image_url'),
  data: text('data'),
  status: text('status').notNull().default('sent'),
  messageId: text('message_id'),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .defaultNow(),
});

export const schema = { devices, notifications };
