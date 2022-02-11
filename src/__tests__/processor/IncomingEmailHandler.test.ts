import * as fs from 'fs';

import { IncomingEmailProcessor } from '../../processor/IncomingEmailProcessor';
import { EmailParser } from '../../tools/EmailParser';
import { S3FileSystem } from '../../tools/S3FileSystem';

describe('EmailParser tests', () => {
  const EMAIL_BUCKET_NAME = 'test-bucket';
  const MESSAGE_ID = 'message-id';

  const emailParser = new EmailParser();

  let fileSystem: S3FileSystem;

  beforeEach(() => {
    fileSystem = {
      getObject: jest.fn(),
      copyObject: jest.fn(),
      deleteObject: jest.fn(),
    } as unknown as S3FileSystem;
  });

  test('Handle simple email', async () => {
    // given:
    const data = await fs.readFileSync(`${__dirname}/../data/simple.eml`).toString();
    // and:
    fileSystem.getObject = jest.fn().mockResolvedValueOnce({
      Body: data,
    });
    // and:
    const processor = new IncomingEmailProcessor(fileSystem, EMAIL_BUCKET_NAME, emailParser);

    // when:
    await processor.processEmail(MESSAGE_ID);
    // then:
    expect(fileSystem.copyObject).toBeCalledTimes(1);
    expect(fileSystem.copyObject).toBeCalledWith(EMAIL_BUCKET_NAME, MESSAGE_ID, 'janedoe/1483900664000');
    // and:
    expect(fileSystem.deleteObject).toBeCalledTimes(1);
  });

  test('Handle complex email', async () => {
    // given:
    const data = await fs.readFileSync(`${__dirname}/../data/complex.eml`).toString();
    // and:
    fileSystem.getObject = jest.fn().mockResolvedValueOnce({
      Body: data,
    });
    // and:
    const processor = new IncomingEmailProcessor(fileSystem, EMAIL_BUCKET_NAME, emailParser);

    // when:
    await processor.processEmail(MESSAGE_ID);
    // then:
    expect(fileSystem.copyObject).toBeCalledTimes(2);
    expect(fileSystem.copyObject).toBeCalledWith(EMAIL_BUCKET_NAME, MESSAGE_ID, 'johndoe/1476358788000');
    expect(fileSystem.copyObject).toBeCalledWith(EMAIL_BUCKET_NAME, MESSAGE_ID, 'janedoe/1476358788000');
    // and:
    expect(fileSystem.deleteObject).toBeCalledTimes(1);
  });

  test('Handle cc email', async () => {
    // given:
    const data = await fs.readFileSync(`${__dirname}/../data/cc.eml`).toString();
    // and:
    fileSystem.getObject = jest.fn().mockResolvedValueOnce({
      Body: data,
    });
    // and:
    const processor = new IncomingEmailProcessor(fileSystem, EMAIL_BUCKET_NAME, emailParser);

    // when:
    await processor.processEmail(MESSAGE_ID);
    // then:
    expect(fileSystem.copyObject).toBeCalledTimes(2);
    expect(fileSystem.copyObject).toBeCalledWith(EMAIL_BUCKET_NAME, MESSAGE_ID, 'janedoe/1644425711000');
    expect(fileSystem.copyObject).toBeCalledWith(EMAIL_BUCKET_NAME, MESSAGE_ID, 'mariadoe/1644425711000');
    // and:
    expect(fileSystem.deleteObject).toBeCalledTimes(1);
  });

  test('Handle bcc email', async () => {
    // given:
    const data = await fs.readFileSync(`${__dirname}/../data/bcc.eml`).toString();
    // and:
    fileSystem.getObject = jest.fn().mockResolvedValueOnce({
      Body: data,
    });
    // and:
    const processor = new IncomingEmailProcessor(fileSystem, EMAIL_BUCKET_NAME, emailParser);

    // when:
    await processor.processEmail(MESSAGE_ID);
    // then:
    expect(fileSystem.copyObject).toBeCalledTimes(1);
    expect(fileSystem.copyObject).toBeCalledWith(EMAIL_BUCKET_NAME, MESSAGE_ID, 'hidden/1644425711000');
    // and:
    expect(fileSystem.deleteObject).toBeCalledTimes(1);
  });
});
