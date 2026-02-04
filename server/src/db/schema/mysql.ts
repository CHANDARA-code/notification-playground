import {
  datetime,
  int,
  mysqlTable,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

export const devices = mysqlTable(
  'devices',
  {
    id: int('id').primaryKey().autoincrement(),
    token: varchar('token', { length: 255 }).notNull(),
    platform: varchar('platform', { length: 32 })
      .notNull()
      .default('unknown'),
    createdAt: datetime('created_at', { mode: 'date' })
      .notNull()
      .defaultNow(),
    lastSeenAt: datetime('last_seen_at', { mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex('devices_token_idx').on(table.token),
  }),
);

export const notifications = mysqlTable('notifications', {
  id: int('id').primaryKey().autoincrement(),
  token: varchar('token', { length: 255 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  body: varchar('body', { length: 500 }).notNull(),
  icon: varchar('icon', { length: 100 }),
  iconUrl: varchar('icon_url', { length: 500 }),
  leftIconUrl: varchar('left_icon_url', { length: 500 }),
  imageUrl: varchar('image_url', { length: 500 }),
  data: varchar('data', { length: 2000 }),
  status: varchar('status', { length: 20 }).notNull().default('sent'),
  messageId: varchar('message_id', { length: 255 }),
  error: varchar('error', { length: 500 }),
  createdAt: datetime('created_at', { mode: 'date' })
    .notNull()
    .defaultNow(),
});

export const schema = { devices, notifications };
