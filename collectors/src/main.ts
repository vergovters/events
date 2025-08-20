import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StructuredLogger } from '@shared/logger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const logger = new StructuredLogger('Collector');
  
  try {
    logger.log('Starting Collector service...');
    
    const app = await NestFactory.create(AppModule, {
      logger: logger,
    });

    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));

    app.setGlobalPrefix('api/v1');

    const port = process.env.PORT || 3001;
    await app.listen(port);
    
    logger.log(`Collector service is running on port ${port}`);

    const gracefulShutdown = async (signal: string) => {
      logger.log(`Received ${signal}, starting graceful shutdown...`);
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await app.close();
      logger.log('Collector service stopped gracefully');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start Collector service', error.stack);
    process.exit(1);
  }
}

bootstrap();
