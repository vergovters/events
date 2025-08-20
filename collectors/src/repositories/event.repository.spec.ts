import { Test, TestingModule } from '@nestjs/testing';
import { EventRepository } from './event.repository';
import { PrismaService } from '../prisma/prisma.service';
import { 
  createTestModule, 
  mockPrismaService,
  resetAllMocks,
  testErrors,
  mockFacebookEvent,
  mockTiktokEvent
} from '../test-utils';

describe('EventRepository', () => {
  let repository: EventRepository;
  let prismaService: PrismaService;
  let module: TestingModule;

  beforeEach(async () => {
    resetAllMocks();
    
    module = await createTestModule([
      EventRepository,
      { provide: PrismaService, useValue: mockPrismaService },
    ]);

    repository = module.get<EventRepository>(EventRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('saveEvent', () => {
    it('should save a Facebook event successfully', async () => {
      const correlationId = 'test-corr-123';
      const mockCreatedEvent = {
        id: 1,
        eventId: mockFacebookEvent.eventId,
        ...mockFacebookEvent,
      };

      mockPrismaService.event.create.mockResolvedValue(mockCreatedEvent);

      await repository.saveEvent(mockFacebookEvent, correlationId);

      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: mockFacebookEvent.eventId,
          source: mockFacebookEvent.source,
          eventType: mockFacebookEvent.eventType,
          funnelStage: mockFacebookEvent.funnelStage,
          correlationId: correlationId,
          userId: mockFacebookEvent.data.user.userId,
          userName: mockFacebookEvent.data.user.name,
          userAge: mockFacebookEvent.data.user.age,
          userGender: mockFacebookEvent.data.user.gender,
          userCountry: mockFacebookEvent.data.user.location.country,
          userCity: mockFacebookEvent.data.user.location.city,
        }),
      });
    });

    it('should save a TikTok event successfully', async () => {
      const correlationId = 'test-corr-456';
      const mockCreatedEvent = {
        id: 2,
        eventId: mockTiktokEvent.eventId,
        ...mockTiktokEvent,
      };

      mockPrismaService.event.create.mockResolvedValue(mockCreatedEvent);

      await repository.saveEvent(mockTiktokEvent, correlationId);

      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: mockTiktokEvent.eventId,
          source: mockTiktokEvent.source,
          eventType: mockTiktokEvent.eventType,
          funnelStage: mockTiktokEvent.funnelStage,
          correlationId: correlationId,
          userId: mockTiktokEvent.data.user.userId,
          userName: mockTiktokEvent.data.user.username,
          userFollowers: mockTiktokEvent.data.user.followers,
        }),
      });
    });

    it('should save event without correlation ID', async () => {
      const mockCreatedEvent = {
        id: 3,
        eventId: mockFacebookEvent.eventId,
        ...mockFacebookEvent,
      };

      mockPrismaService.event.create.mockResolvedValue(mockCreatedEvent);

      await repository.saveEvent(mockFacebookEvent);

      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: mockFacebookEvent.eventId,
          correlationId: undefined,
        }),
      });
    });

    it('should handle database errors', async () => {
      mockPrismaService.event.create.mockRejectedValue(testErrors.prismaError);

      await expect(repository.saveEvent(mockFacebookEvent, 'error-test')).rejects.toThrow(testErrors.prismaError);

      expect(mockPrismaService.event.create).toHaveBeenCalled();
    });

    it('should handle events with missing optional fields', async () => {
      const minimalEvent = {
        ...mockFacebookEvent,
        data: {
          user: {
            userId: 'user-minimal',
          },
          engagement: {
            actionTime: '2024-01-15T10:00:00Z',
          },
        },
      } as any;

      const mockCreatedEvent = {
        id: 4,
        eventId: minimalEvent.eventId,
        ...minimalEvent,
      };

      mockPrismaService.event.create.mockResolvedValue(mockCreatedEvent);

      await repository.saveEvent(minimalEvent);

      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-minimal',
          userName: null,
          userAge: null,
          userGender: null,
          userCountry: null,
          userCity: null,
          userFollowers: null,
        }),
      });
    });
  });

  describe('saveFacebookEvent', () => {
    it('should call saveEvent with Facebook event', async () => {
      const correlationId = 'fb-test-corr';
      const mockCreatedEvent = {
        id: 5,
        eventId: mockFacebookEvent.eventId,
        ...mockFacebookEvent,
      };

      mockPrismaService.event.create.mockResolvedValue(mockCreatedEvent);

      await repository.saveFacebookEvent(mockFacebookEvent, correlationId);

      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          source: 'facebook',
          correlationId: correlationId,
        }),
      });
    });
  });

  describe('saveTiktokEvent', () => {
    it('should call saveEvent with TikTok event', async () => {
      const correlationId = 'ttk-test-corr';
      const mockCreatedEvent = {
        id: 6,
        eventId: mockTiktokEvent.eventId,
        ...mockTiktokEvent,
      };

      mockPrismaService.event.create.mockResolvedValue(mockCreatedEvent);

      await repository.saveTiktokEvent(mockTiktokEvent, correlationId);

      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          source: 'tiktok',
          correlationId: correlationId,
        }),
      });
    });
  });

  describe('getEventById', () => {
    it('should return event when found', async () => {
      const eventId = 'existing-event-123';
      const mockFoundEvent = {
        id: 1,
        eventId: eventId,
        source: 'facebook',
        eventType: 'ad.view',
        timestamp: new Date(),
      };

      mockPrismaService.event.findUnique.mockResolvedValue(mockFoundEvent);

      const result = await repository.getEventById(eventId);

      expect(result).toBe(mockFoundEvent);
      expect(mockPrismaService.event.findUnique).toHaveBeenCalledWith({
        where: { eventId },
      });
    });

    it('should return null when event not found', async () => {
      const eventId = 'non-existent-event';

      mockPrismaService.event.findUnique.mockResolvedValue(null);

      const result = await repository.getEventById(eventId);

      expect(result).toBeNull();
      expect(mockPrismaService.event.findUnique).toHaveBeenCalledWith({
        where: { eventId },
      });
    });

    it('should handle database errors', async () => {
      const eventId = 'error-event';

      mockPrismaService.event.findUnique.mockRejectedValue(testErrors.prismaError);

      await expect(repository.getEventById(eventId)).rejects.toThrow(testErrors.prismaError);
    });
  });

  describe('checkDatabaseConnection', () => {
    it('should return true when database is connected', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      const result = await repository.checkDatabaseConnection();

      expect(result).toBe(true);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return false when database connection fails', async () => {
      mockPrismaService.$queryRaw.mockRejectedValue(testErrors.prismaError);

      const result = await repository.checkDatabaseConnection();

      expect(result).toBe(false);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete event lifecycle', async () => {
      const eventId = 'lifecycle-test-event';
      const correlationId = 'lifecycle-corr';
      
      const eventToSave = {
        ...mockFacebookEvent,
        eventId: eventId,
      };

      const mockCreatedEvent = {
        id: 7,
        eventId: eventId,
        ...eventToSave,
      };

      const mockFoundEvent = {
        ...mockCreatedEvent,
        timestamp: new Date(),
      };

      mockPrismaService.event.create.mockResolvedValue(mockCreatedEvent);
      mockPrismaService.event.findUnique.mockResolvedValue(mockFoundEvent);

      await repository.saveEvent(eventToSave, correlationId);

      const found = await repository.getEventById(eventId);

      expect(found).toBeDefined();
      expect(found.eventId).toBe(eventId);
    });

    it('should handle multiple event types', async () => {
      const events = [
        { ...mockFacebookEvent, eventId: 'multi-fb-1' },
        { ...mockTiktokEvent, eventId: 'multi-ttk-1' },
        { ...mockFacebookEvent, eventId: 'multi-fb-2' },
      ];

      mockPrismaService.event.create.mockImplementation(data => 
        Promise.resolve({ id: Math.random(), ...data.data })
      );

      const promises = events.map((event, i) => 
        repository.saveEvent(event, `multi-corr-${i}`)
      );

      await Promise.all(promises);

      expect(mockPrismaService.event.create).toHaveBeenCalledTimes(3);
    });

    it('should handle database reconnection', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(testErrors.prismaError);
      
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '1': 1 }]);

      const firstCheck = await repository.checkDatabaseConnection();
      const secondCheck = await repository.checkDatabaseConnection();

      expect(firstCheck).toBe(false);
      expect(secondCheck).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle prisma transaction failures', async () => {
      const transactionError = new Error('Transaction rolled back');
      mockPrismaService.event.create.mockRejectedValue(transactionError);

      await expect(repository.saveEvent(mockFacebookEvent)).rejects.toThrow(transactionError);
    });

    it('should handle malformed event data gracefully', async () => {
      const malformedEvent = {
        ...mockFacebookEvent,
        data: {
          user: null,
          engagement: {},
        },
      } as any;

      const mockCreatedEvent = {
        id: 8,
        eventId: malformedEvent.eventId,
        ...malformedEvent,
      };

      mockPrismaService.event.create.mockResolvedValue(mockCreatedEvent);

      await repository.saveEvent(malformedEvent);

      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          userName: null,
        }),
      });
    });

    it('should handle concurrent save operations', async () => {
      const events = Array(5).fill(null).map((_, i) => ({
        ...mockFacebookEvent,
        eventId: `concurrent-${i}`,
      }));

      mockPrismaService.event.create.mockImplementation(data => 
        Promise.resolve({ id: Math.random(), ...data.data })
      );

      const promises = events.map((event, i) => 
        repository.saveEvent(event, `concurrent-corr-${i}`)
      );

      await Promise.all(promises);

      expect(mockPrismaService.event.create).toHaveBeenCalledTimes(5);
    });
  });
});