import 'source-map-support/register';

import type { SESHandler } from 'aws-lambda';

import { IncomingEmailProcessor } from './processor/IncomingEmailProcessor';
import { EmailDatabase } from './tools/EmailDatabase';
import { EmailParser } from './tools/EmailParser';
import { S3FileSystem } from './tools/S3FileSystem';
import log from './tools/log';

const emailDatabase = new EmailDatabase();
const emailParser = new EmailParser();
const fileSystem = new S3FileSystem();

const emailProcessor = new IncomingEmailProcessor(
  fileSystem,
  process.env.EMAIL_BUCKET_NAME ?? '',
  emailParser,
  emailDatabase,
);

export const handler: SESHandler = async (event) => {
  log.debug('Processing SES event...');

  const record = event.Records[0];
  const { messageId } = record.ses.mail;

  return emailProcessor.processEmail(messageId);
};
