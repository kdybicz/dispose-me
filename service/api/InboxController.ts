import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';

import { type Email, EmailParser } from '../tools/EmailParser';
import { S3FileSystem } from '../tools/S3FileSystem';
import { AUTH_COOKIE_KEY, MAX_EPOCH, REMEMBER_COOKIE_KEY } from '../tools/const';
import { mapEmailListToFeed } from '../tools/feed';
import { getCookie, getToken, normalizeUsername, parseIntOrDefault } from '../tools/utils';

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
}

export interface InboxAuthBody {
  token: string;
  remember: boolean;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
interface InboxRequest<P = Record<string, string>, B = any>
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  extends Request<P, any, B, InboxQuery> {}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
export type InboxResponse = Promise<Response<any> | void>;

export class InboxController {
  protected fileSystem: S3FileSystem;

  protected emailParser: EmailParser;

  protected bucketName: string;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
    this.emailParser = new EmailParser();
    this.fileSystem = new S3FileSystem();
  }

  index = async (req: InboxRequest, res: Response): InboxResponse => {
    const { type = 'html' } = req.query;

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
    const { token, remember } = req.body;

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
    const { type = 'html' } = req.query;
    const { id, username } = req.params;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render403Response(req, res);
    }

    const normalizedUsername = normalizeUsername(username);
    const emailObjectPath = `${normalizedUsername}/${id}`;

    const emailObject = await this.fileSystem.getObject(this.bucketName, emailObjectPath);

    let email: Email | undefined;
    if (emailObject.Body) {
      email = await this.emailParser.parseEmail(emailObject.Body.toString());
      email.id = id;
    }

    if (type === 'html') {
      const token = getToken(req);
      return res.render('pages/email', { email, token });
    }

    return res.json({ email });
  };

  download = async (req: InboxRequest<InboxEmailParams>, res: Response): InboxResponse => {
    const { id, username } = req.params;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render403Response(req, res);
    }

    const normalizedUsername = normalizeUsername(username);
    const emailObjectPath = `${normalizedUsername}/${id}`;

    const emailObject = await this.fileSystem.getObject(this.bucketName, emailObjectPath);

    res.setHeader('Content-disposition', `attachment; filename=${id}.eml`);
    res.type('application/octet-stream');

    return res.send(emailObject.Body?.toString());
  };

  latest = async (req: InboxRequest<InboxListParams>, res: Response): InboxResponse => {
    const { sentAfter, type = 'html' } = req.query;
    const { username } = req.params;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render403Response(req, res);
    }

    const normalizedUsername = normalizeUsername(username);
    const emailObjectsList = await this.fileSystem.listObjects(
      this.bucketName,
      normalizedUsername,
      1,
    );

    const emailNamesList = (emailObjectsList.Contents?.map((item) => item.Key) ?? [])
      .filter((item) => item != null)
      .filter((name) => {
        const parsedSentAfter = parseIntOrDefault(sentAfter);
        return name != null && parsedSentAfter != null
          ? name.localeCompare(`${normalizedUsername}/${MAX_EPOCH - parsedSentAfter}`) < 0
          : true;
      });

    let email: Email | undefined;
    if (emailNamesList.length !== 0) {
      const latestFilePath = emailNamesList.pop();

      if (latestFilePath) {
        const latestEmail = await this.fileSystem.getObject(this.bucketName, latestFilePath);

        if (latestEmail.Body) {
          email = await this.emailParser.parseEmail(latestEmail.Body.toString());
          email.id = latestFilePath.split('/').pop();
        }
      }
    }

    if (type === 'html') {
      const token = getToken(req);
      return res.render('pages/email', { email, token });
    }

    return res.json({ email });
  };

  inbox = async (req: InboxRequest, res: Response): InboxResponse => {
    const { type = 'html' } = req.query;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render403Response(req, res);
    }

    if (type === 'html') {
      return res.render('pages/inbox');
    }

    return res.json({ message: 'Go to /inbox/:username' });
  };

  list = async (req: InboxRequest<InboxListParams>, res: Response): InboxResponse => {
    const { sentAfter, limit, type = 'html' } = req.query;
    const { username } = req.params;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render403Response(req, res);
    }

    const normalizedUsername = normalizeUsername(username);
    const emailObjectsList = await this.fileSystem.listObjects(
      this.bucketName,
      normalizedUsername,
      parseIntOrDefault(limit, 10),
    );

    const emailNamesList = (emailObjectsList.Contents?.map((item) => item.Key) ?? [])
      .filter((item) => item != null)
      .filter((name) => {
        const parsedSentAfter = parseIntOrDefault(sentAfter);
        return name != null && parsedSentAfter != null
          ? name.localeCompare(`${normalizedUsername}/${MAX_EPOCH - parsedSentAfter}`) < 0
          : true;
      });
    const emailObjectList = await this.fileSystem.getObjects(this.bucketName, emailNamesList);
    const emails = await Promise.all(
      emailObjectList.map(async (emailObject, idx) => {
        if (emailObject.Body) {
          const email: Email = await this.emailParser.parseEmail(emailObject.Body.toString());
          email.id = emailNamesList[idx].split('/').pop();
          return email;
        }
        return null;
      }),
    );

    if (type === 'html') {
      const token = getToken(req);
      return res.render('pages/list', { emails: emails.filter((email) => email != null), token });
    }

    return res.json({ emails: emails.filter((email) => email != null) });
  };

  listRss = async (req: InboxRequest<InboxListParams>, res: Response): InboxResponse => {
    const { username } = req.params;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render403Response(req, res);
    }

    const normalizedUsername = normalizeUsername(username);
    const emailObjectsList = await this.fileSystem.listObjects(
      this.bucketName,
      normalizedUsername,
      10,
    );

    const emailNamesList = (emailObjectsList.Contents?.map((item) => item.Key) ?? []).filter(
      (item) => item != null,
    );
    const emailObjectList = await this.fileSystem.getObjects(this.bucketName, emailNamesList);
    const emails = await Promise.all(
      emailObjectList.map(async (emailObject, idx) => {
        if (emailObject.Body) {
          const email: Email = await this.emailParser.parseEmail(emailObject.Body.toString());
          email.id = emailNamesList[idx].split('/').pop();
          return email;
        }
        return null;
      }),
    );

    const token = getToken(req) as string;

    const feed = mapEmailListToFeed(
      emails.filter((email) => email != null),
      normalizedUsername,
      token,
    );

    res.type('application/rss+xml');
    return res.send(feed);
  };

  render403Response = (req: Request, res: Response): void => {
    const { type = 'html' } = req.query;

    if (type === 'html') {
      res.status(403).render('pages/403');
      return;
    }

    res.status(403).json({ message: 'You are not allowed to visit that page.' });
  };

  render404Response = (req: Request, res: Response): void => {
    const { type = 'html' } = req.query;

    if (type === 'html') {
      res.status(404).render('pages/404');
      return;
    }

    res.status(404).json({ message: 'The page you are looking for was not found.' });
  };

  render500Response = (err: Error, req: Request, res: Response): void => {
    const { type = 'html' } = req.query;

    if (type === 'html') {
      res.status(500).render('pages/error', { error: err });
      return;
    }

    res.status(500).json({ message: err.stack });
  };
}
