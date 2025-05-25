import type { Request } from 'express';
import { getCookie, getToken, normalizeUsername } from '../../../service/tools/utils';
import {
  AUTH_COOKIE_KEY,
  AUTH_HEADER_KEY,
  AUTH_QUERY_KEY,
  REMEMBER_COOKIE_KEY,
} from '../../../service/tools/const';
import { HEADER_TOKEN, QUERY_TOKEN, COOKIE_TOKEN } from '../../utils';

const mockRequest = (
  params: {
    cookie?: string;
    headers?: Record<string, string[]>;
    query?: Record<string, string | string[]>;
  } = { headers: {}, query: {} },
): Request => {
  const req = {
    headers: { cookie: params.cookie },
    headersDistinct: params.headers,
    query: params.query,
  } as unknown as Request;
  return req;
};

describe('utils tests', () => {
  describe('nameNormalizer', () => {
    test.each([
      ['', ''],
      ['TeSt', 'test'],
      ['te.st', 'test'],
      ['test+123', 'test'],
      ['te.st+123', 'test'],
      ['t.e.s.t+123', 'test'],
      ['t.e.s.t%2B123', 'test'],
      ['t.e.s.t+123+234', 'test'],
      ["t.e.s.t+12'3+234", 'test'],
    ])('normalizing %p and expecting %p', (input, expected) => {
      // when
      const result = normalizeUsername(input);
      // then
      expect(result).toEqual(expected);
    });
  });

  describe('getCookie', () => {
    test('return null when no cookies in header', () => {
      // given
      const req = mockRequest();

      // when
      const result = getCookie(req, REMEMBER_COOKIE_KEY);
      // then
      expect(result).toBeNull();
    });

    test('return null when expected cookies not in header', () => {
      // given
      const req = mockRequest({ cookie: `${REMEMBER_COOKIE_KEY}=true; test=123` });

      // when
      const result = getCookie(req, AUTH_COOKIE_KEY);
      // then
      expect(result).toBeNull();
    });

    test('return value when cookies present in header', () => {
      // given
      const req = mockRequest({
        cookie: `${REMEMBER_COOKIE_KEY}=true; ${AUTH_COOKIE_KEY}=${COOKIE_TOKEN}; test=123`,
      });

      // when
      const result = getCookie(req, AUTH_COOKIE_KEY);
      // then
      expect(result).toEqual(COOKIE_TOKEN);
    });
  });

  describe('getToken', () => {
    test('return undefined when token not set', () => {
      // given
      const req = mockRequest();

      // when
      const result = getToken(req);
      // then
      expect(result).toBeNull();
    });

    test('return token from array header', () => {
      // given
      const req = mockRequest({ headers: { [AUTH_HEADER_KEY]: [HEADER_TOKEN] } });

      // when
      const result = getToken(req);
      // then
      expect(result).toEqual(HEADER_TOKEN);
    });

    test('return token from query', () => {
      // given
      const req = mockRequest({ query: { [AUTH_QUERY_KEY]: QUERY_TOKEN } });

      // when
      const result = getToken(req);
      // then
      expect(result).toEqual(QUERY_TOKEN);
    });

    test('return token from array query', () => {
      // given
      const req = mockRequest({ query: { [AUTH_QUERY_KEY]: [QUERY_TOKEN] } });

      // when
      const result = getToken(req);
      // then
      expect(result).toEqual(QUERY_TOKEN);
    });

    test('return token from cookie', () => {
      // given
      const req = mockRequest({
        cookie: `${REMEMBER_COOKIE_KEY}=true; ${AUTH_COOKIE_KEY}=${COOKIE_TOKEN}; test=123`,
      });

      // when
      const result = getToken(req);
      // then
      expect(result).toEqual(COOKIE_TOKEN);
    });

    test('return token from header if cookie, header and query provided', () => {
      // given
      const req = mockRequest({
        cookie: `${REMEMBER_COOKIE_KEY}=true; ${AUTH_COOKIE_KEY}=${COOKIE_TOKEN}; test=123`,
        headers: { [AUTH_HEADER_KEY]: [HEADER_TOKEN] },
        query: { [AUTH_QUERY_KEY]: [QUERY_TOKEN] },
      });

      // when
      const result = getToken(req);
      // then
      expect(result).toEqual(HEADER_TOKEN);
    });

    test('return token from query if cookie and query provided', () => {
      // given
      const req = mockRequest({
        cookie: `${REMEMBER_COOKIE_KEY}=true; ${AUTH_COOKIE_KEY}=${COOKIE_TOKEN}; test=123`,
        query: { [AUTH_QUERY_KEY]: [QUERY_TOKEN] },
      });

      // when
      const result = getToken(req);
      // then
      expect(result).toEqual(QUERY_TOKEN);
    });
  });
});
