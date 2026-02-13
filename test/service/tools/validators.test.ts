import { matchedData, validationResult } from 'express-validator';
import fetchMock from 'fetch-mock';
import { AUTH_BODY_KEY, AUTH_QUERY_KEY } from '../../../service/tools/const';
import {
  buildLimitQueryValidator,
  buildMessageIdParamValidation,
  buildRememberBodyValidator,
  buildSentAfterQueryValidator,
  buildTokenBodyValidator,
  buildTokenQueryValidator,
  buildTypeQueryValidator,
  buildUsernameParamValidator,
} from '../../../service/tools/validators';
import {
  BODY_TOKEN,
  INVALID_CHARACTERS_TOKEN,
  INVALID_LENGTH_TOKEN,
  INVALID_MESSAGE_ID,
  MESSAGE_ID,
  mockRequest,
  QUERY_TOKEN,
} from '../../utils';

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

    test('removes dots and parts after plus', async () => {
      // given
      const req = mockRequest({ params: { username: 'Va.l.id+ignore-this' } });

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
    });
  });

  describe('buildMessageIdParamValidation()', () => {
    test('accepts valid alphanumeric message id', async () => {
      // given
      const req = mockRequest({ params: { id: MESSAGE_ID } });

      // when
      await buildMessageIdParamValidation().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req)).toEqual({ id: MESSAGE_ID });
    });

    test('rejects non-alphanumeric message id', async () => {
      // given
      const req = mockRequest({ params: { id: INVALID_MESSAGE_ID } });

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

    test('accepts if no type is provided', async () => {
      // given
      const req = mockRequest();

      // when
      await buildTypeQueryValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req)).toEqual({});
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

  describe('buildTokenQueryValidator()', () => {
    test('accepts missing token, when it is not required', async () => {
      // given
      const req = mockRequest({ query: {} });

      // when
      await buildTokenQueryValidator({ required: false }).run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(true);
    });

    test('accepts missing token, when it is required', async () => {
      // given
      const req = mockRequest({ query: {} });

      // when
      await buildTokenQueryValidator({ required: true }).run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(false);
    });

    test('accepts alphanumeric token', async () => {
      // given
      const req = mockRequest({ query: { [AUTH_QUERY_KEY]: QUERY_TOKEN } });

      // when
      await buildTokenQueryValidator({ required: true }).run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req)).toEqual({ [AUTH_QUERY_KEY]: QUERY_TOKEN });
    });

    test('rejects non-alphanumeric token, when it is required', async () => {
      // given
      const req = mockRequest({ query: { [AUTH_QUERY_KEY]: INVALID_CHARACTERS_TOKEN } });

      // when
      await buildTokenQueryValidator({ required: true }).run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(false);
    });

    test('rejects non-alphanumeric token, when it is not required', async () => {
      // given
      const req = mockRequest({ query: { [AUTH_QUERY_KEY]: INVALID_CHARACTERS_TOKEN } });

      // when
      await buildTokenQueryValidator({ required: false }).run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(false);
    });
  });

  describe('buildTokenBodyValidator()', () => {
    beforeAll(() => {
      fetchMock.mockGlobal();
    });

    beforeEach(() => {
      fetchMock.clearHistory();
      fetchMock.removeRoutes();
    });

    afterAll(() => {
      fetchMock.unmockGlobal();
    });

    test('accepts alphanumeric token', async () => {
      // given
      const req = mockRequest({ body: { [AUTH_BODY_KEY]: BODY_TOKEN } });
      fetchMock.route('path:/inbox/?type=json', 200);

      // when
      await buildTokenBodyValidator().run(req);

      // then
      expect(validationResult(req).isEmpty()).toBe(true);
      expect(matchedData(req)).toEqual({ [AUTH_BODY_KEY]: BODY_TOKEN });
    });

    test('rejects non-alphanumeric token', async () => {
      // given
      const req = mockRequest({ body: { [AUTH_BODY_KEY]: INVALID_CHARACTERS_TOKEN } });
      fetchMock.route('path:/inbox/?type=json', 200);

      // when
      await buildTokenBodyValidator().run(req);

      // then
      expect(validationResult(req).array()).toEqual([
        expect.objectContaining({
          location: 'body',
          msg: 'The token must contain only letters and numbers (no special characters).',
          path: 'token',
          type: 'field',
          value: INVALID_CHARACTERS_TOKEN,
        }),
      ]);
    });

    test('rejects token of incorrect length', async () => {
      // given
      const req = mockRequest({ body: { [AUTH_BODY_KEY]: INVALID_LENGTH_TOKEN } });
      fetchMock.route('path:/inbox/?type=json', 200);

      // when
      await buildTokenBodyValidator().run(req);

      // then
      expect(validationResult(req).array()).toEqual([
        expect.objectContaining({
          location: 'body',
          msg: 'The token must be between 20 and 50 characters long.',
          path: 'token',
          type: 'field',
          value: INVALID_LENGTH_TOKEN,
        }),
      ]);
    });

    test('rejects invalid token', async () => {
      // given
      const req = mockRequest({ body: { [AUTH_BODY_KEY]: BODY_TOKEN } });
      fetchMock.route('path:/inbox/?type=json', 403);

      // when
      await buildTokenBodyValidator().run(req);

      // then
      expect(validationResult(req).array()).toEqual([
        expect.objectContaining({
          location: 'body',
          msg: 'Provided token is invalid!',
          path: 'token',
          type: 'field',
          value: BODY_TOKEN,
        }),
      ]);
    });

    test('rejects when token validation fails', async () => {
      // given
      const req = mockRequest({ body: { [AUTH_BODY_KEY]: BODY_TOKEN } });
      fetchMock.route('path:/inbox/?type=json', 503);

      // when
      await buildTokenBodyValidator().run(req);

      // then
      expect(validationResult(req).array()).toEqual([
        expect.objectContaining({
          location: 'body',
          msg: 'Unexpected problem with validating the token!',
          path: 'token',
          type: 'field',
          value: BODY_TOKEN,
        }),
      ]);
    });

    test('rejects when token validation times out', async () => {
      // given
      const req = mockRequest({ body: { [AUTH_BODY_KEY]: BODY_TOKEN } });
      // and
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      fetchMock.route('path:/inbox/?type=json', { throws: abortError });

      // when
      await buildTokenBodyValidator().run(req);

      // then
      expect(validationResult(req).array()).toEqual([
        expect.objectContaining({
          location: 'body',
          msg: 'Token validation request timed out. Please try again.',
          path: 'token',
          type: 'field',
          value: BODY_TOKEN,
        }),
      ]);
    }, 10000);
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
