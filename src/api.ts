/* eslint-disable no-case-declarations */
/* eslint-disable no-console */

import express, { NextFunction, Request, Response } from 'express';
import { checkSchema } from 'express-validator';
import serverless from 'serverless-http';

import { ApiController } from './controllers/ApiController';
import { requestSchema } from './tools/validators';

import 'source-map-support/register';

const controller = new ApiController(process.env.BUCKET_NAME);
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

app.get('/email/latest', checkSchema(requestSchema), asyncHandler(controller.latestEmail));

app.get('/email', checkSchema(requestSchema), asyncHandler(controller.listEmails));

export const handler = serverless(app);
