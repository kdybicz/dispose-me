import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda/trigger/api-gateway-authorizer';
import { getCookie, getToken } from '../../service/authorizer';

describe('Authorizer', () => {
  const TOKEN = 'token';

  describe('getCookie', () => {
    test('Do not fail when no cookie', () => {
      // given:
      const event = mockEvent()

      // when:
      const result = getCookie(event, 'x-api-key');
      // then:
      expect(result).toBeUndefined();
    });

    test('Return cookie value', () => {
      // given:
      const event = mockEvent({ cookie: TOKEN })

      // when:
      const result = getCookie(event, 'x-api-key');
      // then:
      expect(result).toEqual(TOKEN);
    });
  });

  describe('getToken', () => {
    test('Do not fail when no cookie, header nor query', () => {
      // given:
      const event = mockEvent()

      // when:
      const result = getToken(event);
      // then:
      expect(result).toBeNull();
    });

    test('Prioritize header token', () => {
      // given:
      const event = mockEvent({ cookie: 'cookie-token', header: 'header-token', query: 'query-token' });

      // when:
      const result = getToken(event);
      // then:
      expect(result).toEqual('header-token')
    });

    test('Fallback to query token when header not provided', () => {
      // given:
      const event = mockEvent({ cookie: 'cookie-token', query: 'query-token' });

      // when:
      const result = getToken(event);
      // then:
      expect(result).toEqual('query-token')
    });

    test('Fallback to cookie token when header and query not provided', () => {
      // given:
      const event = mockEvent({ cookie: 'cookie-token' });

      // when:
      const result = getToken(event);
      // then:
      expect(result).toEqual('cookie-token')
    });
  });
});

const mockEvent = ( params?: { cookie?: string, header?: string, query?: string }): APIGatewayRequestAuthorizerEvent => {
  const { cookie, header, query } = params ?? {};

  const event: Record<string, any> = {};
  if (cookie) {
    if (!event.headers) {
      event.headers = {};
    }
    event.headers.Cookie = `x-api-key=${cookie}; `;
  }
  if (header) {
    if (!event.headers) {
      event.headers = {};
    }
    event.headers['x-api-key'] = header;
  }
  if (query) {
    if (!event.queryStringParameters) {
      event.queryStringParameters = {};
    }
    event.queryStringParameters['x-api-key'] = query;
  }

  return event as unknown as APIGatewayRequestAuthorizerEvent;
}
