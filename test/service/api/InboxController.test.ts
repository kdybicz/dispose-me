import type { Response } from 'express';
import {
  type InboxAuthBody,
  InboxController,
  type InboxEmailParams,
  type InboxListParams,
} from '../../../service/api/InboxController';
import type { ParsedEmail } from '../../../service/tools/EmailParser';
import { AUTH_COOKIE_KEY, REMEMBER_COOKIE_KEY } from '../../../service/tools/const';
import {
  COOKIE_TOKEN,
  HEADER_TOKEN,
  MockedEmailDatabase,
  MockedEmailParser,
  MockedS3FileSystem,
  mockRequest,
  mockResponse,
  validateRequest,
} from '../../utils';
import {
  buildAuthValidationChain,
  buildDeleteEmailValidationChain,
  buildDownloadEmailValidationChain,
  buildLatestEmailValidationChain,
  buildListRssValidationChain,
  buildShowEmailValidationChain,
} from '../../../service/tools/validators';

jest.mock('../../../service/tools/EmailDatabase');
jest.mock('../../../service/tools/EmailParser');
jest.mock('../../../service/tools/S3FileSystem');

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
    const token = 'token';

    test('sets cookies and redirects to inbox if remember is true', async () => {
      // given
      const remember = 'on';
      // and
      const req = mockRequest<Record<string, never>, InboxAuthBody>({
        body: { token, remember },
      });
      await validateRequest(req, buildAuthValidationChain());

      // when
      await controller.auth(req, res);
      // then
      expect(res.cookie).toHaveBeenCalledWith(REMEMBER_COOKIE_KEY, true, {
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
      const remember = 'off';
      // and
      const req = mockRequest<Record<string, never>, InboxAuthBody>({
        body: { token, remember },
      });
      await validateRequest(req, buildAuthValidationChain());

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

  describe('show()', () => {
    const username = 'username';
    const id = 'messageid';

    test.skip('should return 403 if username or id is missing', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({ params: {} });
      await validateRequest(req, buildShowEmailValidationChain());

      // when
      await controller.show(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith('pages/403');
    });

    test.each([[undefined], ['html']])(
      'should return 404 as HTML if email does not exist',
      async (type) => {
        // given
        const req = mockRequest<InboxEmailParams>({
          params: { username, id },
          query: { type },
        });
        await validateRequest(req, buildShowEmailValidationChain());
        // and
        MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(false);

        // when
        await controller.show(req, res);
        // then
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.render).toHaveBeenCalledWith('pages/404');
      },
    );

    test('should return 404 as JSON if email does not exist', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username, id },
        query: { type: 'json' },
      });
      await validateRequest(req, buildShowEmailValidationChain());
      // and
      MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(false);

      // when
      await controller.show(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'The page you are looking for was not found.',
      });
    });

    test.each([[undefined], ['html']])('should render email details as HTML', async (type) => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username, id },
        query: { type },
      });
      await validateRequest(req, buildShowEmailValidationChain());
      // and
      MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(true);
      MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
        Body: { transformToString: () => 'raw-email' },
      });
      MockedEmailParser.mockParseEmail.mockResolvedValueOnce({ from: 'a', subject: 'b' });

      // when
      await controller.show(req, res);
      // then
      expect(res.render).toHaveBeenCalledWith('pages/email', {
        email: expect.objectContaining({ id }),
        token: HEADER_TOKEN,
      });
    });

    test('should return email details as JSON', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username, id },
        query: { type: 'json' },
      });
      await validateRequest(req, buildShowEmailValidationChain());
      // and
      MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(true);
      MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
        Body: { transformToString: () => 'raw-email' },
      });
      MockedEmailParser.mockParseEmail.mockResolvedValueOnce({ from: 'a', subject: 'b' });

      // when
      await controller.show(req, res);
      // then
      expect(res.json).toHaveBeenCalledWith({ email: expect.objectContaining({ id }) });
    });

    test.each([[undefined], ['html']])(
      'should return email details as HTML when email body not found - to be fixed',
      async (type) => {
        // given
        const req = mockRequest<InboxEmailParams>({
          params: { username, id },
          query: { type },
        });
        await validateRequest(req, buildShowEmailValidationChain());
        // and
        MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(true);
        MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
          Body: { transformToString: () => undefined },
        });

        // when
        await controller.show(req, res);
        // then
        expect(res.render).toHaveBeenCalledWith('pages/email', {
          email: undefined,
          token: HEADER_TOKEN,
        });
      },
    );

    test('should return email details as JSON when email body not found - to be fixed', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username, id },
        query: { type: 'json' },
      });
      await validateRequest(req, buildShowEmailValidationChain());
      // and
      MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(true);
      MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
        Body: { transformToString: () => undefined },
      });

      // when
      await controller.show(req, res);
      // then
      expect(res.json).toHaveBeenCalledWith({
        email: undefined,
      });
    });

    test.skip.each([[undefined], ['html'], ['json']])(
      'should return 404 if S3 or parser fails',
      async (type) => {
        // given
        const req = mockRequest<InboxEmailParams>({
          params: { username, id },
          query: { type },
        });
        await validateRequest(req, buildShowEmailValidationChain());
        // and
        MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(true);
        MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
          Body: { transformToString: () => undefined },
        });

        // when
        await controller.show(req, res);
        // then
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.render).toHaveBeenCalledWith('pages/404');
      },
    );
  });

  describe('download()', () => {
    const username = 'username';
    const id = 'messageid';

    test.skip('should return 403 if username or id is missing', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({ params: {} });
      await validateRequest(req, buildDownloadEmailValidationChain());

      // when
      await controller.download(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith('pages/403');
    });

    test('should return 404 if email does not exist', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({ params: { username, id } });
      await validateRequest(req, buildDownloadEmailValidationChain());
      // and
      MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(false);

      // when
      await controller.download(req, res);
      // then
      expect(res.render).toHaveBeenCalledWith('pages/404');
    });

    test('should set headers and send email file if it exists', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({ params: { username, id } });
      await validateRequest(req, buildDownloadEmailValidationChain());
      // and
      MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(true);
      MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
        Body: { transformToString: jest.fn().mockResolvedValue('raw-email-data') },
      });

      // when
      await controller.download(req, res);
      // then
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-disposition',
        `attachment; filename=${id}.eml`,
      );
      expect(res.type).toHaveBeenCalledWith('application/octet-stream');
      expect(res.send).toHaveBeenCalledWith('raw-email-data');
    });

    test.skip('should return 404 if S3 object has no body', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({ params: { username, id } });
      await validateRequest(req, buildDownloadEmailValidationChain());
      // and
      MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(true);
      MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
        Body: { transformToString: jest.fn().mockResolvedValue(undefined) },
      });

      // when
      await controller.download(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith('pages/404');
    });
  });

  describe('delete()', () => {
    const username = 'username';
    const id = 'messageid';

    test.skip('should return 403 if username or id is missing', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({ params: {} });
      await validateRequest(req, buildDeleteEmailValidationChain());

      // when
      await controller.delete(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith('pages/403');
    });

    test('should redirect to inbox if deletion is successful', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username, id },
      });
      await validateRequest(req, buildDeleteEmailValidationChain());
      // and
      MockedEmailDatabase.mockDeleteEmail.mockResolvedValueOnce(true);

      // when
      await controller.delete(req, res);
      // then
      expect(MockedEmailDatabase.mockDeleteEmail).toHaveBeenCalledWith(username, id);
      // and
      expect(res.redirect).toHaveBeenCalledWith(
        `/inbox/${username}?${new URLSearchParams(req.query as Record<string, string>)}`,
      );
    });

    test('should return 404 if deletion is unsuccessful', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username, id },
      });
      await validateRequest(req, buildDeleteEmailValidationChain());
      // and
      MockedEmailDatabase.mockDeleteEmail.mockResolvedValueOnce(false);

      // when
      await controller.delete(req, res);
      // then
      expect(MockedEmailDatabase.mockDeleteEmail).toHaveBeenCalledWith(username, id);
      // and
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith('pages/404');
    });
  });

  describe('latest()', () => {
    const username = 'username';
    const id = 'messageid';
    const sentAfter = '123456789';

    test('should return 403 if username is missing', async () => {
      // given
      const req = mockRequest<InboxListParams>({ params: {} });
      await validateRequest(req, buildLatestEmailValidationChain());

      // when
      await controller.latest(req, res);
      //then
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith('pages/403');
    });

    test.skip('should return 404 if latest email is not found', async () => {
      // given
      const req = mockRequest<InboxListParams>({
        params: { username },
        query: { sentAfter },
      });
      await validateRequest(req, buildLatestEmailValidationChain());
      // and
      MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({ Items: [] });

      // when
      await controller.latest(req, res);
      // then
      expect(res.render).toHaveBeenCalledWith('pages/404');
    });

    test('should render last email even if it is not found - to be fixed', async () => {
      // given
      const req = mockRequest<InboxListParams>({
        params: { username },
        query: { sentAfter },
      });
      await validateRequest(req, buildLatestEmailValidationChain());
      // and
      MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({ Items: [] });

      // when
      await controller.latest(req, res);
      // then
      expect(res.render).toHaveBeenCalledWith('pages/email', {
        email: undefined,
        token: 'header-token',
      });
    });

    test.each([[undefined], ['html']])(
      'should render latest email as HTML if found',
      async (type) => {
        // given
        const req = mockRequest<InboxListParams>({
          params: { username },
          query: { sentAfter, type },
        });
        await validateRequest(req, buildLatestEmailValidationChain());
        // and
        MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({ Items: [{ Id: id }] });
        MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
          Body: { transformToString: jest.fn().mockResolvedValue('raw-email') },
        });
        MockedEmailParser.mockParseEmail.mockResolvedValueOnce({ from: 'a', subject: 'b' });

        // when
        await controller.latest(req, res);
        // then
        expect(res.render).toHaveBeenCalledWith('pages/email', {
          email: expect.objectContaining({ id }),
          token: HEADER_TOKEN,
        });
      },
    );

    test('should return latest email as JSON if found and type=json', async () => {
      // given
      const req = mockRequest<InboxListParams>({
        params: { username },
        query: { sentAfter, type: 'json' },
      });
      await validateRequest(req, buildLatestEmailValidationChain());
      // and
      MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({ Items: [{ Id: id }] });
      MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
        Body: { transformToString: jest.fn().mockResolvedValue('raw-email') },
      });
      MockedEmailParser.mockParseEmail.mockResolvedValueOnce({ from: 'a', subject: 'b' });

      // when
      await controller.latest(req, res);
      // then
      expect(res.json).toHaveBeenCalledWith({
        email: expect.objectContaining({ id }),
      });
    });

    test.each([[undefined], ['html']])(
      'should return email details as HTML when email body not found - to be fixed',
      async (type) => {
        // given
        const req = mockRequest<InboxEmailParams>({
          params: { username },
          query: { type },
        });
        await validateRequest(req, buildLatestEmailValidationChain());
        // and
        MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({ Items: [{ Id: id }] });
        MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
          Body: { transformToString: jest.fn().mockResolvedValue(undefined) },
        });

        // when
        await controller.latest(req, res);
        // then
        expect(res.render).toHaveBeenCalledWith('pages/email', {
          email: undefined,
          token: HEADER_TOKEN,
        });
      },
    );

    test('should return email details as JSON when email body not found - to be fixed', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username },
        query: { type: 'json' },
      });
      await validateRequest(req, buildLatestEmailValidationChain());
      // and
      MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({ Items: [{ Id: id }] });
      MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
        Body: { transformToString: jest.fn().mockResolvedValue(undefined) },
      });

      // when
      await controller.latest(req, res);
      // then
      expect(res.json).toHaveBeenCalledWith({
        email: undefined,
      });
    });

    test.skip.each([[undefined], ['html'], ['json']])(
      'should return 404 if S3 object returns no body',
      async (type) => {
        // given
        const req = mockRequest<InboxListParams>({
          params: { username },
          query: { sentAfter, type },
        });
        await validateRequest(req, buildLatestEmailValidationChain());
        // and
        MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({ Items: [{ Id: id }] });
        MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
          Body: { transformToString: jest.fn().mockResolvedValue(undefined) },
        });

        // when
        await controller.latest(req, res);
        // then
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.render).toHaveBeenCalledWith('pages/404');
      },
    );
  });

  describe('inbox()', () => {
    test('should render inbox page as HTML by default', async () => {
      // given
      const req = mockRequest<InboxListParams>({
        query: {},
      });

      // when
      await controller.inbox(req, res);
      // then
      expect(res.render).toHaveBeenCalledWith('pages/inbox');
    });

    test('should render inbox page as HTML when type is html', async () => {
      // given
      const req = mockRequest<InboxListParams>({
        query: { type: 'html' },
      });

      // when
      await controller.inbox(req, res);
      // then
      expect(res.render).toHaveBeenCalledWith('pages/inbox');
    });

    test('should return a JSON message when type is json', async () => {
      // given
      const req = mockRequest<InboxListParams>({
        query: { type: 'json' },
      });

      // when
      await controller.inbox(req, res);
      // then
      expect(res.json).toHaveBeenCalledWith({ message: 'Go to /inbox/:username' });
    });
  });

  describe('list()', () => {
    const username = 'username';
    const sentAfter = '123456789';
    const limit = '15';

    test.each([[undefined], ['html']])('renders email list as html', async (type) => {
      // given
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

  describe('listRss()', () => {
    const username = 'username';
    const normalizedUsername = 'username'; // adjust if normalizeUsername transforms it
    const id1 = 'id1';
    const id2 = 'id2';

    test.skip('should return 403 if username is missing', async () => {
      // given
      const req = mockRequest<InboxListParams>({ params: {} });
      await validateRequest(req, buildListRssValidationChain());

      // when
      await controller.listRss(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith('pages/403');
    });

    const mockParsedEmail = (from: string, subject: string): ParsedEmail => ({
      from: [{ address: from, user: from }],
      to: [],
      cc: [],
      bcc: [],
      subject,
      body: '',
      received: new Date('Thu, 22 May 2025 09:26:56 GMT'),
    });

    test('should render an RSS feed with emails', async () => {
      // given
      const req = mockRequest<InboxListParams>({ params: { username } });
      await validateRequest(req, buildListRssValidationChain());
      // and
      MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({
        Items: [{ Id: id1 }, { Id: id2 }],
      });
      MockedS3FileSystem.mockGetObjects.mockResolvedValueOnce([
        { Body: { transformToString: jest.fn().mockResolvedValue('raw1') } },
        { Body: { transformToString: jest.fn().mockResolvedValue('raw2') } },
      ]);
      MockedEmailParser.mockParseEmail
        .mockResolvedValueOnce(mockParsedEmail('a', 'b'))
        .mockResolvedValueOnce(mockParsedEmail('c', 'd'));

      // when
      await controller.listRss(req, res);
      // then
      expect(MockedEmailDatabase.mockListEmails).toHaveBeenCalledWith(normalizedUsername);
      expect(MockedS3FileSystem.mockGetObjects).toHaveBeenCalledWith('bucket', [id1, id2]);
      // and
      expect(res.type).toHaveBeenCalledWith('application/rss+xml');
      expect(res.send).toHaveBeenCalledWith(
        '<?xml version="1.0" encoding="utf-8"?>\n' +
          '<rss version="2.0">\n' +
          '    <channel>\n' +
          '        <title>Dispose Me</title>\n' +
          '        <link>https://example.com/inbox/username?x-api-key=header-token</link>\n' +
          '        <description>Dispose Me is a simple AWS-hosted disposable email service.</description>\n' +
          '        <lastBuildDate>Thu, 22 May 2025 09:26:56 GMT</lastBuildDate>\n' +
          '        <docs>https://validator.w3.org/feed/docs/rss2.html</docs>\n' +
          '        <generator>Dispose Me</generator>\n' +
          '        <copyright>Dispose Me</copyright>\n' +
          '        <item>\n' +
          '            <title><![CDATA[b]]></title>\n' +
          '            <link>https://example.com/inbox/username/id1?x-api-key=header-token</link>\n' +
          '            <guid>id1</guid>\n' +
          '            <pubDate>Thu, 22 May 2025 09:26:56 GMT</pubDate>\n' +
          '            <author>a (a)</author>\n' +
          '        </item>\n' +
          '        <item>\n' +
          '            <title><![CDATA[d]]></title>\n' +
          '            <link>https://example.com/inbox/username/id2?x-api-key=header-token</link>\n' +
          '            <guid>id2</guid>\n' +
          '            <pubDate>Thu, 22 May 2025 09:26:56 GMT</pubDate>\n' +
          '            <author>c (c)</author>\n' +
          '        </item>\n' +
          '    </channel>\n' +
          '</rss>',
      );
    });

    test('should handle empty emails list gracefully', async () => {
      // given
      const req = mockRequest<InboxListParams>({ params: { username } });
      await validateRequest(req, buildListRssValidationChain());
      // and
      jest.useFakeTimers().setSystemTime(new Date('Sun, 01 Jan 2023 01:01:01 GMT'));
      // and
      MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({ Items: [] });
      MockedS3FileSystem.mockGetObjects.mockResolvedValueOnce([]);

      // when
      await controller.listRss(req, res);
      // then
      expect(res.type).toHaveBeenCalledWith('application/rss+xml');
      expect(res.send).toHaveBeenCalledWith(
        '<?xml version="1.0" encoding="utf-8"?>\n' +
          '<rss version="2.0">\n' +
          '    <channel>\n' +
          '        <title>Dispose Me</title>\n' +
          '        <link>https://example.com/inbox/username?x-api-key=header-token</link>\n' +
          '        <description>Dispose Me is a simple AWS-hosted disposable email service.</description>\n' +
          '        <lastBuildDate>Sun, 01 Jan 2023 01:01:01 GMT</lastBuildDate>\n' +
          '        <docs>https://validator.w3.org/feed/docs/rss2.html</docs>\n' +
          '        <generator>Dispose Me</generator>\n' +
          '        <copyright>Dispose Me</copyright>\n' +
          '    </channel>\n' +
          '</rss>',
      );
    });

    test('should skip null/failed parses and still return valid RSS', async () => {
      // given
      const req = mockRequest<InboxListParams>({ params: { username } });
      await validateRequest(req, buildListRssValidationChain());
      // and
      MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({
        Items: [{ Id: id1 }, { Id: id2 }],
      });
      MockedS3FileSystem.mockGetObjects.mockResolvedValueOnce([
        { Body: { transformToString: jest.fn().mockResolvedValue('raw1') } },
        { Body: { transformToString: jest.fn().mockResolvedValue('raw2') } },
      ]);
      MockedEmailParser.mockParseEmail
        .mockResolvedValueOnce(mockParsedEmail('a', 'b'))
        .mockResolvedValueOnce(null);

      // when
      await controller.listRss(req, res);
      // then
      expect(res.type).toHaveBeenCalledWith('application/rss+xml');
      expect(res.send).toHaveBeenCalledWith(
        '<?xml version="1.0" encoding="utf-8"?>\n' +
          '<rss version="2.0">\n' +
          '    <channel>\n' +
          '        <title>Dispose Me</title>\n' +
          '        <link>https://example.com/inbox/username?x-api-key=header-token</link>\n' +
          '        <description>Dispose Me is a simple AWS-hosted disposable email service.</description>\n' +
          '        <lastBuildDate>Thu, 22 May 2025 09:26:56 GMT</lastBuildDate>\n' +
          '        <docs>https://validator.w3.org/feed/docs/rss2.html</docs>\n' +
          '        <generator>Dispose Me</generator>\n' +
          '        <copyright>Dispose Me</copyright>\n' +
          '        <item>\n' +
          '            <title><![CDATA[b]]></title>\n' +
          '            <link>https://example.com/inbox/username/id1?x-api-key=header-token</link>\n' +
          '            <guid>id1</guid>\n' +
          '            <pubDate>Thu, 22 May 2025 09:26:56 GMT</pubDate>\n' +
          '            <author>a (a)</author>\n' +
          '        </item>\n' +
          '    </channel>\n' +
          '</rss>',
      );
    });
  });

  describe('Error Response Methods', () => {
    test('render the 403 page as HTML by default', () => {
      // given
      const req = mockRequest({ query: {} });

      // when
      controller.render403Response(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith('pages/403');
    });

    test('render the 403 page as HTML', () => {
      // given
      const req = mockRequest({ query: { type: 'html' } });

      // when
      controller.render403Response(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith('pages/403');
    });

    test('render the 403 page as JSON', () => {
      // given
      const req = mockRequest({ query: { type: 'json' } });

      // when
      controller.render403Response(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'You are not allowed to visit that page.' });
    });

    test('render the 404 page as HTML by default', () => {
      // given
      const req = mockRequest({ query: {} });

      // when
      controller.render404Response(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith('pages/404');
    });

    test('render the 404 page as HTML', () => {
      // given
      const req = mockRequest({ query: { type: 'html' } });

      // when
      controller.render404Response(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith('pages/404');
    });

    test('render the 404 page as JSON', () => {
      // given
      const req = mockRequest({ query: { type: 'json' } });
      // when
      controller.render404Response(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'The page you are looking for was not found.',
      });
    });

    test('render the 500 page as HTML by default', () => {
      // given
      const req = mockRequest({ query: {} });
      const error = new Error('some error');

      // when
      controller.render500Response(error, req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('pages/error', { error });
    });

    test('render the 500 page as HTML', () => {
      // given
      const req = mockRequest({ query: { type: 'html' } });
      const error = new Error('some error');

      // when
      controller.render500Response(error, req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('pages/error', { error });
    });

    test('render the 500 page as JSON', () => {
      // given
      const req = mockRequest({ query: { type: 'json' } });
      const error = new Error('some error');

      // when
      controller.render500Response(error, req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'some error' });
    });
  });
});
