import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ValidationService } from './validation.service';
import { 
  createTestModule, 
  resetAllMocks,
  mockFacebookEvent,
  mockTiktokEvent 
} from '../test-utils';

describe('ValidationService', () => {
  let service: ValidationService;
  let module: TestingModule;

  beforeEach(async () => {
    resetAllMocks();
    
    module = await createTestModule([
      ValidationService,
    ]);

    service = module.get<ValidationService>(ValidationService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('validateEvent', () => {
    it('should validate a Facebook event successfully', () => {
      const result = service.validateEvent(mockFacebookEvent);
      
      expect(result).toEqual(mockFacebookEvent);
    });

    it('should validate a TikTok event successfully', () => {
      const result = service.validateEvent(mockTiktokEvent);
      
      expect(result).toEqual(mockTiktokEvent);
    });

    it('should throw BadRequestException for invalid event', () => {
      const invalidEvent = {
        eventId: 'test-event',
      };

      expect(() => service.validateEvent(invalidEvent)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid source', () => {
      const eventWithInvalidSource = {
        ...mockFacebookEvent,
        source: 'invalid-source',
      };

      expect(() => service.validateEvent(eventWithInvalidSource)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing required fields', () => {
      const eventWithMissingFields = {
        eventId: 'test-event',
        source: 'facebook',
      };

      expect(() => service.validateEvent(eventWithMissingFields)).toThrow(BadRequestException);
    });

    it('should handle malformed event data', () => {
      const malformedEvent = null;

      expect(() => service.validateEvent(malformedEvent)).toThrow(BadRequestException);
    });

    it('should handle event with invalid data types', () => {
      const eventWithInvalidTypes = {
        ...mockFacebookEvent,
        data: {
          ...mockFacebookEvent.data,
          user: {
            ...mockFacebookEvent.data.user,
            age: 'invalid-age',
          },
        },
      };

      expect(() => service.validateEvent(eventWithInvalidTypes)).toThrow(BadRequestException);
    });
  });

  describe('validateFacebookEvent', () => {
    it('should validate a correct Facebook event', () => {
      const result = service.validateFacebookEvent(mockFacebookEvent);
      
      expect(result).toEqual(mockFacebookEvent);
    });

    it('should validate a Facebook bottom event', () => {
      const bottomEvent = {
        ...mockFacebookEvent,
        funnelStage: 'bottom' as const,
        eventType: 'ad.click' as const,
      };

      const result = service.validateFacebookEvent(bottomEvent);
      
      expect(result).toEqual(bottomEvent);
    });

    it('should throw BadRequestException for invalid Facebook event', () => {
      const invalidEvent = {
        ...mockFacebookEvent,
        source: 'tiktok',
      };

      expect(() => service.validateFacebookEvent(invalidEvent)).toThrow(BadRequestException);
      expect(() => service.validateFacebookEvent(invalidEvent)).toThrow(/Invalid Facebook event format/);
    });

    it('should throw BadRequestException for missing user data', () => {
      const eventWithoutUser = {
        ...mockFacebookEvent,
        data: {
          engagement: mockFacebookEvent.data.engagement,
        },
      };

      expect(() => service.validateFacebookEvent(eventWithoutUser)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid gender', () => {
      const eventWithInvalidGender = {
        ...mockFacebookEvent,
        data: {
          ...mockFacebookEvent.data,
          user: {
            ...mockFacebookEvent.data.user,
            gender: 'invalid-gender' as any,
          },
        },
      };

      expect(() => service.validateFacebookEvent(eventWithInvalidGender)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid funnel stage', () => {
      const eventWithInvalidStage = {
        ...mockFacebookEvent,
        funnelStage: 'invalid-stage' as any,
      };

      expect(() => service.validateFacebookEvent(eventWithInvalidStage)).toThrow(BadRequestException);
    });

    it('should validate event with all required Facebook fields', () => {
      const completeEvent = {
        eventId: 'fb-complete-123',
        timestamp: '2024-01-15T10:00:00Z',
        source: 'facebook' as const,
        funnelStage: 'top' as const,
        eventType: 'ad.view',
        data: {
          user: {
            userId: 'user-123',
            name: 'Test User',
            age: 25,
            gender: 'female' as const,
            location: {
              country: 'CA',
              city: 'Toronto',
            },
          },
          engagement: {
            actionTime: '2024-01-15T10:00:00Z',
            referrer: 'newsfeed' as const,
            videoId: 'video-456',
          },
        },
      };

      const result = service.validateFacebookEvent(completeEvent);
      expect(result).toEqual(completeEvent);
    });
  });

  describe('validateTiktokEvent', () => {
    it('should validate a correct TikTok event', () => {
      const result = service.validateTiktokEvent(mockTiktokEvent);
      
      expect(result).toEqual(mockTiktokEvent);
    });

    it('should validate a TikTok top event', () => {
      const topEvent = {
        ...mockTiktokEvent,
        funnelStage: 'top' as const,
        eventType: 'video.view' as const,
      };

      const result = service.validateTiktokEvent(topEvent);
      
      expect(result).toEqual(topEvent);
    });

    it('should throw BadRequestException for invalid TikTok event', () => {
      const invalidEvent = {
        ...mockTiktokEvent,
        source: 'facebook',
      };

      expect(() => service.validateTiktokEvent(invalidEvent)).toThrow(BadRequestException);
      expect(() => service.validateTiktokEvent(invalidEvent)).toThrow(/Invalid TikTok event format/);
    });

    it('should throw BadRequestException for missing username', () => {
      const eventWithoutUsername = {
        ...mockTiktokEvent,
        data: {
          ...mockTiktokEvent.data,
          user: {
            userId: mockTiktokEvent.data.user.userId,
            followers: mockTiktokEvent.data.user.followers,
          },
        },
      };

      expect(() => service.validateTiktokEvent(eventWithoutUsername)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid followers type', () => {
      const eventWithInvalidFollowers = {
        ...mockTiktokEvent,
        data: {
          ...mockTiktokEvent.data,
          user: {
            ...mockTiktokEvent.data.user,
            followers: 'invalid-number',
          },
        },
      };

      expect(() => service.validateTiktokEvent(eventWithInvalidFollowers)).toThrow(BadRequestException);
    });

    it('should validate event with zero followers', () => {
      const eventWithZeroFollowers = {
        ...mockTiktokEvent,
        data: {
          ...mockTiktokEvent.data,
          user: {
            ...mockTiktokEvent.data.user,
            followers: 0,
          },
        },
      };

      const result = service.validateTiktokEvent(eventWithZeroFollowers);
      expect(result).toEqual(eventWithZeroFollowers);
    });

    it('should validate event with high follower count', () => {
      const eventWithHighFollowers = {
        ...mockTiktokEvent,
        data: {
          ...mockTiktokEvent.data,
          user: {
            ...mockTiktokEvent.data.user,
            followers: 1000000,
          },
        },
      };

      const result = service.validateTiktokEvent(eventWithHighFollowers);
      expect(result).toEqual(eventWithHighFollowers);
    });
  });

  describe('error handling edge cases', () => {
    it('should handle undefined input', () => {
      expect(() => service.validateEvent(undefined)).toThrow(BadRequestException);
      expect(() => service.validateFacebookEvent(undefined)).toThrow(BadRequestException);
      expect(() => service.validateTiktokEvent(undefined)).toThrow(BadRequestException);
    });

    it('should handle empty object input', () => {
      const emptyEvent = {};

      expect(() => service.validateEvent(emptyEvent)).toThrow(BadRequestException);
      expect(() => service.validateFacebookEvent(emptyEvent)).toThrow(BadRequestException);
      expect(() => service.validateTiktokEvent(emptyEvent)).toThrow(BadRequestException);
    });

    it('should handle string input instead of object', () => {
      const stringInput = 'invalid-event';

      expect(() => service.validateEvent(stringInput)).toThrow(BadRequestException);
      expect(() => service.validateFacebookEvent(stringInput)).toThrow(BadRequestException);
      expect(() => service.validateTiktokEvent(stringInput)).toThrow(BadRequestException);
    });

    it('should handle array input instead of object', () => {
      const arrayInput = [mockFacebookEvent];

      expect(() => service.validateEvent(arrayInput)).toThrow(BadRequestException);
      expect(() => service.validateFacebookEvent(arrayInput)).toThrow(BadRequestException);
      expect(() => service.validateTiktokEvent(arrayInput)).toThrow(BadRequestException);
    });

    it('should handle mixed type validation', () => {
      expect(() => service.validateTiktokEvent(mockFacebookEvent)).toThrow(BadRequestException);
      
      expect(() => service.validateFacebookEvent(mockTiktokEvent)).toThrow(BadRequestException);
    });

    it('should provide meaningful error messages', () => {
      const eventWithMissingEventId = {
        ...mockFacebookEvent,
        eventId: undefined,
      };

      try {
        service.validateFacebookEvent(eventWithMissingEventId);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Invalid Facebook event format');
      }
    });

    it('should handle nested validation errors', () => {
      const eventWithNestedError = {
        ...mockFacebookEvent,
        data: {
          ...mockFacebookEvent.data,
          user: {
            ...mockFacebookEvent.data.user,
            age: 'not-a-number',
          },
        },
      };

      expect(() => service.validateFacebookEvent(eventWithNestedError)).toThrow(BadRequestException);
    });

    it('should validate events with minimal required data', () => {
      const minimalFacebookEvent = {
        eventId: 'minimal-fb',
        timestamp: '2024-01-15T10:00:00Z',
        source: 'facebook' as const,
        funnelStage: 'top' as const,
        eventType: 'minimal.event',
        data: {
          user: {
            userId: 'user-min',
            name: 'Min User',
            age: 18,
            gender: 'non-binary' as const,
            location: {
              country: 'US',
              city: 'NYC',
            },
          },
          engagement: {},
        },
      };

      const result = service.validateFacebookEvent(minimalFacebookEvent);
      expect(result).toEqual(minimalFacebookEvent);
    });
  });

  describe('performance tests', () => {
    it('should handle validation of multiple events efficiently', () => {
      const events = Array(100).fill(null).map((_, i) => ({
        ...mockFacebookEvent,
        eventId: `perf-test-${i}`,
      }));

      const startTime = Date.now();
      events.forEach(event => service.validateFacebookEvent(event));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle large event data efficiently', () => {
      const largeEvent = {
        ...mockFacebookEvent,
        data: {
          ...mockFacebookEvent.data,
          engagement: {
            ...mockFacebookEvent.data.engagement,
            largeData: 'x'.repeat(10000),
            metadata: Array(1000).fill(null).map((_, i) => ({ id: i, value: `data-${i}` })),
          },
        },
      };

      expect(() => service.validateFacebookEvent(largeEvent)).not.toThrow();
    });
  });
});