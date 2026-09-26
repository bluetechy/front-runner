import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/index.js";
import { WidgetsController } from "./widgets.controller.js";
import { WidgetsResolver } from "./widgets.resolver.js";
import { WidgetsService } from "./widgets.service.js";

// The vertical that owns the widget language: what a valid document is, where
// one is stored, and the public address a browser fetches one from.
//
// It has a controller as well as a resolver, which only `sms` and `health`
// otherwise do. See `widgets.controller.ts` for why the public read is HTTP
// rather than a field on the schema.
@Module({
  imports: [DatabaseModule],
  controllers: [WidgetsController],
  providers: [WidgetsResolver, WidgetsService],
})
export class WidgetsModule {}
