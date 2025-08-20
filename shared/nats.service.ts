import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { connect, JetStreamManager, NatsConnection, Subscription } from 'nats';
import { Logger } from '@nestjs/common';

export interface NatsConfig {
  url: string;
  name?: string;
  maxReconnectAttempts?: number;
  reconnectTimeWait?: number;
}

@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private connection: NatsConnection | null = null;
  private jetStream: JetStreamManager | null = null;
  private subscriptions: Subscription[] = [];
  private readonly logger = new Logger(NatsService.name);

  constructor(private readonly config: NatsConfig) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      this.connection = await connect({
        servers: this.config.url,
        name: this.config.name || 'marketing-events',
        maxReconnectAttempts: this.config.maxReconnectAttempts || 10,
        reconnectTimeWait: this.config.reconnectTimeWait || 1000,
      });

      this.jetStream = await this.connection.jetstreamManager();

      this.connection.closed().then(() => {
        this.logger.warn('NATS connection closed');
      });

      this.logger.log(`Connected to NATS at ${this.config.url}`);
    } catch (error) {
      this.logger.error('Failed to connect to NATS', error);
      throw error;
    }
  }

  private async disconnect() {
    if (this.connection) {
      for (const subscription of this.subscriptions) {
        subscription.drain();
      }
      this.subscriptions = [];

      await this.connection.drain();
      this.connection.close();
      this.connection = null;
      this.jetStream = null;
      this.logger.log('Disconnected from NATS');
    }
  }

  getConnection(): NatsConnection {
    if (!this.connection) {
      throw new Error('NATS connection not established');
    }
    return this.connection;
  }

  getJetStream(): JetStreamManager {
    if (!this.jetStream) {
      throw new Error('JetStream not available');
    }
    return this.jetStream;
  }

  async publish(subject: string, data: any, options?: any) {
    const connection = this.getConnection();
    const payload = JSON.stringify(data);
    
    try {
      await connection.publish(subject, payload, options);
      this.logger.debug(`Published to ${subject}: ${payload}`);
    } catch (error) {
      this.logger.error(`Failed to publish to ${subject}`, error);
      throw error;
    }
  }

  async publishToStream(streamName: string, subject: string, data: any) {
    const connection = this.getConnection();
    const payload = JSON.stringify(data);
    
    try {
      const ack = await connection.publish(subject, payload);
      this.logger.debug(`Published to stream ${streamName} (${subject})`);
      return ack;
    } catch (error) {
      this.logger.error(`Failed to publish to stream ${streamName}`, error);
      throw error;
    }
  }

  async subscribe(subject: string, callback: (data: any) => void, options?: any): Promise<Subscription> {
    const connection = this.getConnection();
    
    try {
      const subscription = connection.subscribe(subject, options);
      
      (async () => {
        for await (const msg of subscription) {
          try {
            const data = JSON.parse(new TextDecoder().decode(msg.data));
            await callback(data);
          } catch (error) {
            this.logger.error(`Error processing message from ${subject}`, error);
          }
        }
      })();

      this.subscriptions.push(subscription);
      this.logger.log(`Subscribed to ${subject}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to subscribe to ${subject}`, error);
      throw error;
    }
  }

  async subscribeToStream(streamName: string, subject: string, callback: (data: any) => void, options?: any): Promise<Subscription> {
    const connection = this.getConnection();
    
    try {
      const subscription = connection.subscribe(subject, options);
      
      (async () => {
        for await (const msg of subscription) {
          try {
            const data = JSON.parse(new TextDecoder().decode(msg.data));
            await callback(data);
          } catch (error) {
            this.logger.error(`Error processing message from stream ${streamName}`, error);
          }
        }
      })();

      this.subscriptions.push(subscription);
      this.logger.log(`Subscribed to stream ${streamName} (${subject})`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to subscribe to stream ${streamName}`, error);
      throw error;
    }
  }

  async ensureStream(streamName: string, subjects: string[]) {
    try {
      await this.createStream(streamName, subjects);
    } catch (error) {
      this.logger.debug(`Stream ${streamName} might already exist`, error.message);
    }
  }

  async createStream(streamName: string, subjects: string[]) {
    const js = this.getJetStream();
    
    try {
      await js.streams.add({
        name: streamName,
        subjects,
        max_msgs_per_subject: 1000,
        max_age: 24 * 60 * 60 * 1000000000,
      });
      this.logger.log(`Created stream: ${streamName}`);
    } catch (error: any) {
      if (error.code === 10058) {
        this.logger.debug(`Stream ${streamName} already exists`);
      } else {
        this.logger.error(`Failed to create stream ${streamName}`, error);
        throw error;
      }
    }
  }

  isConnected(): boolean {
    return this.connection !== null && !this.connection.closed();
  }
}
