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

export const schema = { devices };
