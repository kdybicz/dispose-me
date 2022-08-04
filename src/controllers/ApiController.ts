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

  async latestEmail(username: string): Promise<Email | null> {
    const emailsList = await this.fileSystem.listObjects(this.bucketName, username, null, 1000);
    if (emailsList.KeyCount === 0) {
      return null;
    }

    const latestFilePath = emailsList.Contents.slice(-1).pop().Key;
    const latestEmail = await this.fileSystem.getObject(this.bucketName, latestFilePath);

    const email = await this.emailParser.parseEmail(latestEmail.Body.toString());

    return email;
  }

  async listEmails(username: string, startAfter?: string, limit = 50): Promise<string[]> {
    const emails = await this.fileSystem.listObjects(this.bucketName, username, startAfter, limit);

    return emails.Contents.map((item) => item.Key);
  }
}
