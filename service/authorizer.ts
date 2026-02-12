import type {
  APIGatewayRequestAuthorizerEvent,
  APIGatewayRequestAuthorizerHandler,
} from 'aws-lambda';

import { AUTH_COOKIE_KEY, AUTH_HEADER_KEY, AUTH_QUERY_KEY } from './tools/const';
import log from './tools/log';

export const getCookie = (
  event: APIGatewayRequestAuthorizerEvent,
  cookieName: string,
): string | undefined => {
  const headers = event.headers ?? {};
  const cookieHeader = Object.entries(headers).find(
    ([name, _]) => name.toLowerCase() === 'cookie',
  )?.[1];

  if (!cookieHeader) {
    return;
  }

  return cookieHeader
    .split(';')
    .find((cookie: string) => {
      return cookie.trim().toLowerCase().startsWith(`${cookieName.toLowerCase()}=`);
    })
    ?.split('=')?.[1]
    ?.trim();
};

export const getToken = (event: APIGatewayRequestAuthorizerEvent): string | null => {
  if (event.headers?.[AUTH_HEADER_KEY]) {
    log.debug('Found token in Header');
    return event.headers[AUTH_HEADER_KEY];
  }
  if (event.queryStringParameters?.[AUTH_QUERY_KEY]) {
    log.debug('Found token in Query parameters');
    return event.queryStringParameters[AUTH_QUERY_KEY];
  }

  const cookie = getCookie(event, AUTH_COOKIE_KEY);
  if (cookie) {
    log.debug('Found token in a cookie');
    return cookie;
  }

  log.warn('Did not find token in Header, Cookie nor a Query parameter');
  return null;
};

export const handler: APIGatewayRequestAuthorizerHandler = (event, _, callback) => {
  callback(null, {
    principalId: 'x-api-key',
    usageIdentifierKey: getToken(event),
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
};
