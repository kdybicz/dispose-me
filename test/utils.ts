import type { Response } from 'express';

import type { InboxRequest } from '../service/api/InboxController';
import { AUTH_HEADER_KEY } from '../service/tools/const';
import { EmailDatabase } from '../service/tools/EmailDatabase';
import { EmailParser } from '../service/tools/EmailParser';
import { S3FileSystem } from '../service/tools/S3FileSystem';
import { IncomingEmailProcessor } from '../service/processor/IncomingEmailProcessor';

export const COOKIE_TOKEN = 'cookie-token';
export const HEADER_TOKEN = 'header-token';
export const QUERY_TOKEN = 'query-token';

export type RequestArgs<B> = {
  query?: Record<string, undefined | string>;
  params?: Record<string, string>;
  cookies?: Record<string, string>;
  body?: B;
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const mockRequest = <P = Record<string, string>, B = any>(
  args?: RequestArgs<B>,
): InboxRequest<P, B> => {
  const { query = {}, params = {}, cookies, body } = args ?? {};
  return {
    query,
    params,
    headersDistinct: { [AUTH_HEADER_KEY]: [HEADER_TOKEN] },
    headers: {
      cookie:
        cookies != null
          ? Object.entries(cookies)
              .map(([key, val]) => `${key}=${val}`)
              .join('; ')
          : undefined,
    },
    body,
  } as unknown as InboxRequest<P>;
};

export const mockResponse = (): Response => {
  const mockRender = jest.fn();
  return {
    clearCookie: jest.fn(),
    cookie: jest.fn(),
    json: jest.fn(),
    redirect: jest.fn(),
    render: mockRender,
    send: jest.fn(),
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
  } as unknown as Response;
};

export const MockedEmailDatabase = EmailDatabase as unknown as {
  mockStoreEmail: jest.Mock;
  mockListEmails: jest.Mock;
  mockEmailExist: jest.Mock;
  mockDeleteEmail: jest.Mock;
};

export const MockedS3FileSystem = S3FileSystem as unknown as {
  mockGetObject: jest.Mock;
  mockGetObjects: jest.Mock;
};

export const MockedEmailParser = EmailParser as unknown as {
  mockParseEmail: jest.Mock;
};

export const MockedIncomingEmailProcessor = IncomingEmailProcessor as unknown as {
  mockProcessEmail: jest.Mock;
};
