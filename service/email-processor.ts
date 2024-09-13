import 'source-map-support/register';

import { SESHandler } from 'aws-lambda';

import { S3FileSystem } from './tools/S3FileSystem';
import log from './tools/log';
import { EmailParser } from './tools/EmailParser';
import { IncomingEmailProcessor } from './processor/IncomingEmailProcessor';

const fileSystem = new S3FileSystem();
const emailParser = new EmailParser();

const emailProcessor = new IncomingEmailProcessor(fileSystem, process.env.EMAIL_BUCKET_NAME ?? '', emailParser);

export const handler: SESHandler = async (event) => {
  log.debug('Processing SES event...');

  const record = event.Records[0];
  const { messageId } = record.ses.mail;

  return emailProcessor.processEmail(messageId);
};
