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

export const schema = { devices };
