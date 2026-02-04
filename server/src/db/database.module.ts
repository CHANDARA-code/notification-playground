import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import mysql from 'mysql2/promise';
import { Pool } from 'pg';
import Database from 'better-sqlite3';

import { loadSchema } from '@model/loader';
import { setSchema } from '@model/registry';

export const DB = Symbol('DB');

export type DrizzleDb =
  | ReturnType<typeof drizzleMysql>
  | ReturnType<typeof drizzlePg>
  | ReturnType<typeof drizzleSqlite>;

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DB,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const client = (config.get<string>('DB_CLIENT') ?? 'sqlite').toLowerCase();

        const schemaModule = loadSchema(client);
        setSchema(schemaModule);

        if (client === 'sqlite') {
          const filename = config.get<string>('DB_SQLITE_PATH') ?? './dev.db';
          const sqlite = new Database(filename);
          return drizzleSqlite(sqlite, { schema: schemaModule.schema });
        }

        if (client === 'postgres' || client === 'pgsql' || client === 'pg') {
          const pool = new Pool({
            host: config.getOrThrow<string>('PG_HOST'),
            user: config.getOrThrow<string>('PG_USER'),
            password: config.getOrThrow<string>('PG_PASSWORD'),
            database: config.getOrThrow<string>('PG_DATABASE'),
            port: Number(config.get<string>('PG_PORT') ?? 5432),
            max: Number(config.get<string>('PG_POOL') ?? 10),
          });
          return drizzlePg(pool, { schema: schemaModule.schema });
        }

        const pool = mysql.createPool({
          host: config.getOrThrow<string>('MYSQL_HOST'),
          user: config.getOrThrow<string>('MYSQL_USER'),
          password: config.getOrThrow<string>('MYSQL_PASSWORD'),
          database: config.getOrThrow<string>('MYSQL_DATABASE'),
          port: Number(config.get<string>('MYSQL_PORT') ?? 3306),
          connectionLimit: Number(config.get<string>('MYSQL_POOL') ?? 10),
        });

        return drizzleMysql(pool, { schema: schemaModule.schema, mode: 'default' });
      },
    },
  ],
  exports: [DB],
})
export class DatabaseModule {}
