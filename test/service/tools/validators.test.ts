import { matchedData, validationResult } from 'express-validator';

import {
  buildLimitQueryValidator,
  buildMessageIdParamValidation,
  buildRememberBodyValidator,
  buildSentAfterQueryValidator,
  buildTokenBodyValidator,
  buildTypeQueryValidator,
  buildUsernameParamValidator,
  DEFAULT_TYPE,
} from '../../../service/tools/validators';
import { mockRequest } from '../../utils';

describe('validators', () => {
  describe('buildUsernameParamValidator()', () => {
    test('accepts a valid username', async () => {
      // given
      const req = mockRequest({ params: { username: 'validUser' } });

      // when
      await buildUsernameParamValidator().run(req);
      // and
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req)).toEqual({ username: 'validuser' });
    });

    test('rejects empty username', async () => {
      // given
      const req = mockRequest({ params: { username: '' } });

      // when
      await buildUsernameParamValidator().run(req);
      // and
      expect(validationResult(req).isEmpty()).toBe(false);
    });

    test('rejects not existing username', async () => {
      // given
      const req = mockRequest({ params: {} });

      // when
      await buildUsernameParamValidator().run(req);
      // and
      expect(validationResult(req).isEmpty()).toBe(false);
    });

    test('removes dots, spaces, and parts after plus', async () => {
      // given
      const req = mockRequest({ params: { username: 'Va.l id+ignore this' } });

      // when
      await buildUsernameParamValidator().run(req);
      // and
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req)).toEqual({ username: 'valid' });
    });

    test('rejects blacklisted username', async () => {
      // given
      const bad = (process.env.INBOX_BLACKLIST?.split(',') ?? [])[0];

      // is case insensitive
      let req = mockRequest({ params: { username: bad.toUpperCase() } });
      // when
      await buildUsernameParamValidator().run(req);
      // and
      expect(validationResult(req).isEmpty()).toBe(false);

      // ignores +suffix
      req = mockRequest({ params: { username: `${bad}+random` } });
      // when
      await buildUsernameParamValidator().run(req);
      // and
      expect(validationResult(req).isEmpty()).toBe(false);

      // ignores docs
      req = mockRequest({ params: { username: bad.split('').join('.') } });
      // when
      await buildUsernameParamValidator().run(req);
      // and
      expect(validationResult(req).isEmpty()).toBe(false);

      // ignores whitespaces
      req = mockRequest({ params: { username: bad.split('').join(' ') } });
      // when
      await buildUsernameParamValidator().run(req);
      // and
      expect(validationResult(req).isEmpty()).toBe(false);

      // ignores all of the above
      req = mockRequest({
        params: { username: `${bad.toUpperCase().split('').join(' . ')}+random` },
      });
      // when
      await buildUsernameParamValidator().run(req);
      // and
      expect(validationResult(req).isEmpty()).toBe(false);
    });
  });

  describe('buildMessageIdParamValidation()', () => {
    test('accepts valid alphanumeric message id', async () => {
      // given
      const req = mockRequest({ params: { id: 'abc123XYZ' } });

      // when
      await buildMessageIdParamValidation().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req)).toEqual({ id: 'abc123XYZ' });
    });

    test('rejects non-alphanumeric message id', async () => {
      // given
      const req = mockRequest({ params: { id: 'abc-123!' } });

      // when
      await buildMessageIdParamValidation().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(false);
    });
  });

  describe('buildSentAfterQueryValidator()', () => {
    test('accepts valid integer sentAfter (as string)', async () => {
      // given
      const req = mockRequest({ query: { sentAfter: '1748007745' } });

      // when
      await buildSentAfterQueryValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req).sentAfter).toEqual(1748007745);
    });

    test('accepts missing sentAfter', async () => {
      // given
      const req = mockRequest();

      // when
      await buildSentAfterQueryValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req)).toEqual({});
    });

    test('rejects sentAfter below min', async () => {
      // given
      const req = mockRequest({ query: { sentAfter: '-10' } });

      // when
      await buildSentAfterQueryValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(false);
    });

    test('rejects sentAfter above max', async () => {
      // given
      const req = mockRequest({ query: { sentAfter: '10000000000' } });

      // when
      await buildSentAfterQueryValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(false);
    });
  });

  describe('buildLimitQueryValidator()', () => {
    test('accepts valid limit in range', async () => {
      // given
      const req = mockRequest({ query: { limit: '20' } });

      // when
      await buildLimitQueryValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req)).toEqual({ limit: 20 });
    });

    test('accepts missing limit', async () => {
      // given
      const req = mockRequest();

      // when
      await buildLimitQueryValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req)).toEqual({});
    });

    test('rejects limit below min', async () => {
      // given
      const req = mockRequest({ query: { limit: '-1' } });

      // when
      await buildLimitQueryValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(false);
    });

    test('rejects limit above max', async () => {
      // given
      const req = mockRequest({ query: { limit: '101' } });

      // when
      await buildLimitQueryValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(false);
    });
  });

  describe('buildTypeQueryValidator()', () => {
    test('accepts allowed type (case-insensitive)', async () => {
      // given
      const req = mockRequest({ query: { type: 'HTML' } });

      // when
      await buildTypeQueryValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req)).toEqual({ type: 'html' });
    });

    test('applies default if missing', async () => {
      // given
      const req = mockRequest();

      // when
      await buildTypeQueryValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req)).toEqual({ type: DEFAULT_TYPE });
    });

    test('rejects type not in allowed list', async () => {
      // given
      const req = mockRequest({ query: { type: 'foobar' } });

      // when
      await buildTypeQueryValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(false);
    });
  });

  describe('buildTokenBodyValidator()', () => {
    test('accepts alphanumeric token', async () => {
      // given
      const req = mockRequest({ body: { token: 'ABC123' } });

      // when
      await buildTokenBodyValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req)).toEqual({ token: 'ABC123' });
    });

    test('rejects non-alphanumeric token', async () => {
      // given
      const req = mockRequest({ body: { token: 'not valid!' } });

      // when
      await buildTokenBodyValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(false);
    });
  });

  describe('buildRememberBodyValidator()', () => {
    test('accepts "on" string for remember', async () => {
      // given
      const req = mockRequest({ body: { remember: 'on' } });

      // when
      await buildRememberBodyValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req)).toEqual({ remember: true });
    });

    test('accepts "off" string for remember', async () => {
      // given
      const req = mockRequest({ body: { remember: 'off' } });

      // when
      await buildRememberBodyValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req)).toEqual({ remember: false });
    });

    test('accepts missing remember', async () => {
      // given
      const req = mockRequest();

      // when
      await buildRememberBodyValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req)).toEqual({ remember: false });
    });

    test('rejects invalid remember value', async () => {
      // given
      const req = mockRequest({ body: { remember: 'maybe' } });

      // when
      await buildRememberBodyValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(false);
    });
  });
});
