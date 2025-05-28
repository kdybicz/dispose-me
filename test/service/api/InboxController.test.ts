import type { Response } from 'express';
import {
  type InboxAuthBody,
  InboxController,
  type InboxEmailParams,
  type InboxListParams,
} from '../../../service/api/InboxController';
import {
  AUTH_BODY_KEY,
  AUTH_COOKIE_KEY,
  AUTH_QUERY_KEY,
  REMEMBER_COOKIE_KEY,
} from '../../../service/tools/const';
import {
  BODY_TOKEN,
  COOKIE_TOKEN,
  HEADER_TOKEN,
  INVALID_TOKEN,
  INVALID_USERNAME,
  MockedEmailDatabase,
  MockedEmailParser,
  MockedS3FileSystem,
  mockParsedEmail,
  mockRequest,
  mockResponse,
  QUERY_TOKEN,
  MESSAGE_ID,
  USERNAME,
  validateRequest,
} from '../../utils';
import {
  buildAuthValidationChain,
  buildDeleteEmailValidationChain,
  buildDownloadEmailAttachmentValidationChain,
  buildDownloadEmailValidationChain,
  buildInboxValidationChain,
  buildIndexValidationChain,
  buildLatestEmailValidationChain,
  buildListEmailsValidationChain,
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
      await validateRequest(req, buildIndexValidationChain());

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
      await validateRequest(req, buildIndexValidationChain());

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
      await validateRequest(req, buildIndexValidationChain());

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
      await validateRequest(req, buildIndexValidationChain());

      // when
      await controller.index(req, res);
      // then
      expect(res.redirect).toHaveBeenCalledWith('/inbox');
    });
  });

  describe('auth()', () => {
    test('should return 422 and rerender index if the token is invalid', async () => {
      // given
      const req = mockRequest<Record<string, never>, InboxAuthBody>({
        body: { [AUTH_BODY_KEY]: INVALID_TOKEN, remember: 'on' },
      });
      await validateRequest(req, buildAuthValidationChain());

      // when
      await controller.auth(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.render).toHaveBeenCalledWith('pages/index', {
        errors: [
          expect.objectContaining({
            msg: 'The token must contain only letters and numbers (no special characters).',
          }),
          expect.objectContaining({ msg: 'The token must be between 20 and 50 characters long.' }),
        ],
      });
    });

    test('sets cookies and redirects to inbox if remember is true', async () => {
      // given
      const remember = 'on';
      // and
      const req = mockRequest<Record<string, never>, InboxAuthBody>({
        body: { [AUTH_BODY_KEY]: BODY_TOKEN, remember },
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
      expect(res.cookie).toHaveBeenCalledWith(AUTH_COOKIE_KEY, BODY_TOKEN, {
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
        body: { [AUTH_BODY_KEY]: BODY_TOKEN, remember },
      });
      await validateRequest(req, buildAuthValidationChain());

      // when
      await controller.auth(req, res);
      // then
      expect(res.cookie).toHaveBeenCalledWith(AUTH_COOKIE_KEY, BODY_TOKEN, {
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
    test.each([
      [undefined, 1],
      [INVALID_USERNAME, 2],
    ])(
      'should return 422 if username is missing or invalid',
      async (invalidUsername, expectedErrors) => {
        // given
        const req = mockRequest<InboxEmailParams>({
          params: { username: invalidUsername, id: MESSAGE_ID },
        });
        const errors = await validateRequest(req, buildShowEmailValidationChain());

        // when
        await controller.show(req, res);
        // then
        expect(errors).toHaveLength(expectedErrors);
        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.render).toHaveBeenCalledWith('pages/422', { errors });
      },
    );

    test('should return 422 if token is invalid', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username: USERNAME, id: MESSAGE_ID },
        query: { [AUTH_QUERY_KEY]: INVALID_TOKEN },
      });
      const errors = await validateRequest(req, buildShowEmailValidationChain());

      // when
      await controller.show(req, res);
      // then
      expect(errors).toHaveLength(2);
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.render).toHaveBeenCalledWith('pages/422', { errors });
    });

    test.each([[undefined], ['html']])(
      'should return 404 as HTML if email does not exist',
      async (type) => {
        // given
        const req = mockRequest<InboxEmailParams>({
          params: { username: USERNAME, id: MESSAGE_ID },
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
        params: { username: USERNAME, id: MESSAGE_ID },
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
        params: { username: USERNAME, id: MESSAGE_ID },
        query: { type },
      });
      await validateRequest(req, buildShowEmailValidationChain());
      // and
      MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(true);
      MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
        Body: { transformToString: jest.fn().mockResolvedValueOnce('raw-email') },
      });
      MockedEmailParser.mockParseEmail.mockResolvedValueOnce({ from: 'a', subject: 'b' });

      // when
      await controller.show(req, res);
      // then
      expect(res.render).toHaveBeenCalledWith('pages/email', {
        email: expect.objectContaining({ id: MESSAGE_ID }),
        token: HEADER_TOKEN,
      });
    });

    test('should return email details as JSON', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username: USERNAME, id: MESSAGE_ID },
        query: { type: 'json' },
      });
      await validateRequest(req, buildShowEmailValidationChain());
      // and
      MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(true);
      MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
        Body: { transformToString: jest.fn().mockResolvedValueOnce('raw-email') },
      });
      MockedEmailParser.mockParseEmail.mockResolvedValueOnce({ from: 'a', subject: 'b' });

      // when
      await controller.show(req, res);
      // then
      expect(res.json).toHaveBeenCalledWith({ email: expect.objectContaining({ id: MESSAGE_ID }) });
    });

    test.each([[undefined], ['html']])(
      'should return 500 as HTML if S3 or parser fails',
      async (type) => {
        // given
        const req = mockRequest<InboxEmailParams>({
          params: { username: USERNAME, id: MESSAGE_ID },
          query: { type },
        });
        await validateRequest(req, buildShowEmailValidationChain());
        // and
        MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(true);
        MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
          Body: { transformToString: jest.fn().mockResolvedValueOnce(undefined) },
        });

        // when
        await controller.show(req, res);
        // then
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.render).toHaveBeenCalledWith('pages/error', {
          error: new Error('Email content not found!'),
        });
      },
    );

    test('should return 500 as JSON if S3 or parser fails', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username: USERNAME, id: MESSAGE_ID },
        query: { type: 'json' },
      });
      await validateRequest(req, buildShowEmailValidationChain());
      // and
      MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(true);
      MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
        Body: { transformToString: jest.fn().mockResolvedValueOnce(undefined) },
      });

      // when
      await controller.show(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email content not found!' });
    });
  });

  describe('download()', () => {
    test.each([
      [undefined, 1],
      [INVALID_USERNAME, 2],
    ])(
      'should return 422 if username is missing or invalid',
      async (invalidUsername, expectedErrors) => {
        // given
        const req = mockRequest<InboxEmailParams>({
          params: { username: invalidUsername, id: MESSAGE_ID },
        });
        const errors = await validateRequest(req, buildDownloadEmailValidationChain());

        // when
        await controller.download(req, res);
        // then
        expect(errors).toHaveLength(expectedErrors);
        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.render).toHaveBeenCalledWith('pages/422', { errors });
      },
    );

    test('should return 422 if token is invalid', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username: USERNAME, id: MESSAGE_ID },
        query: { [AUTH_QUERY_KEY]: INVALID_TOKEN },
      });
      const errors = await validateRequest(req, buildDownloadEmailValidationChain());

      // when
      await controller.download(req, res);
      // then
      expect(errors).toHaveLength(2);
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.render).toHaveBeenCalledWith('pages/422', { errors });
    });

    test('should return 404 if email does not exist', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({ params: { username: USERNAME, id: MESSAGE_ID } });
      await validateRequest(req, buildDownloadEmailValidationChain());
      // and
      MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(false);

      // when
      await controller.download(req, res);
      // then
      expect(res.render).toHaveBeenCalledWith('pages/404');
    });

    test('should set headers and download file name if the email exists', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({ params: { username: USERNAME, id: MESSAGE_ID } });
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
        `attachment; filename=${MESSAGE_ID}.eml`,
      );
      expect(res.type).toHaveBeenCalledWith('application/octet-stream');
      expect(res.send).toHaveBeenCalledWith('raw-email-data');
    });

    test('should return 500 if S3 object has no body', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({ params: { username: USERNAME, id: MESSAGE_ID } });
      await validateRequest(req, buildDownloadEmailValidationChain());
      // and
      MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(true);
      MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
        Body: { transformToString: jest.fn().mockResolvedValueOnce(undefined) },
      });

      // when
      await controller.download(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('pages/error', {
        error: new Error('Email content not found!'),
      });
    });
  });

  describe('downloadAttachment()', () => {
    const filename = 'attachment.txt';

    test.each([
      [undefined, 1],
      [INVALID_USERNAME, 2],
    ])(
      'should return 422 if username is missing or invalid',
      async (invalidUsername, expectedErrors) => {
        // given
        const req = mockRequest<InboxEmailParams>({
          params: { username: invalidUsername, id: MESSAGE_ID },
          query: { filename },
        });
        const errors = await validateRequest(req, buildDownloadEmailAttachmentValidationChain());

        // when
        await controller.downloadAttachment(req, res);
        // then
        expect(errors).toHaveLength(expectedErrors);
        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.render).toHaveBeenCalledWith('pages/422', { errors });
      },
    );

    test('should return 422 if token is invalid', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username: USERNAME, id: MESSAGE_ID },
        query: { [AUTH_QUERY_KEY]: INVALID_TOKEN, filename },
      });
      const errors = await validateRequest(req, buildDownloadEmailAttachmentValidationChain());

      // when
      await controller.downloadAttachment(req, res);
      // then
      expect(errors).toHaveLength(2);
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.render).toHaveBeenCalledWith('pages/422', { errors });
    });

    test('should return 422 if filename is invalid', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username: USERNAME, id: MESSAGE_ID },
        query: { filename: '' },
      });
      const errors = await validateRequest(req, buildDownloadEmailAttachmentValidationChain());

      // when
      await controller.downloadAttachment(req, res);
      // then
      expect(errors).toHaveLength(1);
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.render).toHaveBeenCalledWith('pages/422', { errors });
    });

    test('should return 404 if email does not exist', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username: USERNAME, id: MESSAGE_ID },
        query: { filename },
      });
      await validateRequest(req, buildDownloadEmailAttachmentValidationChain());
      // and
      MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(false);

      // when
      await controller.downloadAttachment(req, res);
      // then
      expect(res.render).toHaveBeenCalledWith('pages/404');
    });

    test('should return 500 if S3 object has no body', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username: USERNAME, id: MESSAGE_ID },
        query: { filename },
      });
      await validateRequest(req, buildDownloadEmailAttachmentValidationChain());
      // and
      MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(true);
      MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
        Body: { transformToString: jest.fn().mockResolvedValueOnce(undefined) },
      });

      // when
      await controller.downloadAttachment(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('pages/error', {
        error: new Error('Email content not found!'),
      });
    });

    test('should return 500 if attachment with given filename not found', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username: USERNAME, id: MESSAGE_ID },
        query: { filename },
      });
      await validateRequest(req, buildDownloadEmailAttachmentValidationChain());
      // and
      MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(true);
      MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
        Body: { transformToString: jest.fn().mockResolvedValueOnce('raw-email-data') },
      });
      MockedEmailParser.mockParseEmail.mockResolvedValueOnce({
        attachments: [{ filename: 'not-matching-name.txt' }],
      });

      // when
      await controller.downloadAttachment(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('pages/error', {
        error: new Error('Email attachment not found!'),
      });
    });

    test('should set headers and download file name if the attachment exists', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username: USERNAME, id: MESSAGE_ID },
        query: { filename },
      });
      await validateRequest(req, buildDownloadEmailAttachmentValidationChain());
      // and
      MockedEmailDatabase.mockEmailExist.mockResolvedValueOnce(true);
      MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
        Body: { transformToString: jest.fn().mockResolvedValue('raw-email-data') },
      });
      // and
      const contentType = 'text/html; charset=utf-8';
      const content = Buffer.from('attachment data');
      MockedEmailParser.mockParseEmail.mockResolvedValueOnce({
        attachments: [{ filename, contentType, content }],
      });

      // when
      await controller.downloadAttachment(req, res);
      // then
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-disposition',
        `attachment; filename=${filename}`,
      );
      expect(res.type).toHaveBeenCalledWith(contentType);
      expect(res.send).toHaveBeenCalledWith(content);
    });
  });

  describe('delete()', () => {
    test.each([
      [undefined, 1],
      [INVALID_USERNAME, 2],
    ])(
      'should return 422 if username is missing or invalid',
      async (invalidUsername, expectedErrors) => {
        // given
        const req = mockRequest<InboxEmailParams>({
          params: { username: invalidUsername, id: MESSAGE_ID },
        });
        const errors = await validateRequest(req, buildDeleteEmailValidationChain());

        // when
        await controller.delete(req, res);
        // then
        expect(errors).toHaveLength(expectedErrors);
        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.render).toHaveBeenCalledWith('pages/422', { errors });
      },
    );

    test('should return 422 if token is invalid', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username: USERNAME, id: MESSAGE_ID },
        query: { [AUTH_QUERY_KEY]: INVALID_TOKEN },
      });
      const errors = await validateRequest(req, buildDeleteEmailValidationChain());

      // when
      await controller.delete(req, res);
      // then
      expect(errors).toHaveLength(2);
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.render).toHaveBeenCalledWith('pages/422', { errors });
    });

    test('should redirect to inbox if deletion is successful', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username: USERNAME, id: MESSAGE_ID },
      });
      await validateRequest(req, buildDeleteEmailValidationChain());
      // and
      MockedEmailDatabase.mockDeleteEmail.mockResolvedValueOnce(true);

      // when
      await controller.delete(req, res);
      // then
      expect(MockedEmailDatabase.mockDeleteEmail).toHaveBeenCalledWith(USERNAME, MESSAGE_ID);
      // and
      expect(res.redirect).toHaveBeenCalledWith(
        `/inbox/${USERNAME}?${new URLSearchParams(req.query as Record<string, string>)}`,
      );
    });

    test('should return 404 if deletion is unsuccessful', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username: USERNAME, id: MESSAGE_ID },
      });
      await validateRequest(req, buildDeleteEmailValidationChain());
      // and
      MockedEmailDatabase.mockDeleteEmail.mockResolvedValueOnce(false);

      // when
      await controller.delete(req, res);
      // then
      expect(MockedEmailDatabase.mockDeleteEmail).toHaveBeenCalledWith(USERNAME, MESSAGE_ID);
      // and
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith('pages/404');
    });
  });

  describe('latest()', () => {
    const sentAfter = '123456789';

    test.each([
      [undefined, 1],
      [INVALID_USERNAME, 2],
    ])(
      'should return 422 if username is missing or invalid',
      async (invalidUsername, expectedErrors) => {
        // given
        const req = mockRequest<InboxEmailParams>({
          params: { username: invalidUsername, id: MESSAGE_ID },
        });
        const errors = await validateRequest(req, buildLatestEmailValidationChain());

        // when
        await controller.latest(req, res);
        // then
        expect(errors).toHaveLength(expectedErrors);
        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.render).toHaveBeenCalledWith('pages/422', { errors });
      },
    );

    test('should return 422 if token is invalid', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username: USERNAME, id: MESSAGE_ID },
        query: { [AUTH_QUERY_KEY]: INVALID_TOKEN },
      });
      const errors = await validateRequest(req, buildLatestEmailValidationChain());

      // when
      await controller.latest(req, res);
      // then
      expect(errors).toHaveLength(2);
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.render).toHaveBeenCalledWith('pages/422', { errors });
    });

    test('should render last email even if it is not found - to be fixed', async () => {
      // given
      const req = mockRequest<InboxListParams>({
        params: { username: USERNAME },
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
        token: HEADER_TOKEN,
      });
    });

    test.each([[undefined], ['html']])(
      'should render latest email as HTML if found',
      async (type) => {
        // given
        const req = mockRequest<InboxListParams>({
          params: { username: USERNAME },
          query: { sentAfter, type },
        });
        await validateRequest(req, buildLatestEmailValidationChain());
        // and
        MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({ Items: [{ Id: MESSAGE_ID }] });
        MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
          Body: { transformToString: jest.fn().mockResolvedValue('raw-email') },
        });
        MockedEmailParser.mockParseEmail.mockResolvedValueOnce({ from: 'a', subject: 'b' });

        // when
        await controller.latest(req, res);
        // then
        expect(res.render).toHaveBeenCalledWith('pages/email', {
          email: expect.objectContaining({ id: MESSAGE_ID }),
          token: HEADER_TOKEN,
        });
      },
    );

    test('should return latest email as JSON if found and type=json', async () => {
      // given
      const req = mockRequest<InboxListParams>({
        params: { username: USERNAME },
        query: { sentAfter, type: 'json' },
      });
      await validateRequest(req, buildLatestEmailValidationChain());
      // and
      MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({ Items: [{ Id: MESSAGE_ID }] });
      MockedS3FileSystem.mockGetObject.mockResolvedValueOnce({
        Body: { transformToString: jest.fn().mockResolvedValue('raw-email') },
      });
      MockedEmailParser.mockParseEmail.mockResolvedValueOnce({ from: 'a', subject: 'b' });

      // when
      await controller.latest(req, res);
      // then
      expect(res.json).toHaveBeenCalledWith({
        email: expect.objectContaining({ id: MESSAGE_ID }),
      });
    });

    test.each([[undefined], ['html']])(
      'should return empty email details as HTML when email body not found',
      async (type) => {
        // given
        const req = mockRequest<InboxEmailParams>({
          params: { username: USERNAME },
          query: { type },
        });
        await validateRequest(req, buildLatestEmailValidationChain());
        // and
        MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({ Items: [{ Id: MESSAGE_ID }] });
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

    test('should return empty email details as JSON when email body not found', async () => {
      // given
      const req = mockRequest<InboxEmailParams>({
        params: { username: USERNAME },
        query: { type: 'json' },
      });
      await validateRequest(req, buildLatestEmailValidationChain());
      // and
      MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({ Items: [{ Id: MESSAGE_ID }] });
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
  });

  describe('inbox()', () => {
    test('should render inbox page as HTML by default', async () => {
      // given
      const req = mockRequest<InboxListParams>({
        query: {},
      });
      await validateRequest(req, buildInboxValidationChain());

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
      await validateRequest(req, buildInboxValidationChain());

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
      await validateRequest(req, buildInboxValidationChain());

      // when
      await controller.inbox(req, res);
      // then
      expect(res.json).toHaveBeenCalledWith({});
    });
  });

  describe('list()', () => {
    const sentAfter = '123456789';
    const limit = '15';

    test('should return 422 and rerender inbox if the username is invalid', async () => {
      // given
      const req = mockRequest<InboxListParams>({
        params: { username: INVALID_USERNAME },
      });
      await validateRequest(req, buildListEmailsValidationChain());

      // when
      await controller.list(req, res);
      // then
      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.render).toHaveBeenCalledWith('pages/inbox', {
        errors: [
          expect.objectContaining({
            msg: 'Username may only contain letters, numbers, dots (.), hyphens (-), underscores (_), and plus signs (+).',
          }),
          expect.objectContaining({ msg: 'Username must be between 3 and 25 characters long.' }),
        ],
      });
    });

    test.each([[undefined], ['html']])('renders email list as html', async (type) => {
      // given
      const req = mockRequest<InboxListParams>({
        query: { sentAfter, limit, type },
        params: { username: USERNAME },
      });
      await validateRequest(req, buildListEmailsValidationChain());
      // and
      MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({ Items: [] });

      // when
      await controller.list(req, res);
      // then
      expect(MockedEmailDatabase.mockListEmails).toHaveBeenCalledWith(
        USERNAME,
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
        params: { username: USERNAME },
      });
      await validateRequest(req, buildListEmailsValidationChain());
      // and
      MockedEmailDatabase.mockListEmails.mockResolvedValueOnce({ Items: [] });

      // when
      await controller.list(req, res);
      // then
      expect(MockedEmailDatabase.mockListEmails).toHaveBeenCalledWith(
        USERNAME,
        Number.parseInt(sentAfter),
        Number.parseInt(limit),
      );
      expect(res.json).toHaveBeenCalledWith({ emails: [] });
    });
  });

  describe('listRss()', () => {
    const normalizedUsername = USERNAME;
    const id1 = 'id1';
    const id2 = 'id2';

    test.each([
      [undefined, undefined, 3],
      [undefined, INVALID_TOKEN, 3],
      [INVALID_USERNAME, undefined, 4],
      [INVALID_USERNAME, INVALID_TOKEN, 4],
    ])(
      'should return 422 if username and/or token are missing or invalid',
      async (invalidUsername, invalidToken, expectedErrors) => {
        // given
        const req = mockRequest<InboxListParams>({
          params: { username: invalidUsername },
          query: { [AUTH_QUERY_KEY]: invalidToken },
        });
        const errors = await validateRequest(req, buildListRssValidationChain());

        // when
        await controller.listRss(req, res);
        // then
        expect(errors).toHaveLength(expectedErrors);
        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.render).toHaveBeenCalledWith('pages/422', { errors });
      },
    );

    test('should render an RSS feed with emails', async () => {
      // given
      const req = mockRequest<InboxListParams>({
        params: { username: USERNAME },
        query: { [AUTH_QUERY_KEY]: QUERY_TOKEN },
      });
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
        .mockResolvedValueOnce(mockParsedEmail('user_a@example.com', 'Subject a'))
        .mockResolvedValueOnce(mockParsedEmail('user_b@example.com', 'Subject b'));

      // when
      await controller.listRss(req, res);
      // then
      expect(MockedEmailDatabase.mockListEmails).toHaveBeenCalledWith(normalizedUsername);
      expect(MockedS3FileSystem.mockGetObjects).toHaveBeenCalledWith('bucket', [id1, id2]);
      // and
      expect(res.type).toHaveBeenCalledWith('application/rss+xml');
      expect(res.send).toHaveBeenCalledWith(
        // biome-ignore lint/style/useTemplate: <explanation>
        '<?xml version="1.0" encoding="utf-8"?>\n' +
          '<rss version="2.0">\n' +
          '    <channel>\n' +
          '        <title>Dispose Me</title>\n' +
          `        <link>https://example.com/inbox/username?${AUTH_QUERY_KEY}=${HEADER_TOKEN}</link>\n` +
          '        <description>Dispose Me is a simple AWS-hosted disposable email service.</description>\n' +
          '        <lastBuildDate>Thu, 22 May 2025 09:26:56 GMT</lastBuildDate>\n' +
          '        <docs>https://validator.w3.org/feed/docs/rss2.html</docs>\n' +
          '        <generator>Dispose Me</generator>\n' +
          '        <copyright>Dispose Me</copyright>\n' +
          '        <item>\n' +
          '            <title><![CDATA[Subject a]]></title>\n' +
          `            <link>https://example.com/inbox/username/id1?${AUTH_QUERY_KEY}=${HEADER_TOKEN}</link>\n` +
          '            <guid>id1</guid>\n' +
          '            <pubDate>Thu, 22 May 2025 09:26:56 GMT</pubDate>\n' +
          '            <author>user_a@example.com (Display Name)</author>\n' +
          '        </item>\n' +
          '        <item>\n' +
          '            <title><![CDATA[Subject b]]></title>\n' +
          `            <link>https://example.com/inbox/username/id2?${AUTH_QUERY_KEY}=${HEADER_TOKEN}</link>\n` +
          '            <guid>id2</guid>\n' +
          '            <pubDate>Thu, 22 May 2025 09:26:56 GMT</pubDate>\n' +
          '            <author>user_b@example.com (Display Name)</author>\n' +
          '        </item>\n' +
          '    </channel>\n' +
          '</rss>',
      );
    });

    test('should handle empty emails list gracefully', async () => {
      // given
      const req = mockRequest<InboxListParams>({
        params: { username: USERNAME },
        query: { [AUTH_QUERY_KEY]: QUERY_TOKEN },
      });
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
        // biome-ignore lint/style/useTemplate: <explanation>
        '<?xml version="1.0" encoding="utf-8"?>\n' +
          '<rss version="2.0">\n' +
          '    <channel>\n' +
          '        <title>Dispose Me</title>\n' +
          `        <link>https://example.com/inbox/username?${AUTH_QUERY_KEY}=${HEADER_TOKEN}</link>\n` +
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
      const req = mockRequest<InboxListParams>({
        params: { username: USERNAME },
        query: { [AUTH_QUERY_KEY]: QUERY_TOKEN },
      });
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
        .mockResolvedValueOnce(mockParsedEmail('user_a@example.com', 'Subject a'))
        .mockResolvedValueOnce(null);

      // when
      await controller.listRss(req, res);
      // then
      expect(res.type).toHaveBeenCalledWith('application/rss+xml');
      expect(res.send).toHaveBeenCalledWith(
        // biome-ignore lint/style/useTemplate: <explanation>
        '<?xml version="1.0" encoding="utf-8"?>\n' +
          '<rss version="2.0">\n' +
          '    <channel>\n' +
          '        <title>Dispose Me</title>\n' +
          `        <link>https://example.com/inbox/username?${AUTH_QUERY_KEY}=${HEADER_TOKEN}</link>\n` +
          '        <description>Dispose Me is a simple AWS-hosted disposable email service.</description>\n' +
          '        <lastBuildDate>Thu, 22 May 2025 09:26:56 GMT</lastBuildDate>\n' +
          '        <docs>https://validator.w3.org/feed/docs/rss2.html</docs>\n' +
          '        <generator>Dispose Me</generator>\n' +
          '        <copyright>Dispose Me</copyright>\n' +
          '        <item>\n' +
          '            <title><![CDATA[Subject a]]></title>\n' +
          `            <link>https://example.com/inbox/username/id1?${AUTH_QUERY_KEY}=${HEADER_TOKEN}</link>\n` +
          '            <guid>id1</guid>\n' +
          '            <pubDate>Thu, 22 May 2025 09:26:56 GMT</pubDate>\n' +
          '            <author>user_a@example.com (Display Name)</author>\n' +
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
