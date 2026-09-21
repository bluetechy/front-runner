import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResultRow } from 'pg';

// PostgreSQL reports a plain RAISE EXCEPTION as P0001, and in this schema that
// only ever comes from a rule a function enforces on purpose -- "the last owner
// cannot leave the organization", "that invitation has expired". Those messages
// are written by us and contain no SQL, no bound values and no credentials, so
// they are the one kind of database error worth showing the caller: without
// them a refused invitation is indistinguishable from the database falling over.
const RULE_VIOLATION = 'P0001';

// The schema's one authorization message, raised by every function that checks
// ownership or membership. Everything else P0001 covers is a rule about the
// request rather than about who is making it.
const NOT_PERMITTED = 'Action cannot be performed.';

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
      if (code === RULE_VIOLATION) {
        const message = error instanceof Error ? error.message : NOT_PERMITTED;
        this.logger.warn(`Refused by a database rule: ${message}`);
        throw message === NOT_PERMITTED ? new ForbiddenException(message) : new BadRequestException(message);
      }
      this.logger.error(`PostgreSQL operation failed (${code})`);
      throw new InternalServerErrorException('Database operation failed');
    }
  }

  async onApplicationShutdown() { await this.pool.end(); }
}
