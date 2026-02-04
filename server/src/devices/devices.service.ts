import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB, DrizzleDb } from '@db/database.module';
import { getDevicesTable } from '@model/registry';

export interface RegisterDeviceInput {
  token: string;
  platform?: string;
}

@Injectable()
export class DevicesService {
  constructor(@Inject(DB) private readonly db: DrizzleDb) {}

  async register(input: RegisterDeviceInput) {
    const now = new Date();
    const platform = input.platform?.trim() || 'unknown';
    const devices = getDevicesTable();

    const client = (process.env.DB_CLIENT ?? 'sqlite').toLowerCase();
    const insert = this.db.insert(devices).values({
      token: input.token,
      platform,
      lastSeenAt: now,
    });

    if (client === 'mysql') {
      await insert.onDuplicateKeyUpdate({
        set: {
          platform,
          lastSeenAt: now,
        },
      });
    } else {
      await insert.onConflictDoUpdate({
        target: devices.token,
        set: {
          platform,
          lastSeenAt: now,
        },
      });
    }

    const [record] = await this.db
      .select()
      .from(devices)
      .where(eq(devices.token, input.token))
      .limit(1);

    return record;
  }
}
