import 'source-map-support/register';

import * as express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { query } from 'express-validator';
import * as serverless from 'serverless-http';

import { InboxController } from './api/InboxController';
import log from './tools/log';

const inboxController = new InboxController(process.env.EMAIL_BUCKET_NAME ?? '');
const app = express();

// Since Express doesn't support error handling of promises out of the box,
// this handler enables that
const asyncHandler =
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  (fn: any) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch((error) => {
      next(error);
    });

const buildInboxRequestValidator = () => {
  let blacklist: string[] = [];
  try {
    if (process.env.INBOX_BLACKLIST) {
      blacklist = process.env.INBOX_BLACKLIST.split(',');
    }
  } catch (err) {
    log.error('Unable to parse INBOX_BLACKLIST', err);
  }
  return query('query').not().isIn(blacklist);
};

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.use((req, res, next) => {
  res.locals.query = req.query;
  res.locals.params = req.params;
  res.locals.url = req.originalUrl;
  res.locals.req = req;

  next();
});

app.set('view engine', 'ejs');
app.engine('ejs', require('ejs').__express); // workaround for webpack tree-shaking ejs out

app.get('/', asyncHandler(inboxController.index));
app.post('/', asyncHandler(inboxController.auth));
app.get('/logout', asyncHandler(inboxController.logout));

app.get('/inbox/latest', buildInboxRequestValidator(), asyncHandler(inboxController.latest));
app.get('/inbox/:id', buildInboxRequestValidator(), asyncHandler(inboxController.show));
app.get('/inbox', buildInboxRequestValidator(), asyncHandler(inboxController.list));

app.all('*', (req, res) => {
  inboxController.render404Response(req, res);
});

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
app.use((err: any, req: any, res: any, _: any) => {
  log.error(err.stack);
  inboxController.render500Response(err, req, res);
});

export const handler = serverless(app);
