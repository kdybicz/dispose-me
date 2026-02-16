import 'source-map-support/register';

import * as path from 'node:path';

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
const assetDomain = process.env.ASSET_DOMAIN ?? '';
const app = express();

// Security best practices for Express apps
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com', 'chancejs.com'],
        connectSrc: ["'self'", 'chancejs.com'],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'fonts.googleapis.com',
          ...(assetDomain ? [assetDomain] : []),
        ],
        fontSrc: ["'self'", 'fonts.gstatic.com', ...(assetDomain ? [assetDomain] : [])],
        imgSrc: ["'self'", 'data:', ...(assetDomain ? [assetDomain] : [])],
      },
    },
  }),
);
app.disable('x-powered-by');
app.set('trust proxy', true);

// Serve static assets locally (fallback when CDN is not configured)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

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
  res.locals.assetDomain = assetDomain;

  next();
});

app.set('view engine', 'ejs');
app.engine('ejs', require('ejs').__express); // workaround for webpack tree-shaking ejs out

app.get('/', ...buildIndexValidationChain(), inboxController.index);
app.post('/', ...buildAuthValidationChain(), inboxController.auth);
app.get('/logout', inboxController.logout);

app.get('/inbox/:username/latest', ...buildLatestEmailValidationChain(), inboxController.latest);
app.get('/inbox/:username/feed/', ...buildListRssValidationChain(), inboxController.listRss);
app.get(
  '/inbox/:username/:id/delete',
  ...buildDeleteEmailValidationChain(),
  inboxController.delete,
);
app.delete(
  '/inbox/:username/:id/delete',
  ...buildDeleteEmailValidationChain(),
  inboxController.delete,
);
app.get(
  '/inbox/:username/:id/download',
  ...buildDownloadEmailValidationChain(),
  inboxController.download,
);
app.get(
  '/inbox/:username/:id/attachment',
  ...buildDownloadEmailAttachmentValidationChain(),
  inboxController.downloadAttachment,
);
app.get('/inbox/:username/:id', ...buildShowEmailValidationChain(), inboxController.show);
app.get('/inbox/:username', ...buildListEmailsValidationChain(), inboxController.list);
app.get('/inbox', ...buildInboxValidationChain(), inboxController.inbox);

app.use((req: Request, res: Response, _: NextFunction) => {
  inboxController.render404Response(req, res);
});

app.use((err: Error, req: Request, res: Response, _: NextFunction) => {
  log.error('Error while processing request', err);
  inboxController.render500Response(err, req, res);
});

export const handler = serverless(app, { binary: process.env.AWS_SAM_LOCAL ? [] : ['*/*'] });
