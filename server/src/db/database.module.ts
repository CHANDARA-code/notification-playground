import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

import { loadSchema } from '@model/loader';
import { setSchema } from '@model/registry';

export const DB = Symbol('DB');

export type DrizzleDb = ReturnType<typeof drizzleSqlite>;

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DB,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const schemaModule = loadSchema('sqlite');
        setSchema(schemaModule);

        const filename = config.get<string>('DB_SQLITE_PATH') ?? './dev.db';
        const sqlite = new Database(filename);
        return drizzleSqlite(sqlite, { schema: schemaModule.schema });
      },
    },
  ],
  exports: [DB],
})
export class DatabaseModule {}
