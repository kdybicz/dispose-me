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
    protected domainName: string,
  ) {}

  async processEmail(messageId: string): Promise<void> {
    try {
      const emailObject = await this.fileSystem.getObject(this.bucketName, messageId);
      const emailBody = await emailObject.Body?.transformToString();

      const emailContent = await this.emailParser.parseEmail(emailBody ?? '');

      const senderEmail = emailContent.from;
      const recipientEmails = emailContent.to;
      const carbonCopyEmails = emailContent.cc;
      const blindCarbonCopyEmails = emailContent.bcc;

      log.debug(
        'Processing emails sent from',
        senderEmail?.address,
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
      const allMatchingEmailAddresses = allEmailAddresses.filter(
        (emailAddress) =>
          // excluding addresses from other domains
          emailAddress.host === this.domainName,
      );

      const uniqueNormalizedUsernames = new Set(
        allMatchingEmailAddresses
          .map((emailAddress) => (emailAddress.user ? normalizeUsername(emailAddress.user) : null))
          .filter((emailAddress) => emailAddress != null),
      );
      if (uniqueNormalizedUsernames.size === 0) {
        uniqueNormalizedUsernames.add('unknown');
      }

      const copyToUserInboxTasks = [...uniqueNormalizedUsernames].map((normalizedUsername) => {
        return this.emailDatabase.store(
          messageId,
          normalizedUsername,
          senderEmail?.address ?? '',
          emailContent.subject,
          emailContent.received,
        );
      });

      await Promise.all(copyToUserInboxTasks);
    } catch (err) {
      log.error(`Failed to process incoming email with id ${messageId}`, err);
      throw err;
    }
  }
}
