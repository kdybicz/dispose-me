import * as fs from 'fs';

import { IncomingEmailProcessor } from '../../../service/processor/IncomingEmailProcessor';
import { EmailParser } from '../../../service/tools/EmailParser';
import { S3FileSystem } from '../../../service/tools/S3FileSystem';

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
      Body: {
        transformToString: jest.fn().mockResolvedValueOnce(data),
      },
    });
    // and:
    const processor = new IncomingEmailProcessor(fileSystem, EMAIL_BUCKET_NAME, emailParser);

    // when:
    await processor.processEmail(MESSAGE_ID);
    // then:
    expect(fileSystem.copyObject).toHaveBeenCalledTimes(1);
    expect(fileSystem.copyObject).toHaveBeenCalledWith(EMAIL_BUCKET_NAME, MESSAGE_ID, 'janedoe/8516099335999');
    // and:
    expect(fileSystem.deleteObject).toHaveBeenCalledTimes(1);
  });

  test('Handle complex email', async () => {
    // given:
    const data = await fs.readFileSync(`${__dirname}/../data/complex.eml`).toString();
    // and:
    fileSystem.getObject = jest.fn().mockResolvedValueOnce({
      Body: {
        transformToString: jest.fn().mockResolvedValueOnce(data),
      },
    });
    // and:
    const processor = new IncomingEmailProcessor(fileSystem, EMAIL_BUCKET_NAME, emailParser);

    // when:
    await processor.processEmail(MESSAGE_ID);
    // then:
    expect(fileSystem.copyObject).toHaveBeenCalledTimes(2);
    expect(fileSystem.copyObject).toHaveBeenCalledWith(EMAIL_BUCKET_NAME, MESSAGE_ID, 'johndoe/8523641211999');
    expect(fileSystem.copyObject).toHaveBeenCalledWith(EMAIL_BUCKET_NAME, MESSAGE_ID, 'janedoe/8523641211999');
    // and:
    expect(fileSystem.deleteObject).toHaveBeenCalledTimes(1);
  });

  test('Handle cc email', async () => {
    // given:
    const data = await fs.readFileSync(`${__dirname}/../data/cc.eml`).toString();
    // and:
    fileSystem.getObject = jest.fn().mockResolvedValueOnce({
      Body: {
        transformToString: jest.fn().mockResolvedValueOnce(data),
      },
    });
    // and:
    const processor = new IncomingEmailProcessor(fileSystem, EMAIL_BUCKET_NAME, emailParser);

    // when:
    await processor.processEmail(MESSAGE_ID);
    // then:
    expect(fileSystem.copyObject).toHaveBeenCalledTimes(2);
    expect(fileSystem.copyObject).toHaveBeenCalledWith(EMAIL_BUCKET_NAME, MESSAGE_ID, 'janedoe/8355574288999');
    expect(fileSystem.copyObject).toHaveBeenCalledWith(EMAIL_BUCKET_NAME, MESSAGE_ID, 'mariadoe/8355574288999');
    // and:
    expect(fileSystem.deleteObject).toHaveBeenCalledTimes(1);
  });

  test('Handle bcc email', async () => {
    // given:
    const data = await fs.readFileSync(`${__dirname}/../data/bcc.eml`).toString();
    // and:
    fileSystem.getObject = jest.fn().mockResolvedValueOnce({
      Body: {
        transformToString: jest.fn().mockResolvedValueOnce(data),
      },
    });
    // and:
    const processor = new IncomingEmailProcessor(fileSystem, EMAIL_BUCKET_NAME, emailParser);

    // when:
    await processor.processEmail(MESSAGE_ID);
    // then:
    expect(fileSystem.copyObject).toHaveBeenCalledTimes(1);
    expect(fileSystem.copyObject).toHaveBeenCalledWith(EMAIL_BUCKET_NAME, MESSAGE_ID, 'hidden/8355574288999');
    // and:
    expect(fileSystem.deleteObject).toHaveBeenCalledTimes(1);
  });
});
