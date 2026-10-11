import type { Context } from 'aws-lambda';
import type { APIGatewayRequestAuthorizerEvent } from 'aws-lambda/trigger/api-gateway-authorizer';

import { getCookie, getToken, handler } from '../../service/authorizer';
import { AUTH_COOKIE_KEY, AUTH_HEADER_KEY, AUTH_QUERY_KEY } from '../../service/tools/const';
import { COOKIE_TOKEN, HEADER_TOKEN, QUERY_TOKEN } from '../utils';

describe('Authorizer', () => {
  describe('handler', () => {
    test.each([
      [{ header: HEADER_TOKEN }, HEADER_TOKEN],
      [{ query: QUERY_TOKEN }, QUERY_TOKEN],
      [{ cookie: COOKIE_TOKEN }, COOKIE_TOKEN],
      [{}, null],
    ])('returns an authorization policy without using a callback for %j', async (params, token) => {
      // given
      const event = mockEvent(params);
      event.methodArn = 'arn:aws:execute-api:eu-west-1:123456789012:api-id/production/GET/inbox';
      const callback = jest.fn();

      // when
      const response = handler(event, {} as Context, callback);

      // then
      expect(response).toBeInstanceOf(Promise);
      await expect(response).resolves.toEqual({
        principalId: 'x-api-key',
        usageIdentifierKey: token,
        policyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'execute-api:Invoke',
              Effect: 'Allow',
              Resource: event.methodArn,
            },
          ],
        },
      });

      // and
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getCookie', () => {
    test('Do not fail when no cookie', () => {
      // given
      const event = mockEvent();

      // when
      const result = getCookie(event, AUTH_COOKIE_KEY);
      // then
      expect(result).toBeUndefined();
    });

    test('Return cookie value', () => {
      // given
      const event = mockEvent({ cookie: COOKIE_TOKEN });

      // when
      const result = getCookie(event, AUTH_COOKIE_KEY);
      // then
      expect(result).toEqual(COOKIE_TOKEN);
    });
  });

  describe('getToken', () => {
    test('Do not fail when no cookie, header nor query', () => {
      // given
      const event = mockEvent();

      // when
      const result = getToken(event);
      // then
      expect(result).toBeNull();
    });

    test('Prioritize header token', () => {
      // given
      const event = mockEvent({
        cookie: COOKIE_TOKEN,
        header: HEADER_TOKEN,
        query: QUERY_TOKEN,
      });

      // when
      const result = getToken(event);
      // then
      expect(result).toEqual(HEADER_TOKEN);
    });

    test('Fallback to query token when header not provided', () => {
      // given
      const event = mockEvent({ cookie: COOKIE_TOKEN, query: QUERY_TOKEN });

      // when
      const result = getToken(event);
      // then
      expect(result).toEqual(QUERY_TOKEN);
    });

    test('Fallback to cookie token when header and query not provided', () => {
      // given
      const event = mockEvent({ cookie: COOKIE_TOKEN });

      // when
      const result = getToken(event);
      // then
      expect(result).toEqual(COOKIE_TOKEN);
    });
  });
});

const mockEvent = (params?: {
  cookie?: string;
  header?: string;
  query?: string;
}): APIGatewayRequestAuthorizerEvent => {
  const { cookie, header, query } = params ?? {};

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const event: Record<string, any> = {};
  if (cookie) {
    if (!event.headers) {
      event.headers = {};
    }
    event.headers.Cookie = `${AUTH_COOKIE_KEY}=${cookie}; `;
  }
  if (header) {
    if (!event.headers) {
      event.headers = {};
    }
    event.headers[AUTH_HEADER_KEY] = header;
  }
  if (query) {
    if (!event.queryStringParameters) {
      event.queryStringParameters = {};
    }
    event.queryStringParameters[AUTH_QUERY_KEY] = query;
  }

  return event as unknown as APIGatewayRequestAuthorizerEvent;
};
