import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';

import { type Email, EmailParser } from '../tools/EmailParser';
import { S3FileSystem } from '../tools/S3FileSystem';
import { normalizeUsername } from '../tools/utils';

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

    this.index = this.index.bind(this);
    this.latest = this.latest.bind(this);
    this.list = this.list.bind(this);
    this.show = this.show.bind(this);
    this.getToken = this.getToken.bind(this);
  }

  async index(req: Request, res: Response): InboxResponse {
    const { type = 'html' } = req.query;

    const token = this.getCookie(req, 'x-api-key');
    if (token) {
      return res.redirect('/inbox');
    }

    if (type === 'html') {
      return res.render('pages/index');
    }

    return res.json({});
  }

  async auth(req: Request, res: Response): InboxResponse {
    const { token, remember } = req.body;

    let maxAge: number | undefined = undefined;
    if (remember) {
      maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

      res.cookie('remember', true, { secure: true, httpOnly: true, sameSite: 'strict', maxAge });
    }

    res.cookie('x-api-key', token, { secure: true, httpOnly: true, sameSite: 'strict', maxAge });
    return res.redirect('/inbox');
  }

  async logout(_req: Request, res: Response): InboxResponse {
    res.clearCookie('x-api-key');
    res.clearCookie('remember');
    return res.redirect('/');
  }

  async show(req: Request, res: Response): InboxResponse {
    const { type = 'html' } = req.query;
    const { id = '', username } = req.params;

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
      const token = this.getToken(req);
      return res.render('pages/email', { email, token });
    }

    return res.json({ email });
  }

  async latest(req: Request, res: Response): InboxResponse {
    const { sentAfter, type = 'html' } = req.query;
    const { username } = req.params;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render403Response(req, res);
    }

    const normalizedUsername = normalizeUsername(username);
    const listEmailsAfter = sentAfter ? `${normalizedUsername}/${sentAfter}` : undefined;

    const emailsList = await this.fileSystem.listObjects(
      this.bucketName,
      normalizedUsername,
      listEmailsAfter,
      1000,
    );

    let email: Email | undefined;
    if (emailsList.KeyCount !== 0) {
      const latestFilePath = emailsList.Contents?.slice(-1).pop()?.Key;

      if (latestFilePath) {
        const latestEmail = await this.fileSystem.getObject(this.bucketName, latestFilePath);

        if (latestEmail.Body) {
          email = await this.emailParser.parseEmail(latestEmail.Body.toString());
          email.id = latestFilePath.split('/')[-1];
        }
      }
    }

    if (type === 'html') {
      const token = this.getToken(req);
      return res.render('pages/email', { email, token });
    }

    return res.json({ email });
  }

  async inbox(req: Request, res: Response): InboxResponse {
    const { type = 'html' } = req.query;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render403Response(req, res);
    }

    if (type === 'html') {
      return res.render('pages/inbox');
    }

    return res.json({ message: 'Go to /inbox/:username' });
  }

  async list(req: Request, res: Response): InboxResponse {
    const { sentAfter, limit = 10, type = 'html' } = req.query;
    const { username } = req.params;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render403Response(req, res);
    }

    const normalizedUsername = normalizeUsername(username);
    const listEmailsAfter = sentAfter ? `${normalizedUsername}/${sentAfter}` : undefined;

    const emailObjectsList = await this.fileSystem.listObjects(
      this.bucketName,
      normalizedUsername,
      listEmailsAfter,
      limit as number,
    );

    const emailNamesList = emailObjectsList.Contents?.map((item) => item.Key) ?? [];
    const emails = await Promise.all(
      emailNamesList.map(async (name) => {
        if (name) {
          const emailObject = await this.fileSystem.getObject(this.bucketName, name);

          if (emailObject.Body) {
            const email: Email = await this.emailParser.parseEmail(emailObject.Body.toString());
            email.id = name.split('/').pop();
            return email;
          }
        }

        return null;
      }),
    );

    if (type === 'html') {
      const token = this.getToken(req);
      return res.render('pages/list', { emails: emails.reverse(), token });
    }

    return res.json({ emails: emails.reverse() });
  }

  render403Response(req: Request, res: Response): void {
    const { type = 'html' } = req.query;

    if (type === 'html') {
      res.status(403).render('pages/403');
      return;
    }

    res.status(403).json({ message: 'You are not allowed to visit that page.' });
  }

  render404Response(req: Request, res: Response): void {
    const { type = 'html' } = req.query;

    if (type === 'html') {
      res.status(404).render('pages/404');
      return;
    }

    res.status(404).json({ message: 'The page you are looking for was not found.' });
  }

  render500Response(err: Error, req: Request, res: Response): void {
    const { type = 'html' } = req.query;

    if (type === 'html') {
      res.status(500).render('pages/error', { error: err });
      return;
    }

    res.status(500).json({ message: err.stack });
  }

  getToken(req: Request): string | null {
    const header = req.headersDistinct?.['x-api-key'];
    if (header) {
      return header[0];
    }

    const query = req.query?.['x-api-key'];
    if (query) {
      return (Array.isArray(query) ? query[0] : query) as string;
    }

    return this.getCookie(req, 'x-api-key');
  }

  getCookie(req: Request, name: string): string | null {
    if (req.headers?.cookie) {
      return (
        `${req.headers.cookie}`
          .split(';')
          .find((cookie: string) => {
            return cookie.trim().toLowerCase().startsWith(`${name.toLowerCase()}=`);
          })
          ?.split('=')?.[1]
          ?.trim() ?? null
      );
    }

    return null;
  }
}
