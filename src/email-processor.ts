import { SESHandler } from 'aws-lambda';

import 'source-map-support/register';

import { S3FileSystem } from './tools/S3FileSystem';
import log from './tools/log';
import { EmailParser } from './tools/EmailParser';
import { normalizeUsername } from './tools/utils';

const fileSystem = new S3FileSystem();
const parser = new EmailParser();

const { EMAIL_BUCKET_NAME } = process.env;

export const handler: SESHandler = async (event) => {
  log.debug('Processing SES event...');

  const record = event.Records[0];
  const { messageId } = record.ses.mail;

  try {
    const emailData = await fileSystem.getObject(EMAIL_BUCKET_NAME, messageId);

    const email = await parser.parseEmail(emailData.Body.toString());

    const senderEmails = email.from;
    const recipientEmails = email.to;

    log.debug('Processing emails sent from', senderEmails.map((e) => e.address).join(', '),
      'to', recipientEmails.map((e) => e.address).join(', '),
      'at', email.received.toString());

    const normalizedRecipientName = normalizeUsername(recipientEmails[0].user);
    const targetFile = `${normalizedRecipientName}/${email.received.getTime()}`;

    await fileSystem.moveObject(EMAIL_BUCKET_NAME, messageId, targetFile);

    return { status: 'success' };
  } catch (err) {
    log.error('Failed to process email', err);
    return err;
  }
};
