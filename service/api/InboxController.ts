import dayjs = require('dayjs');
import type { Request, Response } from 'express';
import { type ValidationError, matchedData, validationResult } from 'express-validator';

import { EmailDatabase } from '../tools/EmailDatabase';
import { EmailParser, type ParsedEmail } from '../tools/EmailParser';
import { S3FileSystem } from '../tools/S3FileSystem';
import { AUTH_COOKIE_KEY, AUTH_QUERY_KEY, REMEMBER_COOKIE_KEY } from '../tools/const';
import { mapEmailDetailsListToFeed } from '../tools/feed';
import log from '../tools/log';
import { getCookie, getToken, normalizeUsername } from '../tools/utils';
import { TYPE_DEFAULT } from '../tools/validators';

export interface InboxListParams extends Record<string, string> {
  username: string;
}

export interface InboxEmailParams extends InboxListParams {
  id: string;
}

export interface InboxQuery extends Record<string, undefined | string> {
  limit?: string;
  sendAfter?: string;
  type?: 'html' | 'json';
  [AUTH_QUERY_KEY]?: string;
}

export interface InboxAuthBody {
  token: string;
  remember: string;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface InboxRequest<P = Record<string, string>, B = any>
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  extends Request<P, any, B, InboxQuery> {}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
export type InboxResponse = Promise<Response<any> | void>;

export type EmailListItem = {
  id: string;
  from: string;
  subject: string;
  received: Date;
  hasAttachments: boolean;
};

export type EmailDetails = ParsedEmail & {
  id: string;
};

export class InboxController {
  protected bucketName: string;
  protected emailDatabase: EmailDatabase;
  protected emailParser: EmailParser;
  protected fileSystem: S3FileSystem;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
    this.emailDatabase = new EmailDatabase();
    this.emailParser = new EmailParser();
    this.fileSystem = new S3FileSystem();
  }

  index = async (req: InboxRequest, res: Response): InboxResponse => {
    log.debug(
      `Action: 'index' Params: ${JSON.stringify(req.params)} Query: ${JSON.stringify(req.query)}`,
    );

    const { type = TYPE_DEFAULT } = matchedData<{ type?: string }>(req);

    const token = getCookie(req, AUTH_COOKIE_KEY);
    if (token) {
      return res.redirect('/inbox');
    }

    if (type === 'html') {
      return res.render('pages/index');
    }

    return res.json({});
  };

  auth = async (
    req: InboxRequest<Record<string, never>, InboxAuthBody>,
    res: Response,
  ): InboxResponse => {
    log.debug(
      `Action: 'auth' Params: ${JSON.stringify(req.params)} Query: ${JSON.stringify(req.query)}`,
    );

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render('pages/index', { errors: errors.array() });
    }

    const { token, remember } = matchedData<{ token: string; remember: boolean }>(req);

    let maxAge: number | undefined = undefined;
    if (remember) {
      maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

      res.cookie(REMEMBER_COOKIE_KEY, true, {
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        maxAge,
      });
    }

    res.cookie(AUTH_COOKIE_KEY, token, {
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      maxAge,
    });

    return res.redirect('/inbox');
  };

  async logout(_req: Request, res: Response): InboxResponse {
    res.clearCookie(AUTH_COOKIE_KEY);
    res.clearCookie(REMEMBER_COOKIE_KEY);
    return res.redirect('/');
  }

  show = async (req: InboxRequest<InboxEmailParams>, res: Response): InboxResponse => {
    log.debug(
      `Action: 'show' Params: ${JSON.stringify(req.params)} Query: ${JSON.stringify(req.query)}`,
    );

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render422Response(errors.array(), req, res);
    }

    const {
      id,
      type = TYPE_DEFAULT,
      username,
    } = matchedData<{ id: string; type?: string; username: string }>(req);

    let email: EmailDetails | undefined;

    const normalizedUsername = normalizeUsername(username);
    const existsForUser = await this.emailDatabase.exists(normalizedUsername, id);
    if (existsForUser) {
      const emailObject = await this.fileSystem.getObject(this.bucketName, id);
      const emailBody = await emailObject.Body?.transformToString();

      if (!emailBody) {
        return this.render500Response(new Error('Email content not found!'), req, res);
      }

      const parsedEmail = await this.emailParser.parseEmail(emailBody);
      email = {
        ...parsedEmail,
        id,
      };

      if (type === 'html') {
        const token = getToken(req);
        return res.render('pages/email', { email, token });
      }

      return res.json({ email });
    }

    return this.render404Response(req, res);
  };

  download = async (req: InboxRequest<InboxEmailParams>, res: Response): InboxResponse => {
    log.debug(
      `Action: 'download' Params: ${JSON.stringify(req.params)} Query: ${JSON.stringify(req.query)}`,
    );

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render422Response(errors.array(), req, res);
    }

    const { id, username } = matchedData<{ id: string; username: string }>(req);

    const normalizedUsername = normalizeUsername(username);
    const existsForUser = await this.emailDatabase.exists(normalizedUsername, id);
    if (existsForUser) {
      const emailObject = await this.fileSystem.getObject(this.bucketName, id);
      const emailBody = await emailObject.Body?.transformToString();

      if (!emailBody) {
        return this.render500Response(new Error('Email content not found!'), req, res);
      }

      res.setHeader('Content-disposition', `attachment; filename=${id}.eml`);
      res.type('application/octet-stream');

      return res.send(emailBody);
    }

    return this.render404Response(req, res);
  };

  delete = async (req: InboxRequest<InboxEmailParams>, res: Response): InboxResponse => {
    log.debug(
      `Action: 'delete' Params: ${JSON.stringify(req.params)} Query: ${JSON.stringify(req.query)}`,
    );

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render422Response(errors.array(), req, res);
    }

    const { id, username } = matchedData<{ id: string; username: string }>(req);

    const normalizedUsername = normalizeUsername(username);
    const deletedFromDatabase = await this.emailDatabase.delete(normalizedUsername, id);
    if (deletedFromDatabase) {
      return res.redirect(
        `/inbox/${username}?${new URLSearchParams(req.query as Record<string, string>)}`,
      );
    }

    return this.render404Response(req, res);
  };

  latest = async (req: InboxRequest<InboxListParams>, res: Response): InboxResponse => {
    log.debug(
      `Action: 'latest' Params: ${JSON.stringify(req.params)} Query: ${JSON.stringify(req.query)}`,
    );

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render422Response(errors.array(), req, res);
    }

    const {
      sentAfter,
      type = TYPE_DEFAULT,
      username,
    } = matchedData<{
      sentAfter?: number;
      type?: string;
      username: string;
    }>(req);

    let email: EmailDetails | undefined;

    const normalizedUsername = normalizeUsername(username);
    const latestEmail = await this.emailDatabase.list(normalizedUsername, sentAfter, 1);
    if (latestEmail.Items && latestEmail.Items.length > 0) {
      const messageId = latestEmail.Items[0].Id;
      const emailObject = await this.fileSystem.getObject(this.bucketName, messageId);
      const emailBody = await emailObject.Body?.transformToString();

      if (emailBody) {
        const parsedEmail = await this.emailParser.parseEmail(emailBody);
        email = {
          ...parsedEmail,
          id: messageId,
        };
      }
    }

    if (type === 'html') {
      const token = getToken(req);
      return res.render('pages/email', { email, token });
    }

    return res.json({ email });
  };

  inbox = async (req: InboxRequest, res: Response): InboxResponse => {
    log.debug(
      `Action: 'inbox' Params: ${JSON.stringify(req.params)} Query: ${JSON.stringify(req.query)}`,
    );

    const { type = TYPE_DEFAULT } = matchedData<{ type?: string }>(req);

    if (type === 'html') {
      return res.render('pages/inbox');
    }

    return res.json({});
  };

  list = async (req: InboxRequest<InboxListParams>, res: Response): InboxResponse => {
    log.debug(
      `Action: 'list' Params: ${JSON.stringify(req.params)} Query: ${JSON.stringify(req.query)}`,
    );

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render('pages/inbox', { errors: errors.array() });
    }

    const {
      limit,
      sentAfter,
      type = TYPE_DEFAULT,
      username,
    } = matchedData<{
      limit?: number;
      sentAfter?: number;
      type?: string;
      username: string;
    }>(req);

    const normalizedUsername = normalizeUsername(username);
    const emailObjectList = await this.emailDatabase.list(normalizedUsername, sentAfter, limit);

    const emails = (emailObjectList.Items ?? []).map<EmailListItem>((emailObject) => ({
      id: emailObject.Id,
      from: emailObject.Sender,
      subject: emailObject.Subject,
      received: dayjs.unix(emailObject.ReceivedAt).toDate(),
      hasAttachments: emailObject.HasAttachments,
    }));

    if (type === 'html') {
      const token = getToken(req);
      return res.render('pages/list', { emails, token });
    }

    return res.json({ emails });
  };

  listRss = async (req: InboxRequest<InboxListParams>, res: Response): InboxResponse => {
    log.debug(
      `Action: 'listRss' Params: ${JSON.stringify(req.params)} Query: ${JSON.stringify(req.query)}`,
    );

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render422Response(errors.array(), req, res);
    }

    const { username } = matchedData<{ username: string }>(req);

    const normalizedUsername = normalizeUsername(username);
    const emailList = await this.emailDatabase.list(normalizedUsername);

    const emailNamesList = emailList.Items?.map((item) => item.Id) ?? [];
    const emailObjectList = await this.fileSystem.getObjects(this.bucketName, emailNamesList);
    const emails = await Promise.all(
      emailObjectList.map(async (emailObject, idx) => {
        const emailBody = await emailObject.Body?.transformToString();
        if (emailBody) {
          const parsedEmail = await this.emailParser.parseEmail(emailBody);
          if (parsedEmail) {
            return {
              ...parsedEmail,
              id: emailNamesList[idx],
            };
          }
        }
        return null;
      }),
    );

    const token = getToken(req) as string;

    const feed = mapEmailDetailsListToFeed(
      emails.filter((email) => email != null),
      normalizedUsername,
      token,
    );

    res.type('application/rss+xml');
    return res.send(feed.rss2());
  };

  render403Response = (req: Request, res: Response): void => {
    log.debug(
      `Action: '403' Params: ${JSON.stringify(req.params)} Query: ${JSON.stringify(req.query)}`,
    );

    const { type = TYPE_DEFAULT } = req.query;

    if (type === 'html') {
      res.status(403).render('pages/403');
      return;
    }

    res.status(403).json({ message: 'You are not allowed to visit that page.' });
  };

  render404Response = (req: Request, res: Response): void => {
    log.debug(
      `Action: '404' Params: ${JSON.stringify(req.params)} Query: ${JSON.stringify(req.query)}`,
    );

    const { type = TYPE_DEFAULT } = req.query;

    if (type === 'html') {
      res.status(404).render('pages/404');
      return;
    }

    res.status(404).json({ message: 'The page you are looking for was not found.' });
  };

  render422Response = (
    errors: ValidationError[],
    req: Request,
    res: Response,
    view = 'pages/422',
  ): void => {
    log.debug(
      `Action: '422' Params: ${JSON.stringify(req.params)} Query: ${JSON.stringify(req.query)}`,
    );

    const { type = TYPE_DEFAULT } = req.query;

    if (type === 'html') {
      res.status(422).render(view, { errors });
      return;
    }

    res.status(422).json({ errors });
  };

  render500Response = (err: Error, req: Request, res: Response): void => {
    log.debug(
      `Action: '500' Params: ${JSON.stringify(req.params)} Query: ${JSON.stringify(req.query)}`,
    );

    const { type = TYPE_DEFAULT } = req.query;

    if (type === 'html') {
      res.status(500).render('pages/error', { error: err });
      return;
    }

    res.status(500).json({ message: err.message });
  };
}
