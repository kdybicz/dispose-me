import { EmailParser } from '../tools/EmailParser';
import log from '../tools/log';
import { S3FileSystem } from '../tools/S3FileSystem';
import { normalizeUsername } from '../tools/utils';

export class IncomingEmailProcessor {
  protected fileSystem: S3FileSystem;

  protected emailParser: EmailParser;

  protected bucketName: string;

  constructor(fileSystem: S3FileSystem, bucketName: string, emailParser: EmailParser) {
    this.fileSystem = fileSystem;
    this.bucketName = bucketName;
    this.emailParser = emailParser;
  }

  async processEmail(messageId: string): Promise<void> {
    try {
      const emailData = await this.fileSystem.getObject(this.bucketName, messageId);

      const emailContent = await this.emailParser.parseEmail(emailData.Body?.toString() ?? '');

      const senderEmails = emailContent.from;
      const recipientEmails = emailContent.to;
      const carbonCopyEmails = emailContent.cc;
      const blindCarbonCopyEmails = emailContent.bcc;

      log.debug(
        'Processing emails sent from',
        senderEmails.map((e) => e.address).join(', '),
        'to:',
        recipientEmails.map((e) => e.address).join(', '),
        'cc:',
        carbonCopyEmails.map((e) => e.address).join(', '),
        'bcc:',
        blindCarbonCopyEmails.map((e) => e.address).join(', '),
        'at',
        emailContent.received.toString(),
      );

      const allEmailAddresses = [
        ...recipientEmails,
        ...carbonCopyEmails,
        ...blindCarbonCopyEmails,
      ];

      const uniqueNormalizedUsernames = new Set(allEmailAddresses.map((emailAddress) => normalizeUsername(emailAddress.user)));
      if (uniqueNormalizedUsernames.size === 0) {
        uniqueNormalizedUsernames.add('unknown');
      }

      const copyToUserInboxTasks = [...uniqueNormalizedUsernames].map((normalizedUsername) => {
        const targetFile = `${normalizedUsername}/${emailContent.received.getTime()}`;

        return this.fileSystem.copyObject(this.bucketName, messageId, targetFile);
      });

      await Promise.all(copyToUserInboxTasks);

      await this.fileSystem.deleteObject(this.bucketName, messageId);
    } catch (err) {
      log.error('Failed to process incoming email', err);
      throw err;
    }
  }
}
