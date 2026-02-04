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
  createdAt: timestamp('created_at', { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export const schema = { devices, notifications };
