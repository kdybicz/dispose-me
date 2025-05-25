import * as fs from 'node:fs';

import { IncomingEmailProcessor } from '../../../service/processor/IncomingEmailProcessor';
import { EmailParser } from '../../../service/tools/EmailParser';
import type { S3FileSystem } from '../../../service/tools/S3FileSystem';
import type { EmailDatabase } from '../../../service/tools/EmailDatabase';
import { MESSAGE_ID } from '../../utils';

describe('IncomingEmailProcessor tests', () => {
  const EMAIL_BUCKET_NAME = 'test-bucket';
  const DOMAIN_NAME = 'example.com';

  const emailParser = new EmailParser();

  let emailDatabase: EmailDatabase;
  let fileSystem: S3FileSystem;

  beforeEach(() => {
    emailDatabase = {
      store: jest.fn(),
    } as unknown as EmailDatabase;
    fileSystem = {
      getObject: jest.fn(),
    } as unknown as S3FileSystem;
  });

  test('Handle simple email', async () => {
    // given
    const data = await fs.readFileSync(`${__dirname}/../data/simple.eml`).toString();
    // and:
    fileSystem.getObject = jest.fn().mockResolvedValueOnce({
      Body: {
        transformToString: jest.fn().mockResolvedValueOnce(data),
      },
    });
    // and:
    const processor = new IncomingEmailProcessor(
      fileSystem,
      EMAIL_BUCKET_NAME,
      emailParser,
      emailDatabase,
      DOMAIN_NAME,
    );

    // when
    await processor.processEmail(MESSAGE_ID);
    // then
    expect(emailDatabase.store).toHaveBeenCalledTimes(1);
    expect(emailDatabase.store).toHaveBeenCalledWith(
      MESSAGE_ID,
      'janedoe',
      'john.doe@example.com',
      'test',
      new Date('2017-01-08T18:37:44.000Z'),
    );
  });

  test('Handle complex email', async () => {
    // given
    const data = await fs.readFileSync(`${__dirname}/../data/complex.eml`).toString();
    // and:
    fileSystem.getObject = jest.fn().mockResolvedValueOnce({
      Body: {
        transformToString: jest.fn().mockResolvedValueOnce(data),
      },
    });
    // and:
    const processor = new IncomingEmailProcessor(
      fileSystem,
      EMAIL_BUCKET_NAME,
      emailParser,
      emailDatabase,
      DOMAIN_NAME,
    );

    // when
    await processor.processEmail(MESSAGE_ID);
    // then
    expect(emailDatabase.store).toHaveBeenCalledTimes(2);
    expect(emailDatabase.store).toHaveBeenCalledWith(
      MESSAGE_ID,
      'johndoe',
      'john.doe@example.com',
      'Nodemailer is unicode friendly ✔ (1476358788189)',
      new Date('2016-10-13T11:39:48.000Z'),
    );
    expect(emailDatabase.store).toHaveBeenCalledWith(
      MESSAGE_ID,
      'janedoe',
      'john.doe@example.com',
      'Nodemailer is unicode friendly ✔ (1476358788189)',
      new Date('2016-10-13T11:39:48.000Z'),
    );
  });

  test('Handle cc email', async () => {
    // given
    const data = await fs.readFileSync(`${__dirname}/../data/cc.eml`).toString();
    // and:
    fileSystem.getObject = jest.fn().mockResolvedValueOnce({
      Body: {
        transformToString: jest.fn().mockResolvedValueOnce(data),
      },
    });
    // and:
    const processor = new IncomingEmailProcessor(
      fileSystem,
      EMAIL_BUCKET_NAME,
      emailParser,
      emailDatabase,
      DOMAIN_NAME,
    );

    // when
    await processor.processEmail(MESSAGE_ID);
    // then
    expect(emailDatabase.store).toHaveBeenCalledTimes(2);
    expect(emailDatabase.store).toHaveBeenCalledWith(
      MESSAGE_ID,
      'janedoe',
      'john.doe@example.com',
      'hidden',
      new Date('2022-02-09T16:55:11.000Z'),
    );
    expect(emailDatabase.store).toHaveBeenCalledWith(
      MESSAGE_ID,
      'mariadoe',
      'john.doe@example.com',
      'hidden',
      new Date('2022-02-09T16:55:11.000Z'),
    );
  });

  test('Handle bcc email', async () => {
    // given
    const data = await fs.readFileSync(`${__dirname}/../data/bcc.eml`).toString();
    // and:
    fileSystem.getObject = jest.fn().mockResolvedValueOnce({
      Body: {
        transformToString: jest.fn().mockResolvedValueOnce(data),
      },
    });
    // and:
    const processor = new IncomingEmailProcessor(
      fileSystem,
      EMAIL_BUCKET_NAME,
      emailParser,
      emailDatabase,
      DOMAIN_NAME,
    );

    // when
    await processor.processEmail(MESSAGE_ID);
    // then
    expect(emailDatabase.store).toHaveBeenCalledTimes(1);
    expect(emailDatabase.store).toHaveBeenCalledWith(
      MESSAGE_ID,
      'hidden',
      'john.doe@example.com',
      'hidden',
      new Date('2022-02-09T16:55:11.000Z'),
    );
  });
});
