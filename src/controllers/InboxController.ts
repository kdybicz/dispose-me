/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */
import ejs from 'ejs';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';

import { EmailParser } from '../tools/EmailParser';
import { S3FileSystem } from '../tools/S3FileSystem';
import { normalizeUsername } from '../tools/utils';

console.log(ejs.VERSION);

export class InboxController {
  protected fileSystem: S3FileSystem;

  protected emailParser: EmailParser;

  protected bucketName: string;

  constructor(bucketName: string) {
    this.fileSystem = new S3FileSystem();
    this.emailParser = new EmailParser();
    this.bucketName = bucketName;

    this.latest = this.latest.bind(this);
    this.list = this.list.bind(this);
  }

  async latest(req: Request, res: Response): Promise<Response<any> | void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0] });
    }

    const {
      username,
      sentAfter,
      type = 'html',
    } = req.query;

    const normalizedUsername = normalizeUsername(username as string);
    const listEmailsAfter = sentAfter ? `${username}/${sentAfter}` : null;

    const emailsList = await this.fileSystem.listObjects(this.bucketName, normalizedUsername, listEmailsAfter, 1000);

    let email;
    if (emailsList.KeyCount !== 0) {
      const latestFilePath = emailsList.Contents.slice(-1).pop().Key;
      const latestEmail = await this.fileSystem.getObject(this.bucketName, latestFilePath);

      email = await this.emailParser.parseEmail(latestEmail.Body.toString());
    }

    if (type === 'html') {
      return res.render('pages/email', { email });
    }

    return res.json({ email });
  }

  async list(req: Request, res: Response): Promise<Response<any> | void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0] });
    }

    const {
      username,
      sentAfter,
      limit = 10,
      type = 'html',
    } = req.query;

    const normalizedUsername = normalizeUsername(username as string);
    const listEmailsAfter = sentAfter ? `${username}/${sentAfter}` : null;

    const emailObjectsList = await this.fileSystem.listObjects(this.bucketName, normalizedUsername, listEmailsAfter, limit as number);

    const emailNamesList = emailObjectsList.Contents.map((item) => item.Key);
    const emailObjects = await Promise.all(emailNamesList.map(async (name) => this.fileSystem.getObject(this.bucketName, name)));

    const emails = await Promise.all(emailObjects.map(async (email) => this.emailParser.parseEmail(email.Body.toString())));

    if (type === 'html') {
      return res.render('pages/inbox', { emails });
    }

    return res.json({ emails });
  }
}
