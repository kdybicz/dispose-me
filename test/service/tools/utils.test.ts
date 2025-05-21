import type { Response, Request } from 'express';
import { getCookie, getToken, normalizeUsername, parsePositiveIntOrDefault } from '../../../service/tools/utils';
import { AUTH_COOKIE_KEY, AUTH_HEADER_KEY, AUTH_QUERY_KEY } from '../../../service/tools/const';

const mockResponse = (): Response => {
  const res = {} as unknown as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (params: { cookie?: string, headers?: Record<string, string | string[]>, query?: Record<string, string | string[]>} = { headers: {}, query: {} }): Request => {
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
      // when:
      const result = normalizeUsername(input);
      // then:
      expect(result).toEqual(expected);
    });
  });

  describe('parsePositiveIntOrDefault', () => {
    test('return undefined if no params provided', () => {
      // when
      const result = parsePositiveIntOrDefault();
      // then
      expect(result).toBeUndefined();
    });

    test.each([
      [''],
      ['abc'],
      ['-1'],
      ['0'],
    ])('return undefined if invalid %p value and default value not provided', (value) => {
      // when
      const result = parsePositiveIntOrDefault(value);
      // then
      expect(result).toBeUndefined();
    });

    test.each([
      [''],
      ['abc'],
      ['-1'],
      ['0'],
    ])('return default value when invalid %p value provided', (value) => {
      // when
      const result = parsePositiveIntOrDefault(value, 10);
      // then
      expect(result).toEqual(10);
    });

    test('return parsed value, default value not provided', () => {
      // when
      const result = parsePositiveIntOrDefault('123');
      // then
      expect(result).toEqual(123);
    });

    test('return parsed value, default value provided', () => {
      // when
      const result = parsePositiveIntOrDefault('123', 10);
      // then
      expect(result).toEqual(123);
    });
  });

  describe('getCookie', () => {
    test('return null when no cookies in header', () => {
      // given
      const req = mockRequest();

      // when
      const result = getCookie(req, 'token');
      // then
      expect(result).toBeNull();
    });

    test('return null when expected cookies not in header', () => {
      // given
      const req = mockRequest({ cookie: 'remember=true; test=123' });

      // when
      const result = getCookie(req, 'token');
      // then
      expect(result).toBeNull();
    });

    test('return value when cookies present in header', () => {
      // given
      const req = mockRequest({ cookie: 'remember=true; token=n78CXFciT68XyyfEb1depypckhUSg6capqvMNJGW; test=123' });

      // when
      const result = getCookie(req, 'token');
      // then
      expect(result).toEqual('n78CXFciT68XyyfEb1depypckhUSg6capqvMNJGW');
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

    test('return token from header', () => {
      // given
      const req = mockRequest({ headers: { [AUTH_HEADER_KEY]: 'header-token' }});

      // when
      const result = getToken(req);
      // then
      expect(result).toEqual('header-token');
    });

    test('return token from header', () => {
      // given
      const req = mockRequest({ headers: { [AUTH_HEADER_KEY]: 'header-token' }});

      // when
      const result = getToken(req);
      // then
      expect(result).toEqual('header-token');
    });

    test('return token from array header', () => {
      // given
      const req = mockRequest({ headers: { [AUTH_HEADER_KEY]: ['header-token'] }});

      // when
      const result = getToken(req);
      // then
      expect(result).toEqual('header-token');
    });

    test('return token from query', () => {
      // given
      const req = mockRequest({ query: { [AUTH_QUERY_KEY]: 'query-token' }});

      // when
      const result = getToken(req);
      // then
      expect(result).toEqual('query-token');
    });

    test('return token from array query', () => {
      // given
      const req = mockRequest({ query: { [AUTH_QUERY_KEY]: ['query-token'] }});

      // when
      const result = getToken(req);
      // then
      expect(result).toEqual('query-token');
    });

    test('return token from cookie', () => {
      // given
      const req = mockRequest({ cookie: `remember=true; ${AUTH_COOKIE_KEY}=cookie-token; test=123` });

      // when
      const result = getToken(req);
      // then
      expect(result).toEqual('cookie-token');
    });

    test('return token from header if cookie, header and query provided', () => {
      // given
      const req = mockRequest({
        cookie: `remember=true; ${AUTH_COOKIE_KEY}=cookie-token; test=123`,
        headers: { [AUTH_HEADER_KEY]: ['header-token'] },
        query: { [AUTH_QUERY_KEY]: ['query-token'] },
      });

      // when
      const result = getToken(req);
      // then
      expect(result).toEqual('header-token');
    });

    test('return token from query if cookie and query provided', () => {
      // given
      const req = mockRequest({
        cookie: `remember=true; ${AUTH_COOKIE_KEY}=cookie-token; test=123`,
        query: { [AUTH_QUERY_KEY]: ['query-token'] },
      });

      // when
      const result = getToken(req);
      // then
      expect(result).toEqual('query-token');
    });
  });
});
