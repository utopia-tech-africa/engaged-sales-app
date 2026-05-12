import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { MnotifySmsService } from "./mnotify-sms.service";

@Module({
  imports: [ConfigModule],
  providers: [MnotifySmsService],
  exports: [MnotifySmsService]
})
export class SmsModule {}
