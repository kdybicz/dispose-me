/* eslint-disable no-case-declarations */
/* eslint-disable no-console */

import express, { NextFunction, Request, Response } from 'express';
import { checkSchema } from 'express-validator';
import serverless from 'serverless-http';

import { InboxController } from './controllers/InboxController';
import { requestSchema } from './tools/validators';

import 'source-map-support/register';

const controller = new InboxController(process.env.BUCKET_NAME);
const app = express();

// Since Express doesn't support error handling of promises out of the box,
// this handler enables that
const asyncHandler = (fn) => (req: Request, res: Response, next: NextFunction) => Promise
  .resolve(fn(req, res, next))
  .catch((error) => {
    res.status(error.status || 500);
    res.json({ error: error.message || 'Unknown error' });
  });

app.use(express.json());

app.use(express.urlencoded({
  extended: true,
}));

app.use((req, res, next) => {
  res.locals.query = req.query;
  res.locals.url = req.originalUrl;
  res.locals.req = req;

  next();
});

app.set('view engine', 'ejs');

app.get('/inbox/latest', checkSchema(requestSchema), asyncHandler(controller.latest));

app.get('/inbox', checkSchema(requestSchema), asyncHandler(controller.list));

app.use((_req, res, _next) => {
  res.status(404).render('pages/404');
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).render('pages/error', { error: err });
});

export const handler = serverless(app);
