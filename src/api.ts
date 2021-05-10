import express, { NextFunction, Request, Response } from 'express';
import { query } from 'express-validator';
import serverless from 'serverless-http';

import { INBOX_BLACKLIST } from './config';
import { InboxController } from './controllers/InboxController';
import log from './tools/log';

import 'source-map-support/register';

const inboxController = new InboxController(process.env.EMAIL_BUCKET_NAME);
const app = express();

// Since Express doesn't support error handling of promises out of the box,
// this handler enables that
const asyncHandler = (fn) => (req: Request, res: Response, next: NextFunction) => Promise
  .resolve(fn(req, res, next))
  .catch((error) => {
    res.status(error.status || 500);
    res.json({ error: error.message || 'Unknown error' });
  });

const buildInboxRequestValidator = () => query('query').not().isIn(INBOX_BLACKLIST);

app.use(express.json());

app.use(express.urlencoded({
  extended: true,
}));

app.use((req, res, next) => {
  res.locals.query = req.query;
  res.locals.params = req.params;
  res.locals.url = req.originalUrl;
  res.locals.req = req;

  next();
});

app.set('view engine', 'ejs');

app.get('/', asyncHandler(inboxController.index));

app.get('/inbox/latest', buildInboxRequestValidator(), asyncHandler(inboxController.latest));
app.get('/inbox/:id', buildInboxRequestValidator(), asyncHandler(inboxController.show));
app.get('/inbox', buildInboxRequestValidator(), asyncHandler(inboxController.list));

app.use((req, res, _) => inboxController.render404Response(req, res));

app.use((err, req, res, _) => {
  log.error(err.stack);
  inboxController.render500Response(err, req, res);
});

export const handler = serverless(app);
