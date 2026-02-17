import { parseCookieTtlDays } from '../../../service/tools/cookies';

describe('cookies tests', () => {
  describe('parseCookieTtlDays()', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    test('should default to 30 days when COOKIE_TTL_DAYS is not set', () => {
      // given
      delete process.env.COOKIE_TTL_DAYS;

      // when
      const result = parseCookieTtlDays();

      // then
      expect(result).toBe(30);
    });

    test('should default to 30 days when COOKIE_TTL_DAYS is empty', () => {
      // given
      process.env.COOKIE_TTL_DAYS = '';

      // when
      const result = parseCookieTtlDays();

      // then
      expect(result).toBe(30);
    });

    test('should use provided value when COOKIE_TTL_DAYS is valid', () => {
      // given
      process.env.COOKIE_TTL_DAYS = '7';

      // when
      const result = parseCookieTtlDays();

      // then
      expect(result).toBe(7);
    });

    test('should clamp to minimum of 1 day when COOKIE_TTL_DAYS is less than 1', () => {
      // given
      process.env.COOKIE_TTL_DAYS = '0';

      // when
      const result = parseCookieTtlDays();

      // then
      expect(result).toBe(1);
    });

    test('should clamp to minimum of 1 day when COOKIE_TTL_DAYS is negative', () => {
      // given
      process.env.COOKIE_TTL_DAYS = '-5';

      // when
      const result = parseCookieTtlDays();

      // then
      expect(result).toBe(1);
    });

    test('should clamp to maximum of 365 days when COOKIE_TTL_DAYS exceeds 365', () => {
      // given
      process.env.COOKIE_TTL_DAYS = '500';

      // when
      const result = parseCookieTtlDays();

      // then
      expect(result).toBe(365);
    });

    test('should handle non-integer values by falling back to default', () => {
      // given
      process.env.COOKIE_TTL_DAYS = '30.5';

      // when
      const result = parseCookieTtlDays();

      // then
      expect(result).toBe(30);
    });

    test('should handle invalid string values by falling back to default', () => {
      // given
      process.env.COOKIE_TTL_DAYS = 'invalid';

      // when
      const result = parseCookieTtlDays();

      // then
      expect(result).toBe(30);
    });
  });
});
