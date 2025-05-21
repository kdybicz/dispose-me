import { Request, type Response } from 'express';
import {
  InboxController,
  type InboxListParams,
  type InboxRequest,
} from '../../../service/api/InboxController';
import { EmailDatabase } from '../../../service/tools/EmailDatabase';
import { S3FileSystem } from '../../../service/tools/S3FileSystem';
import { EmailParser } from '../../../service/tools/EmailParser';
import { AUTH_HEADER_KEY } from '../../../service/tools/const';

jest.mock('../../../service/tools/EmailDatabase');
jest.mock('../../../service/tools/EmailParser');
jest.mock('../../../service/tools/S3FileSystem');

const HEADER_TOKEN = 'header-token';

type RequestArgs = {
  query: Record<string, undefined | string>;
  params: Record<string, string>;
};

const RequestArgsInit = {
  query: {},
  params: {},
};

const mockRequest = <P>(args: RequestArgs = RequestArgsInit): InboxRequest<P> => {
  const { query, params } = args;
  return {
    query,
    params,
    headersDistinct: { [AUTH_HEADER_KEY]: [HEADER_TOKEN] },
  } as unknown as InboxRequest<P>;
};

const mockResponse = (args: RequestArgs = RequestArgsInit): Response => {
  return {
    render: jest.fn(),
    json: jest.fn(),
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

describe('InboxController tests', () => {
  const bucketName = 'bucket';
  const controller = new InboxController(bucketName);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.each([
    [undefined],
    ['html'],
  ])('list emails as html', async (type) => {
    // given
    const username = 'username';
    const sentAfter = '123456789';
    const limit = '15';
    // and
    const req = mockRequest<InboxListParams>({
      query: { sentAfter, limit, type },
      params: { username },
    });
    const res = mockResponse();
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

  test('list emails as json', async () => {
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
    const res = mockResponse();
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
    expect(res.json).toHaveBeenCalledWith({"emails": []});
  });
});
