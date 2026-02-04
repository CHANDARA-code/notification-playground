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

export const schema = { devices };
