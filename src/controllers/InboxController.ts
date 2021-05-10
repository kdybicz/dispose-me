/* eslint-disable class-methods-use-this */
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';

import { Email, EmailParser } from '../tools/EmailParser';
import { S3FileSystem } from '../tools/S3FileSystem';
import { normalizeUsername } from '../tools/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InboxResponse = Promise<Response<any> | void>;

export class InboxController {
  protected fileSystem: S3FileSystem;

  protected emailParser: EmailParser;

  protected bucketName: string;

  constructor(bucketName: string) {
    this.fileSystem = new S3FileSystem();
    this.emailParser = new EmailParser();
    this.bucketName = bucketName;

    this.show = this.show.bind(this);
    this.latest = this.latest.bind(this);
    this.list = this.list.bind(this);
  }

  async index(req: Request, res: Response): InboxResponse {
    const {
      type = 'html',
    } = req.query;

    if (type === 'html') {
      return res.render('pages/index');
    }

    return res.json({});
  }

  async show(req: Request, res: Response): InboxResponse {
    const {
      query,
      type = 'html',
    } = req.query;
    const {
      id = '',
    } = req.params;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render403Response(req, res);
    }

    const normalizedUsername = normalizeUsername(query as string);
    const emailObjectPath = `${normalizedUsername}/${id}`;

    const emailObject = await this.fileSystem.getObject(this.bucketName, emailObjectPath);

    let email: Email;
    if (emailObject) {
      email = await this.emailParser.parseEmail(emailObject.Body.toString());
      email.id = id;
    }

    if (type === 'html') {
      return res.render('pages/email', { email });
    }

    return res.json({ email });
  }

  async latest(req: Request, res: Response): InboxResponse {
    const {
      query,
      sentAfter,
      type = 'html',
    } = req.query;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render403Response(req, res);
    }

    const normalizedUsername = normalizeUsername(query as string);
    const listEmailsAfter = sentAfter ? `${normalizedUsername}/${sentAfter}` : null;

    const emailsList = await this.fileSystem.listObjects(this.bucketName, normalizedUsername, listEmailsAfter, 1000);

    let email: Email;
    if (emailsList.KeyCount !== 0) {
      const latestFilePath = emailsList.Contents.slice(-1).pop().Key;
      const latestEmail = await this.fileSystem.getObject(this.bucketName, latestFilePath);

      email = await this.emailParser.parseEmail(latestEmail.Body.toString());
      email.id = latestFilePath.split('/')[-1];
    }

    if (type === 'html') {
      return res.render('pages/email', { email });
    }

    return res.json({ email });
  }

  async list(req: Request, res: Response): InboxResponse {
    const {
      query,
      sentAfter,
      limit = 10,
      type = 'html',
    } = req.query;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return this.render403Response(req, res);
    }

    const normalizedUsername = normalizeUsername(query as string);
    const listEmailsAfter = sentAfter ? `${normalizedUsername}/${sentAfter}` : null;

    const emailObjectsList = await this.fileSystem.listObjects(
      this.bucketName,
      normalizedUsername,
      listEmailsAfter,
      limit as number,
    );

    const emailNamesList = emailObjectsList.Contents.map((item) => item.Key);
    const emails = await Promise.all(emailNamesList.map(async (name) => {
      const emailObject = await this.fileSystem.getObject(this.bucketName, name);
      const email: Email = await this.emailParser.parseEmail(emailObject.Body.toString());
      email.id = name.split('/').pop();
      return email;
    }));

    if (type === 'html') {
      return res.render('pages/inbox', { emails: emails.reverse() });
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
}
