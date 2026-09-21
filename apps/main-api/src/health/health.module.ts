import {
  Controller,
  Get,
  Module,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Public } from "../authentication/index.js";
import { DatabaseModule, DatabaseService } from "../database/index.js";
@Controller("health")
@Public()
class HealthController {
  constructor(private readonly db: DatabaseService) {}
  @Get("live") live() {
    return { status: "ok" };
  }
  @Get("ready") async ready() {
    try {
      await this.db.query("SELECT 1");
      return { status: "ok" };
    } catch {
      throw new ServiceUnavailableException("Database unavailable");
    }
  }
}
@Module({ imports: [DatabaseModule], controllers: [HealthController] })
export class HealthModule {}
