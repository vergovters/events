import { LoggerService } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface LogContext {
  correlationId?: string;
  service?: string;
  method?: string;
  userId?: string;
  eventId?: string;
  source?: string;
  [key: string]: any;
}

export class StructuredLogger implements LoggerService {
  private correlationId: string;

  constructor(
    private readonly serviceName: string,
    private readonly parentCorrelationId?: string
  ) {
    this.correlationId = parentCorrelationId || randomUUID();
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const correlationId = context?.correlationId || this.correlationId;
    
    const logData = {
      timestamp,
      level: level.toUpperCase(),
      service: this.serviceName,
      correlationId,
      message,
      ...context,
    };

    return JSON.stringify(logData);
  }

  log(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  error(message: string, trace?: string, context?: LogContext): void {
    const errorContext = {
      ...context,
      trace,
      error: true,
    };
    console.error(this.formatMessage('error', message, errorContext));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  debug(message: string, context?: LogContext): void {
    console.debug(this.formatMessage('debug', message, context));
  }

  verbose(message: string, context?: LogContext): void {
    console.log(this.formatMessage('verbose', message, context));
  }

  createChildLogger(subService?: string): StructuredLogger {
    const childService = subService ? `${this.serviceName}:${subService}` : this.serviceName;
    return new StructuredLogger(childService, this.correlationId);
  }

  getCorrelationId(): string {
    return this.correlationId;
  }

  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }
}

export function extractCorrelationId(req: any, res: any, next: any): void {
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
}

export function LogMethod() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const logger = new StructuredLogger(target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const correlationId = logger.getCorrelationId();
      
      logger.log(`Method ${propertyKey} called`, {
        correlationId,
        method: propertyKey,
        args: args.length,
        timestamp: new Date().toISOString(),
      });

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        logger.log(`Method ${propertyKey} completed successfully`, {
          correlationId,
          method: propertyKey,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        logger.error(`Method ${propertyKey} failed`, error.stack, {
          correlationId,
          method: propertyKey,
          duration: `${duration}ms`,
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        throw error;
      }
    };

    return descriptor;
  };
}

