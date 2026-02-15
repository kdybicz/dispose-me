import { getCookieMaxAgeMs, getEmailTtlDays } from '../../../service/tools/config';
import { DAYS_TO_MS_MULTIPLIER } from '../../../service/tools/const';

describe('config tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getEmailTtlDays()', () => {
    test('should default to 1 day when EMAIL_TTL_DAYS is not set', () => {
      // given
      delete process.env.EMAIL_TTL_DAYS;

      // when
      const result = getEmailTtlDays();

      // then
      expect(result).toBe(1);
    });

    test('should default to 1 day when EMAIL_TTL_DAYS is empty', () => {
      // given
      process.env.EMAIL_TTL_DAYS = '';

      // when
      const result = getEmailTtlDays();

      // then
      expect(result).toBe(1);
    });

    test('should use provided value when EMAIL_TTL_DAYS is valid', () => {
      // given
      process.env.EMAIL_TTL_DAYS = '7';

      // when
      const result = getEmailTtlDays();

      // then
      expect(result).toBe(7);
    });

    test('should clamp to minimum of 1 day when EMAIL_TTL_DAYS is less than 1', () => {
      // given
      process.env.EMAIL_TTL_DAYS = '0';

      // when
      const result = getEmailTtlDays();

      // then
      expect(result).toBe(1);
    });

    test('should clamp to minimum of 1 day when EMAIL_TTL_DAYS is negative', () => {
      // given
      process.env.EMAIL_TTL_DAYS = '-5';

      // when
      const result = getEmailTtlDays();

      // then
      expect(result).toBe(1);
    });

    test('should clamp to maximum of 30 days when EMAIL_TTL_DAYS exceeds 30', () => {
      // given
      process.env.EMAIL_TTL_DAYS = '60';

      // when
      const result = getEmailTtlDays();

      // then
      expect(result).toBe(30);
    });

    test('should handle non-integer values by falling back to default', () => {
      // given
      process.env.EMAIL_TTL_DAYS = '7.5';

      // when
      const result = getEmailTtlDays();

      // then
      expect(result).toBe(1);
    });

    test('should handle invalid string values by falling back to default', () => {
      // given
      process.env.EMAIL_TTL_DAYS = 'invalid';

      // when
      const result = getEmailTtlDays();

      // then
      expect(result).toBe(1);
    });
  });

  describe('getCookieMaxAgeMs()', () => {
    test('should default to 30 days in ms when COOKIE_TTL_DAYS is not set', () => {
      // given
      delete process.env.COOKIE_TTL_DAYS;

      // when
      const result = getCookieMaxAgeMs();

      // then
      expect(result).toBe(30 * DAYS_TO_MS_MULTIPLIER);
    });

    test('should default to 30 days in ms when COOKIE_TTL_DAYS is empty', () => {
      // given
      process.env.COOKIE_TTL_DAYS = '';

      // when
      const result = getCookieMaxAgeMs();

      // then
      expect(result).toBe(30 * DAYS_TO_MS_MULTIPLIER);
    });

    test('should use provided value converted to ms when COOKIE_TTL_DAYS is valid', () => {
      // given
      process.env.COOKIE_TTL_DAYS = '7';

      // when
      const result = getCookieMaxAgeMs();

      // then
      expect(result).toBe(7 * DAYS_TO_MS_MULTIPLIER);
    });

    test('should clamp to minimum of 1 day in ms when COOKIE_TTL_DAYS is less than 1', () => {
      // given
      process.env.COOKIE_TTL_DAYS = '0';

      // when
      const result = getCookieMaxAgeMs();

      // then
      expect(result).toBe(1 * DAYS_TO_MS_MULTIPLIER);
    });

    test('should clamp to minimum of 1 day in ms when COOKIE_TTL_DAYS is negative', () => {
      // given
      process.env.COOKIE_TTL_DAYS = '-5';

      // when
      const result = getCookieMaxAgeMs();

      // then
      expect(result).toBe(1 * DAYS_TO_MS_MULTIPLIER);
    });

    test('should clamp to maximum of 365 days in ms when COOKIE_TTL_DAYS exceeds 365', () => {
      // given
      process.env.COOKIE_TTL_DAYS = '500';

      // when
      const result = getCookieMaxAgeMs();

      // then
      expect(result).toBe(365 * DAYS_TO_MS_MULTIPLIER);
    });

    test('should handle non-integer values by falling back to default in ms', () => {
      // given
      process.env.COOKIE_TTL_DAYS = '30.5';

      // when
      const result = getCookieMaxAgeMs();

      // then
      expect(result).toBe(30 * DAYS_TO_MS_MULTIPLIER);
    });

    test('should handle invalid string values by falling back to default in ms', () => {
      // given
      process.env.COOKIE_TTL_DAYS = 'invalid';

      // when
      const result = getCookieMaxAgeMs();

      // then
      expect(result).toBe(30 * DAYS_TO_MS_MULTIPLIER);
    });
  });
});
