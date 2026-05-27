import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '@db/database.module';
import { ConfigController } from '@config/config.controller';
import { AppConfigService } from '@config/config.service';
import { DevicesController } from '@devices/devices.controller';
import { DevicesService } from '@devices/devices.service';
import { FirebaseModule } from '@firebase/firebase.module';
import { NotificationsController } from '@notifications/notifications.controller';
import { NotificationsService } from '@notifications/notifications.service';
import { TopicsController } from '@topics/topics.controller';
import { TopicsService } from '@topics/topics.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, FirebaseModule],
  controllers: [DevicesController, NotificationsController, ConfigController, TopicsController],
  providers: [DevicesService, NotificationsService, AppConfigService, TopicsService],
})
export class AppModule {}
