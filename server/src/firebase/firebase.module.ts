import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import admin from 'firebase-admin';
import fs from 'fs';

import { FIREBASE_MESSAGING } from '@firebase/firebase.constants';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: FIREBASE_MESSAGING,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const path = config.getOrThrow<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
        const json = JSON.parse(fs.readFileSync(path, 'utf8'));

        const app = admin.apps.length
          ? admin.app()
          : admin.initializeApp({
              credential: admin.credential.cert(json),
            });

        return app.messaging();
      },
    },
  ],
  exports: [FIREBASE_MESSAGING],
})
export class FirebaseModule {}
