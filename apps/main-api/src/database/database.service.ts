import { Injectable, InternalServerErrorException, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(config: ConfigService) {
    this.pool = new Pool({
      host: config.getOrThrow<string>('POSTGRES_ADDRESS'),
      port: config.getOrThrow<number>('POSTGRES_PORT'),
      database: config.getOrThrow<string>('POSTGRES_DATABASE'),
      user: config.getOrThrow<string>('POSTGRES_USER'),
      password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
      max: config.getOrThrow<number>('POSTGRES_POOL_SIZE'),
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      statement_timeout: config.getOrThrow<number>('POSTGRES_STATEMENT_TIMEOUT_MS'),
    });
    this.pool.on('error', () => this.logger.error('Idle PostgreSQL connection failed'));
  }

  async query<T extends QueryResultRow>(sql: string, values: unknown[] = []): Promise<T[]> {
    try {
      return (await this.pool.query<T>(sql, values)).rows;
    } catch (error) {
      // Do not expose SQL, query parameters, or upstream messages to clients/logs.
      const code = error instanceof Error && 'code' in error ? String(error.code) : 'unknown';
      this.logger.error(`PostgreSQL operation failed (${code})`);
      throw new InternalServerErrorException('Database operation failed');
    }
  }

  async onApplicationShutdown() { await this.pool.end(); }
}
