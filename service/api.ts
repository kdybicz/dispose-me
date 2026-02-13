import 'source-map-support/register';

import type { NextFunction, Request, Response } from 'express';
import * as express from 'express';
import helmet from 'helmet';
import * as serverless from 'serverless-http';
import { InboxController } from './api/InboxController';
import log from './tools/log';
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
} from './tools/validators';

const inboxController = new InboxController(process.env.EMAIL_BUCKET_NAME ?? '');
const app = express();

// Since Express doesn't support error handling of promises out of the box,
// this handler enables that
// biome-ignore lint/suspicious/noExplicitAny: Handler signature needs to work with various request types
const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch((error) => {
    next(error);
  });

// Security best practices for Express apps
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'cdn.jsdelivr.net',
          'cdnjs.cloudflare.com',
          'chancejs.com',
        ],
        connectSrc: ["'self'", 'cdn.jsdelivr.net', 'chancejs.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
        fontSrc: ["'self'", 'cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:'],
      },
    },
  }),
);
app.disable('x-powered-by');
app.set('trust proxy', true);

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  }),
);

// provide req properties to be used in EJS templates
app.use((req: Request, res: Response, next: NextFunction) => {
  res.locals.query = req.query;
  res.locals.url = req.originalUrl;
  res.locals.req = req;

  next();
});

app.set('view engine', 'ejs');
app.engine('ejs', require('ejs').__express); // workaround for webpack tree-shaking ejs out

app.get('/', ...buildIndexValidationChain(), asyncHandler(inboxController.index));
app.post('/', ...buildAuthValidationChain(), asyncHandler(inboxController.auth));
app.get('/logout', asyncHandler(inboxController.logout));

app.get(
  '/inbox/:username/latest',
  ...buildLatestEmailValidationChain(),
  asyncHandler(inboxController.latest),
);
app.get(
  '/inbox/:username/feed/',
  ...buildListRssValidationChain(),
  asyncHandler(inboxController.listRss),
);
app.get(
  '/inbox/:username/:id/delete',
  ...buildDeleteEmailValidationChain(),
  asyncHandler(inboxController.delete),
);
app.delete(
  '/inbox/:username/:id/delete',
  ...buildDeleteEmailValidationChain(),
  asyncHandler(inboxController.delete),
);
app.get(
  '/inbox/:username/:id/download',
  ...buildDownloadEmailValidationChain(),
  asyncHandler(inboxController.download),
);
app.get(
  '/inbox/:username/:id/attachment',
  ...buildDownloadEmailAttachmentValidationChain(),
  asyncHandler(inboxController.downloadAttachment),
);
app.get(
  '/inbox/:username/:id',
  ...buildShowEmailValidationChain(),
  asyncHandler(inboxController.show),
);
app.get(
  '/inbox/:username',
  ...buildListEmailsValidationChain(),
  asyncHandler(inboxController.list),
);
app.get('/inbox', ...buildInboxValidationChain(), asyncHandler(inboxController.inbox));

app.use((req: Request, res: Response, _: NextFunction) => {
  inboxController.render404Response(req, res);
});

app.use((err: Error, req: Request, res: Response, _: NextFunction) => {
  log.error('Error while processing request', err);
  inboxController.render500Response(err, req, res);
});

export const handler = serverless(app, { binary: process.env.AWS_SAM_LOCAL ? [] : ['*/*'] });
