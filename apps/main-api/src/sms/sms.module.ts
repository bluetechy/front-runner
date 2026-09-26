import { Module } from "@nestjs/common";
import { SmsController } from "./sms.controller.js";
import { SmsService } from "./sms.service.js";

// The transport, and the one route into it from outside.
//
// The service is exported because the two-factor vertical sends the
// enrollment code itself; the controller is not exported because a controller
// is a door rather than a dependency.
@Module({
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
