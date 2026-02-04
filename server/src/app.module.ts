import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '@db/database.module';
import { DevicesController } from '@devices/devices.controller';
import { DevicesService } from '@devices/devices.service';
import { FirebaseModule } from '@firebase/firebase.module';
import { NotificationsController } from '@notifications/notifications.controller';
import { NotificationsService } from '@notifications/notifications.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, FirebaseModule],
  controllers: [DevicesController, NotificationsController],
  providers: [DevicesService, NotificationsService],
})
export class AppModule {}
