import { NotificationCache } from './NotificationCache';

describe('NotificationCache', () => {
  let cache: NotificationCache;

  beforeEach(() => {
    cache = new NotificationCache();
  });

  describe('canSend', () => {
    it('should return true when no record exists for condition', () => {
      const result = cache.canSend('above_upper', 60);

      expect(result).toBe(true);
    });

    it('should return false when cooldown period has not elapsed', () => {
      cache.record('above_upper');

      const result = cache.canSend('above_upper', 60);

      expect(result).toBe(false);
    });

    it('should return true when cooldown period has elapsed', () => {
      // Record a notification with a timestamp in the past
      cache.record('above_upper');

      // Manually set the timestamp to 61 minutes ago
      const record = (cache as any).cache.get('above_upper');
      record.timestamp = new Date(Date.now() - 61 * 60 * 1000);

      const result = cache.canSend('above_upper', 60);

      expect(result).toBe(true);
    });

    it('should handle different conditions independently', () => {
      cache.record('above_upper');

      expect(cache.canSend('above_upper', 60)).toBe(false);
      expect(cache.canSend('below_lower', 60)).toBe(true);
    });
  });

  describe('record', () => {
    it('should record notification with current timestamp', () => {
      const beforeTime = Date.now();
      cache.record('above_upper');
      const afterTime = Date.now();

      const record = (cache as any).cache.get('above_upper');
      expect(record).toBeDefined();
      expect(record.condition).toBe('above_upper');
      expect(record.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime);
      expect(record.timestamp.getTime()).toBeLessThanOrEqual(afterTime);
    });

    it('should update existing record when called again', () => {
      cache.record('above_upper');
      const firstRecord = (cache as any).cache.get('above_upper');

      // Wait a bit and record again
      cache.record('above_upper');
      const secondRecord = (cache as any).cache.get('above_upper');

      expect(secondRecord.timestamp.getTime()).toBeGreaterThanOrEqual(firstRecord.timestamp.getTime());
    });
  });

  describe('cleanup', () => {
    it('should remove expired records', () => {
      cache.record('above_upper');
      cache.record('below_lower');

      // Set one record to be expired
      const record = (cache as any).cache.get('above_upper');
      record.timestamp = new Date(Date.now() - 61 * 60 * 1000);

      cache.cleanup(60);

      expect(cache.size()).toBe(1);
      expect(cache.canSend('above_upper', 60)).toBe(true);
      expect(cache.canSend('below_lower', 60)).toBe(false);
    });

    it('should not remove records within cooldown period', () => {
      cache.record('above_upper');
      cache.record('below_lower');

      cache.cleanup(60);

      expect(cache.size()).toBe(2);
    });
  });

  describe('size', () => {
    it('should return 0 for empty cache', () => {
      expect(cache.size()).toBe(0);
    });

    it('should return correct count of records', () => {
      cache.record('above_upper');
      expect(cache.size()).toBe(1);

      cache.record('below_lower');
      expect(cache.size()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all records', () => {
      cache.record('above_upper');
      cache.record('below_lower');

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.canSend('above_upper', 60)).toBe(true);
      expect(cache.canSend('below_lower', 60)).toBe(true);
    });
  });
});
