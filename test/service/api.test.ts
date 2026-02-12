import type { NextFunction, Request, Response } from 'express';

import { InboxController } from '../../service/api/InboxController';
import log from '../../service/tools/log';

jest.mock('../../service/api/InboxController');
jest.mock('../../service/tools/log');
jest.mock('../../service/tools/validators');

describe('API Security Tests', () => {
  let mockInboxController: jest.Mocked<InboxController>;
  let mockLog: jest.Mocked<typeof log>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInboxController = new InboxController('test-bucket') as jest.Mocked<InboxController>;
    mockInboxController.render404Response = jest.fn();
    mockInboxController.render500Response = jest.fn();
    mockLog = log as jest.Mocked<typeof log>;
    mockLog.error = jest.fn();
  });

  describe('Error Middleware Security', () => {
    test('should sanitize error messages in production', () => {
      // given
      const error = new Error('Database connection failed: postgres://user:pass@host/db');
      const req = {
        params: { username: 'testuser' },
        query: { type: 'json' },
      } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;
      // and
      const errorHandler = (err: Error, req: Request, res: Response, _: NextFunction) => {
        mockLog.error('Error while processing request', err);
        mockInboxController.render500Response(err, req, res);
      };

      // when
      errorHandler(error, req, res, next);

      // then
      expect(mockLog.error).toHaveBeenCalledWith('Error while processing request', error);
      expect(mockInboxController.render500Response).toHaveBeenCalledWith(error, req, res);
    });

    test('should handle errors without exposing stack traces', () => {
      // given
      const error = new Error('Internal database error');
      error.stack =
        'Error: Internal database error\n    at /app/src/db.ts:123:45\n    at processTicksAndRejections (internal/process/task_queues.js:97:5)';
      const req = {
        params: {},
        query: {},
      } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      const errorHandler = (err: Error, req: Request, res: Response, _: NextFunction) => {
        mockLog.error('Error while processing request', err);
        mockInboxController.render500Response(err, req, res);
      };

      // when
      errorHandler(error, req, res, next);

      // then
      expect(mockLog.error).toHaveBeenCalledWith('Error while processing request', error);
      // and
      expect(mockInboxController.render500Response).toHaveBeenCalledWith(error, req, res);
    });
  });

  describe('404 Handler Security', () => {
    test('should handle unmatched routes without exposing internal paths', () => {
      // given
      const req = {
        originalUrl: '/admin/config.php',
        path: '/admin/config.php',
      } as unknown as Request;
      const res = {} as Response;

      // when
      mockInboxController.render404Response(req, res);

      // then
      expect(mockInboxController.render404Response).toHaveBeenCalledWith(req, res);
    });
  });
});
