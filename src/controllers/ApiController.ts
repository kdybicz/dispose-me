/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';

import { EmailParser } from '../tools/EmailParser';
import { S3FileSystem } from '../tools/S3FileSystem';
import { normalizeUsername } from '../tools/utils';

export class ApiController {
  protected fileSystem: S3FileSystem;

  protected emailParser: EmailParser;

  protected bucketName: string;

  constructor(bucketName: string) {
    this.fileSystem = new S3FileSystem();
    this.emailParser = new EmailParser();
    this.bucketName = bucketName;

    this.latestEmail = this.latestEmail.bind(this);
    this.listEmails = this.listEmails.bind(this);
  }

  async latestEmail(req: Request, res: Response): Promise<Response<any>> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0] });
    }

    const { username, sentAfter } = req.query;

    const normalizedUsername = normalizeUsername(username as string);
    const listEmailsAfter = sentAfter ? `${username}/${sentAfter}` : null;

    const emailsList = await this.fileSystem.listObjects(this.bucketName, normalizedUsername, listEmailsAfter, 1000);
    if (emailsList.KeyCount === 0) {
      return res.status(204).send();
    }

    const latestFilePath = emailsList.Contents.slice(-1).pop().Key;
    const latestEmail = await this.fileSystem.getObject(this.bucketName, latestFilePath);

    const email = await this.emailParser.parseEmail(latestEmail.Body.toString());

    return res.json({ email });
  }

  async listEmails(req: Request, res: Response): Promise<Response<any>> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0] });
    }

    const { username, sentAfter, limit = 10 } = req.query;

    const normalizedUsername = normalizeUsername(username as string);
    const listEmailsAfter = sentAfter ? `${username}/${sentAfter}` : null;

    const emailObjectsList = await this.fileSystem.listObjects(this.bucketName, normalizedUsername, listEmailsAfter, limit as number);
    if (emailObjectsList.KeyCount === 0) {
      return res.status(204).send();
    }

    const emailNamesList = emailObjectsList.Contents.map((item) => item.Key);
    const emailObjects = await Promise.all(emailNamesList.map(async (name) => this.fileSystem.getObject(this.bucketName, name)));

    const emails = await Promise.all(emailObjects.map(async (email) => this.emailParser.parseEmail(email.Body.toString())));

    return res.json({ emails });
  }
}
