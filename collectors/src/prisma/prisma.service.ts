import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { StructuredLogger } from '@shared/logger';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new StructuredLogger('PrismaService');

  constructor() {
    super();
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to database');

      await this.runMigrations();
    } catch (error) {
      this.logger.error('Failed to connect to database', error.stack);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Disconnected from database');
    } catch (error) {
      this.logger.error('Failed to disconnect from database', error.stack);
    }
  }

  private async runMigrations() {
    try {
      const { execSync } = require('child_process');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      this.logger.log('Database migrations completed');
    } catch (error) {
      this.logger.warn('Failed to run migrations, continuing anyway', error.message);
    }
  }
}

