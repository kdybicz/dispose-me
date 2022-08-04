/* eslint-disable max-len */
import { Email, EmailParser } from '../tools/EmailParser';
import { S3FileSystem } from '../tools/S3FileSystem';

export class ApiController {
  protected fileSystem: S3FileSystem;

  protected emailParser: EmailParser;

  protected bucketName: string;

  constructor(bucketName: string) {
    this.fileSystem = new S3FileSystem();
    this.emailParser = new EmailParser();
    this.bucketName = bucketName;
  }

  async latestEmail(username: string, sentAfter?: string): Promise<Email | null> {
    const listEmailsAfter = sentAfter ? `${username}/${sentAfter}` : null;
    const emailsList = await this.fileSystem.listObjects(this.bucketName, username, listEmailsAfter, 1000);
    if (emailsList.KeyCount === 0) {
      return null;
    }

    const latestFilePath = emailsList.Contents.slice(-1).pop().Key;
    const latestEmail = await this.fileSystem.getObject(this.bucketName, latestFilePath);

    const email = await this.emailParser.parseEmail(latestEmail.Body.toString());

    return email;
  }

  async listEmails(username: string, sentAfter?: string, limit = 10): Promise<Email[]> {
    const listEmailsAfter = sentAfter ? `${username}/${sentAfter}` : null;
    const emailObjectsList = await this.fileSystem.listObjects(this.bucketName, username, listEmailsAfter, limit);

    const emailNamesList = emailObjectsList.Contents.map((item) => item.Key);
    const emails = await Promise.all(emailNamesList.map(async (name) => this.fileSystem.getObject(this.bucketName, name)));
    return Promise.all(emails.map(async (email) => this.emailParser.parseEmail(email.Body.toString())));
  }
}
