/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */
import ejs from 'ejs';
import { Request, Response } from 'express';

import { Email, EmailParser } from '../tools/EmailParser';
import { S3FileSystem } from '../tools/S3FileSystem';
import { normalizeUsername } from '../tools/utils';

console.debug('EJS version:', ejs.VERSION);

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

  async show(req: Request, res: Response): Promise<Response<any> | void> {
    const {
      query,
      type = 'html',
    } = req.query;
    const {
      id = '',
    } = req.params;

    const filePath = `${query}/${id}`;

    const emailObject = await this.fileSystem.getObject(this.bucketName, filePath);

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

  async latest(req: Request, res: Response): Promise<Response<any> | void> {
    const {
      query,
      sentAfter,
      type = 'html',
    } = req.query;

    const normalizedUsername = normalizeUsername(query as string);
    const listEmailsAfter = sentAfter ? `${query}/${sentAfter}` : null;

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

  async list(req: Request, res: Response): Promise<Response<any> | void> {
    const {
      query,
      sentAfter,
      limit = 10,
      type = 'html',
    } = req.query;

    const normalizedUsername = normalizeUsername(query as string);
    const listEmailsAfter = sentAfter ? `${query}/${sentAfter}` : null;

    const emailObjectsList = await this.fileSystem.listObjects(this.bucketName, normalizedUsername, listEmailsAfter, limit as number);

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
}
