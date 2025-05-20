import type { EmailDatabase } from '../tools/EmailDatabase';
import type { EmailParser } from '../tools/EmailParser';
import type { S3FileSystem } from '../tools/S3FileSystem';
import log from '../tools/log';
import { normalizeUsername } from '../tools/utils';

export class IncomingEmailProcessor {
  constructor(
    protected fileSystem: S3FileSystem,
    protected bucketName: string,
    protected emailParser: EmailParser,
    protected emailDatabase: EmailDatabase,
  ) {}

  async processEmail(messageId: string): Promise<void> {
    try {
      const emailObject = await this.fileSystem.getObject(this.bucketName, messageId);
      const emailBody = await emailObject.Body?.transformToString();

      const emailContent = await this.emailParser.parseEmail(emailBody ?? '');

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

      const allEmailAddresses = [...recipientEmails, ...carbonCopyEmails, ...blindCarbonCopyEmails];
      const allMatchingEmailAddresses = allEmailAddresses;
      // const allMatchingEmailAddresses = allEmailAddresses.filter((emailAddress) =>
      //   emailAddress.address.endsWith(`@${process.env.DOMAIN_NAME}`),
      // );

      const uniqueNormalizedUsernames = new Set(
        allMatchingEmailAddresses.map((emailAddress) => normalizeUsername(emailAddress.user)),
      );
      if (uniqueNormalizedUsernames.size === 0) {
        uniqueNormalizedUsernames.add('unknown');
      }

      const copyToUserInboxTasks = [...uniqueNormalizedUsernames].map((normalizedUsername) => {
        return this.emailDatabase.store(
          messageId,
          normalizedUsername,
          senderEmails[0].address,
          emailContent.subject,
          emailContent.received,
        );
      });

      await Promise.all(copyToUserInboxTasks);
    } catch (err) {
      log.error('Failed to process incoming email', err);
      throw err;
    }
  }
}
