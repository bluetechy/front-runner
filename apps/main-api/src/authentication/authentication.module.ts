import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/index.js';
import { AuthenticationGuard } from './authentication.guard.js';
@Module({
  imports: [DatabaseModule, JwtModule.registerAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({ secret: config.getOrThrow<string>('JWT_SECRET_KEY'), signOptions: { algorithm: 'HS256' } }),
  })],
  providers: [{ provide: APP_GUARD, useClass: AuthenticationGuard }],
  exports: [JwtModule],
})
export class AuthenticationModule {}
