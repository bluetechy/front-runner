import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module.js";
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const config = app.get(ConfigService);
  app.useBodyParser("json", { limit: "64kb" });
  app.enableCors({
    origin: config.getOrThrow<string[]>("CORS_ORIGINS"),
    credentials: false,
  });
  app.enableShutdownHooks();
  await app.listen(config.getOrThrow<number>("API_PORT"), "0.0.0.0");
}
void bootstrap().catch(() => {
  console.error("API startup failed; check configuration and startup logs");
  process.exitCode = 1;
});
