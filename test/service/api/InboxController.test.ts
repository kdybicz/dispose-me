import { Request, type Response } from 'express';
import {
  type InboxAuthBody,
  InboxController,
  type InboxListParams,
  type InboxRequest,
} from '../../../service/api/InboxController';
import { EmailDatabase } from '../../../service/tools/EmailDatabase';
import { S3FileSystem } from '../../../service/tools/S3FileSystem';
import { EmailParser } from '../../../service/tools/EmailParser';
import {
  AUTH_COOKIE_KEY,
  AUTH_HEADER_KEY,
  REMEMBER_COOKIE_KEY,
} from '../../../service/tools/const';

jest.mock('../../../service/tools/EmailDatabase');
jest.mock('../../../service/tools/EmailParser');
jest.mock('../../../service/tools/S3FileSystem');

const COOKIE_TOKEN = 'cookie-token';
const HEADER_TOKEN = 'header-token';

type RequestArgs<B> = {
  query?: Record<string, undefined | string>;
  params?: Record<string, string>;
  cookies?: Record<string, string>;
  body?: B;
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const mockRequest = <P = Record<string, string>, B = any>(
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

const mockResponse = (): Response => {
  return {
    render: jest.fn(),
    json: jest.fn(),
    redirect: jest.fn(),
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;
};

const MockedEmailDatabase = EmailDatabase as unknown as {
  mockStoreEmail: jest.Mock;
  mockListEmails: jest.Mock;
  mockEmailExist: jest.Mock;
  mockDeleteEmail: jest.Mock;
};

const MockedS3FileSystem = S3FileSystem as unknown as {
  getObject: jest.Mock;
  getObjects: jest.Mock;
};

const MockedEmailParser = EmailParser as unknown as {
  mockParseEmail: jest.Mock;
};

describe('InboxController', () => {
  let controller: InboxController;
  let res: Response;

  beforeEach(() => {
    controller = new InboxController('bucket');
    res = mockResponse();
    jest.clearAllMocks();
  });

  describe('index()', () => {
    test('renders index page as html by default', async () => {
      // given
      const req = mockRequest();

      // when
      await controller.index(req, res);
      // then
      expect(res.render).toHaveBeenCalledWith('pages/index');
    });

    test('renders index page as html', async () => {
      // given
      const type = 'html';
      const req = mockRequest({
        query: { type },
      });

      // when
      await controller.index(req, res);
      // then
      expect(res.render).toHaveBeenCalledWith('pages/index');
    });

    test('show index page as json', async () => {
      // given
      const type = 'json';
      // and
      const req = mockRequest({
        query: { type },
      });

      // when
      await controller.index(req, res);
      // then
      expect(res.json).toHaveBeenCalledWith({});
    });

    test('redirects to inbox if auth cookie set', async () => {
      // given
      const req = mockRequest({
        cookies: { [AUTH_COOKIE_KEY]: COOKIE_TOKEN },
      });

      // when
      await controller.index(req, res);
      // then
      expect(res.redirect).toHaveBeenCalledWith('/inbox');
    });
  });

  describe('auth()', () => {
    test('sets cookies and redirects to inbox if remember is true', async () => {
      // given
      const token = 'token';
      const remember = true;
      // and
      const req = mockRequest<Record<string, never>, InboxAuthBody>({
        body: { token, remember },
      });

      // when
      await controller.auth(req, res);
      // then
      expect(res.cookie).toHaveBeenCalledWith(REMEMBER_COOKIE_KEY, remember, {
        httpOnly: true,
        maxAge: 2592000000,
        sameSite: 'strict',
        secure: true,
      });
      expect(res.cookie).toHaveBeenCalledWith(AUTH_COOKIE_KEY, token, {
        httpOnly: true,
        maxAge: 2592000000,
        sameSite: 'strict',
        secure: true,
      });
      expect(res.redirect).toHaveBeenCalledWith('/inbox');
    });

    test('sets cookie and redirects if remember is false', async () => {
      // given
      const token = 'token';
      const remember = false;
      // and
      const req = mockRequest<Record<string, never>, InboxAuthBody>({
        body: { token, remember },
      });

      // when
      await controller.auth(req, res);
      // then
      expect(res.cookie).toHaveBeenCalledWith(AUTH_COOKIE_KEY, token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: true,
      });
      expect(res.redirect).toHaveBeenCalledWith('/inbox');
    });
  });

  describe('logout()', () => {
    test('clears cookies and redirects to home', async () => {
      // given
      const req = mockRequest();

      // when
      await controller.logout(req, res);
      // then
      expect(res.clearCookie).toHaveBeenCalledWith(AUTH_COOKIE_KEY);
      expect(res.clearCookie).toHaveBeenCalledWith(REMEMBER_COOKIE_KEY);
      expect(res.redirect).toHaveBeenCalledWith('/');
    });
  });

  describe('list()', () => {
    test.each([[undefined], ['html']])('renders email list as html', async (type) => {
      // given
      const username = 'username';
      const sentAfter = '123456789';
      const limit = '15';
      // and
      const req = mockRequest<InboxListParams>({
        query: { sentAfter, limit, type },
        params: { username },
      });
      // and
      MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({ Items: [] });

      // when
      await controller.list(req, res);
      // then
      expect(MockedEmailDatabase.mockListEmails).toHaveBeenCalledWith(
        username,
        Number.parseInt(sentAfter),
        Number.parseInt(limit),
      );
      expect(res.render).toHaveBeenCalledWith('pages/list', { emails: [], token: HEADER_TOKEN });
    });

    test('renders email list as json', async () => {
      // given
      const username = 'username';
      const sentAfter = '123456789';
      const limit = '15';
      const type = 'json';
      // and
      const req = mockRequest<InboxListParams>({
        query: { sentAfter, limit, type },
        params: { username },
      });
      // and
      MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({ Items: [] });

      // when
      await controller.list(req, res);
      // then
      expect(MockedEmailDatabase.mockListEmails).toHaveBeenCalledWith(
        username,
        Number.parseInt(sentAfter),
        Number.parseInt(limit),
      );
      expect(res.json).toHaveBeenCalledWith({ emails: [] });
    });
  });
});
